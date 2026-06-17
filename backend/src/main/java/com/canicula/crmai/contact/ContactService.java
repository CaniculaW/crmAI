package com.canicula.crmai.contact;

import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.identity.DataPermissionColumns;
import com.canicula.crmai.identity.DataPermissionCondition;
import com.canicula.crmai.identity.DataPermissionService;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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
public class ContactService {

    private static final DataPermissionColumns CONTACT_PERMISSION_COLUMNS = new DataPermissionColumns(
            "c.owner_user_id",
            "c.owner_department_id",
            null);

    private final JdbcTemplate jdbcTemplate;
    private final DataPermissionService dataPermissionService;
    private final AccountService accountService;

    ContactService(
            JdbcTemplate jdbcTemplate,
            DataPermissionService dataPermissionService,
            AccountService accountService) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataPermissionService = dataPermissionService;
        this.accountService = accountService;
    }

    @Transactional
    public ContactResponse create(ContactCreateRequest request, Long actorUserId) {
        AccountResponse account = accountService.readableDetail(request.account_id(), actorUserId);
        Long contactId = insertContact(request, account, actorUserId);
        replaceProjectRoles(contactId, request.project_roles());
        return findById(contactId);
    }

    public ContactResponse readableDetail(Long contactId, Long userId) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "contact",
                CONTACT_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>();
        parameters.add(contactId);
        parameters.addAll(condition.parameters());
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select c.id
                    from crm_contacts c
                    where c.id = ?
                      and c.deleted_at is null
                      and %s
                    """.formatted(condition.clause()),
                    (rs, rowNum) -> findById(rs.getLong("id")),
                    parameters.toArray());
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("联系人不存在或无权访问");
        }
    }

    public List<ContactResponse> readableList(Long userId, ContactListFilter filter) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "contact",
                CONTACT_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>(condition.parameters());
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "c.account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "c.contact_type", filter.contact_type());
        appendEqualsFilter(filters, parameters, "c.attitude", filter.attitude());
        appendEqualsFilter(filters, parameters, "c.relationship_heat", filter.relationship_heat());
        appendEqualsFilter(filters, parameters, "c.importance_level", filter.importance_level());
        appendProjectRoleFilter(filters, parameters, filter.project_role());
        appendRangeFilter(filters, parameters, "c.last_communication_at", ">=", filter.last_communication_from());
        appendRangeFilter(filters, parameters, "c.last_communication_at", "<=", filter.last_communication_to());
        List<Long> contactIds = jdbcTemplate.query(
                """
                select c.id
                from crm_contacts c
                where c.deleted_at is null
                  and %s
                  %s
                order by c.updated_at desc, c.id desc
                """.formatted(condition.clause(), filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        return contactIds.stream()
                .map(this::findById)
                .toList();
    }

    @Transactional
    public ContactResponse update(Long contactId, ContactUpdateRequest request, Long actorUserId) {
        readableDetail(contactId, actorUserId);
        jdbcTemplate.update(
                """
                update crm_contacts
                set department = coalesce(?, department),
                    title = coalesce(?, title),
                    mobile = coalesce(?, mobile),
                    mobile_normalized = coalesce(?, mobile_normalized),
                    email = coalesce(?, email),
                    wechat = coalesce(?, wechat),
                    contact_type = coalesce(?, contact_type),
                    decision_influence = coalesce(?, decision_influence),
                    attitude = coalesce(?, attitude),
                    relationship_heat = coalesce(?, relationship_heat),
                    importance_level = coalesce(?, importance_level),
                    birthday = coalesce(?, birthday),
                    anniversary = coalesce(?, anniversary),
                    last_communication_summary = coalesce(?, last_communication_summary),
                    next_action = coalesce(?, next_action),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.department(),
                request.title(),
                request.mobile(),
                normalizeMobile(request.mobile()),
                request.email(),
                request.wechat(),
                request.contact_type(),
                request.decision_influence(),
                request.attitude(),
                request.relationship_heat(),
                request.importance_level(),
                request.birthday(),
                request.anniversary(),
                request.last_communication_summary(),
                request.next_action(),
                request.remark(),
                actorUserId,
                contactId);
        if (request.project_roles() != null) {
            replaceProjectRoles(contactId, request.project_roles());
        }
        return findById(contactId);
    }

    private Long insertContact(ContactCreateRequest request, AccountResponse account, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_contacts (
                        account_id, name, department, title, mobile, mobile_normalized,
                        email, wechat, contact_type, decision_influence, attitude,
                        relationship_heat, importance_level, birthday, anniversary,
                        last_communication_summary, next_action, owner_department_id,
                        owner_user_id, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, request.account_id());
            statement.setString(2, request.name());
            statement.setString(3, request.department());
            statement.setString(4, request.title());
            statement.setString(5, request.mobile());
            statement.setString(6, normalizeMobile(request.mobile()));
            statement.setString(7, request.email());
            statement.setString(8, request.wechat());
            statement.setString(9, request.contact_type());
            statement.setString(10, request.decision_influence());
            statement.setString(11, request.attitude());
            statement.setString(12, request.relationship_heat());
            statement.setString(13, request.importance_level());
            statement.setObject(14, request.birthday());
            statement.setObject(15, request.anniversary());
            statement.setString(16, request.last_communication_summary());
            statement.setString(17, request.next_action());
            statement.setObject(18, account.owner_department_id());
            statement.setObject(19, account.owner_user_id());
            statement.setString(20, request.remark());
            statement.setObject(21, actorUserId);
            statement.setObject(22, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private ContactResponse findById(Long contactId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from crm_contacts
                where id = ?
                  and deleted_at is null
                """,
                (rs, rowNum) -> new ContactResponse(
                        rs.getLong("id"),
                        rs.getLong("account_id"),
                        rs.getString("name"),
                        rs.getString("department"),
                        rs.getString("title"),
                        rs.getString("mobile"),
                        rs.getString("email"),
                        rs.getString("wechat"),
                        rs.getString("contact_type"),
                        rs.getString("decision_influence"),
                        rs.getString("attitude"),
                        rs.getString("relationship_heat"),
                        rs.getString("importance_level"),
                        nullableLocalDate(rs.getObject("birthday")),
                        nullableLocalDate(rs.getObject("anniversary")),
                        nullableOffsetDateTime(rs.getObject("last_communication_at")),
                        rs.getString("last_communication_summary"),
                        rs.getString("next_action"),
                        rs.getLong("owner_department_id"),
                        rs.getLong("owner_user_id"),
                        rs.getString("remark"),
                        projectRoles(contactId)),
                contactId);
    }

    private void replaceProjectRoles(Long contactId, List<String> projectRoles) {
        jdbcTemplate.update("delete from crm_contact_project_roles where contact_id = ?", contactId);
        for (String roleCode : normalizedRoles(projectRoles)) {
            jdbcTemplate.update(
                    """
                    insert into crm_contact_project_roles (contact_id, role_code)
                    values (?, ?)
                    """,
                    contactId,
                    roleCode);
        }
    }

    private List<String> projectRoles(Long contactId) {
        return jdbcTemplate.queryForList(
                """
                select role_code
                from crm_contact_project_roles
                where contact_id = ?
                order by role_code
                """,
                String.class,
                contactId);
    }

    private static List<String> normalizedRoles(List<String> projectRoles) {
        if (projectRoles == null) {
            return List.of();
        }
        return projectRoles.stream()
                .filter(ContactService::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private static String normalizeMobile(String mobile) {
        if (!hasText(mobile)) {
            return null;
        }
        String normalized = mobile.replaceAll("[^0-9]", "");
        return normalized.isBlank() ? null : normalized;
    }

    private static void appendKeywordFilter(StringBuilder sql, List<Object> parameters, String keyword) {
        if (!hasText(keyword)) {
            return;
        }
        sql.append(
                """
                  and (
                      lower(c.name) like ?
                      or lower(c.department) like ?
                      or lower(c.title) like ?
                      or lower(c.mobile) like ?
                  )
                """);
        String keywordPattern = "%" + keyword.trim().toLowerCase() + "%";
        parameters.add(keywordPattern);
        parameters.add(keywordPattern);
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

    private static void appendRangeFilter(
            StringBuilder sql,
            List<Object> parameters,
            String column,
            String operator,
            OffsetDateTime value) {
        if (value == null) {
            return;
        }
        sql.append("  and ").append(column).append(" ").append(operator).append(" ?\n");
        parameters.add(value);
    }

    private static void appendProjectRoleFilter(StringBuilder sql, List<Object> parameters, String projectRole) {
        if (!hasText(projectRole)) {
            return;
        }
        sql.append(
                """
                  and exists (
                      select 1
                      from crm_contact_project_roles cpr
                      where cpr.contact_id = c.id
                        and cpr.role_code = ?
                  )
                """);
        parameters.add(projectRole.trim());
    }

    private static LocalDate nullableLocalDate(Object value) {
        return value == null ? null : ((java.sql.Date) value).toLocalDate();
    }

    private static OffsetDateTime nullableOffsetDateTime(Object value) {
        return value == null ? null : (OffsetDateTime) value;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
