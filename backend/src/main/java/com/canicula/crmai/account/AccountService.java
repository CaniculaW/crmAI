package com.canicula.crmai.account;

import com.canicula.crmai.identity.DataPermissionColumns;
import com.canicula.crmai.identity.DataPermissionCondition;
import com.canicula.crmai.identity.DataPermissionService;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private static final DataPermissionColumns ACCOUNT_PERMISSION_COLUMNS = new DataPermissionColumns(
            "a.owner_user_id",
            "a.owner_department_id",
            "exists (select 1 from crm_account_collaborators ac where ac.account_id = a.id and ac.user_id = ?)");

    private final JdbcTemplate jdbcTemplate;
    private final DataPermissionService dataPermissionService;

    AccountService(JdbcTemplate jdbcTemplate, DataPermissionService dataPermissionService) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataPermissionService = dataPermissionService;
    }

    @Transactional
    public AccountResponse create(AccountCreateRequest request, Long actorUserId) {
        Long accountId = insertAccount(request, actorUserId);
        for (AccountCollaboratorRequest collaborator : collaborators(request)) {
            jdbcTemplate.update(
                    """
                    insert into crm_account_collaborators (account_id, user_id, collaborator_role)
                    values (?, ?, ?)
                    """,
                    accountId,
                    collaborator.user_id(),
                    collaborator.collaborator_role());
        }
        return findById(accountId);
    }

    public AccountResponse readableDetail(Long accountId, Long userId) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "account",
                ACCOUNT_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>();
        parameters.add(accountId);
        parameters.addAll(condition.parameters());
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select a.*
                    from crm_accounts a
                    where a.id = ?
                      and a.deleted_at is null
                      and %s
                    """.formatted(condition.clause()),
                    (rs, rowNum) -> toResponse(rs.getLong("id")),
                    parameters.toArray());
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("客户不存在或无权访问");
        }
    }

    public List<AccountResponse> readableList(Long userId, AccountListFilter filter) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "account",
                ACCOUNT_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>(condition.parameters());
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "a.account_type", filter.account_type());
        appendEqualsFilter(filters, parameters, "a.account_level", filter.account_level());
        appendEqualsFilter(filters, parameters, "a.account_status", filter.account_status());
        appendEqualsFilter(filters, parameters, "a.account_source", filter.account_source());
        appendEqualsFilter(filters, parameters, "a.industry", filter.industry());
        appendEqualsFilter(filters, parameters, "a.region_province", filter.region_province());
        appendEqualsFilter(filters, parameters, "a.region_city", filter.region_city());
        appendEqualsFilter(filters, parameters, "a.owner_department_id", filter.owner_department_id());
        appendEqualsFilter(filters, parameters, "a.owner_user_id", filter.owner_user_id());
        List<Long> accountIds = jdbcTemplate.query(
                """
                select a.id
                from crm_accounts a
                where a.deleted_at is null
                  and %s
                  %s
                order by a.updated_at desc, a.id desc
                """.formatted(condition.clause(), filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        return accountIds.stream()
                .map(this::findById)
                .toList();
    }

    @Transactional
    public AccountResponse update(Long accountId, AccountUpdateRequest request, Long actorUserId) {
        readableDetail(accountId, actorUserId);
        jdbcTemplate.update(
                """
                update crm_accounts
                set account_level = coalesce(?, account_level),
                    account_status = coalesce(?, account_status),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.account_level(),
                request.account_status(),
                request.remark(),
                actorUserId,
                accountId);
        return findById(accountId);
    }

    private AccountResponse findById(Long accountId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from crm_accounts
                where id = ?
                  and deleted_at is null
                """,
                (rs, rowNum) -> new AccountResponse(
                        rs.getLong("id"),
                        nullableLong(rs.getObject("parent_id")),
                        rs.getString("account_name"),
                        rs.getString("account_short_name"),
                        rs.getString("account_type"),
                        rs.getString("account_level"),
                        rs.getString("account_status"),
                        rs.getString("account_source"),
                        rs.getString("industry"),
                        rs.getString("region_province"),
                        rs.getString("region_city"),
                        rs.getString("address"),
                        rs.getString("relationship_status"),
                        rs.getLong("owner_department_id"),
                        rs.getLong("owner_user_id"),
                        rs.getString("background"),
                        rs.getString("key_needs"),
                        rs.getString("remark"),
                        collaborators(accountId)),
                accountId);
    }

    private AccountResponse toResponse(Long accountId) {
        return findById(accountId);
    }

    private Long insertAccount(AccountCreateRequest request, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_accounts (
                        parent_id, account_name, account_short_name, account_type, account_level,
                        account_status, account_source, industry, region_province, region_city,
                        address, relationship_status, owner_department_id, owner_user_id,
                        background, key_needs, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, request.parent_id());
            statement.setString(2, request.account_name());
            statement.setString(3, request.account_short_name());
            statement.setString(4, request.account_type());
            statement.setString(5, request.account_level());
            statement.setString(6, request.account_status());
            statement.setString(7, request.account_source());
            statement.setString(8, request.industry());
            statement.setString(9, request.region_province());
            statement.setString(10, request.region_city());
            statement.setString(11, request.address());
            statement.setString(12, request.relationship_status());
            statement.setObject(13, request.owner_department_id());
            statement.setObject(14, request.owner_user_id());
            statement.setString(15, request.background());
            statement.setString(16, request.key_needs());
            statement.setString(17, request.remark());
            statement.setObject(18, actorUserId);
            statement.setObject(19, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private List<AccountCollaboratorResponse> collaborators(Long accountId) {
        return jdbcTemplate.query(
                """
                select user_id, collaborator_role
                from crm_account_collaborators
                where account_id = ?
                order by user_id
                """,
                (rs, rowNum) -> new AccountCollaboratorResponse(
                        rs.getLong("user_id"),
                        rs.getString("collaborator_role")),
                accountId);
    }

    private static List<AccountCollaboratorRequest> collaborators(AccountCreateRequest request) {
        return request.collaborators() == null ? List.of() : request.collaborators();
    }

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static void appendKeywordFilter(StringBuilder sql, List<Object> parameters, String keyword) {
        if (!hasText(keyword)) {
            return;
        }
        sql.append(
                """
                  and (
                      lower(a.account_name) like ?
                      or lower(a.account_short_name) like ?
                  )
                """);
        String keywordPattern = "%" + keyword.trim().toLowerCase() + "%";
        parameters.add(keywordPattern);
        parameters.add(keywordPattern);
    }

    private static void appendEqualsFilter(
            StringBuilder sql,
            List<Object> parameters,
            String column,
            Object value) {
        if (value instanceof String textValue && !hasText(textValue)) {
            return;
        }
        if (value == null) {
            return;
        }
        sql.append("  and ").append(column).append(" = ?\n");
        parameters.add(value instanceof String textValue ? textValue.trim() : value);
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
