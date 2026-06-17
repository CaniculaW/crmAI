package com.canicula.crmai.opportunity;

import com.canicula.crmai.api.BusinessRuleException;
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
public class OpportunityService {

    private static final DataPermissionColumns OPPORTUNITY_PERMISSION_COLUMNS = new DataPermissionColumns(
            "o.owner_user_id",
            "o.owner_department_id",
            "exists (select 1 from crm_opportunity_collaborators oc where oc.opportunity_id = o.id and oc.user_id = ?)");

    private final JdbcTemplate jdbcTemplate;
    private final DataPermissionService dataPermissionService;
    private final AccountService accountService;

    OpportunityService(
            JdbcTemplate jdbcTemplate,
            DataPermissionService dataPermissionService,
            AccountService accountService) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataPermissionService = dataPermissionService;
        this.accountService = accountService;
    }

    @Transactional
    public OpportunityResponse create(OpportunityCreateRequest request, Long actorUserId) {
        AccountResponse account = accountService.readableDetail(request.account_id(), actorUserId);
        Long opportunityId = insertOpportunity(request, account, actorUserId);
        replaceCollaborators(opportunityId, request.collaborators());
        replaceContactRelations(opportunityId, request.account_id(), request.contact_relations());
        return findById(opportunityId);
    }

    public OpportunityResponse readableDetail(Long opportunityId, Long userId) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "opportunity",
                OPPORTUNITY_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>();
        parameters.add(opportunityId);
        parameters.addAll(condition.parameters());
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select o.id
                    from crm_opportunities o
                    where o.id = ?
                      and o.deleted_at is null
                      and %s
                    """.formatted(condition.clause()),
                    (rs, rowNum) -> findById(rs.getLong("id")),
                    parameters.toArray());
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("商机不存在或无权访问");
        }
    }

    public List<OpportunityResponse> readableList(Long userId, OpportunityListFilter filter) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "opportunity",
                OPPORTUNITY_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>(condition.parameters());
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "o.account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "o.stage", filter.stage());
        appendEqualsFilter(filters, parameters, "o.status", filter.status());
        appendEqualsFilter(filters, parameters, "o.level", filter.level());
        appendEqualsFilter(filters, parameters, "o.source", filter.source());
        appendEqualsFilter(filters, parameters, "o.owner_user_id", filter.owner_user_id());
        appendEqualsFilter(filters, parameters, "o.owner_department_id", filter.owner_department_id());
        appendEqualsFilter(filters, parameters, "o.risk_status", filter.risk_status());
        appendRangeFilter(filters, parameters, "o.estimated_contract_amount", ">=", filter.amount_min());
        appendRangeFilter(filters, parameters, "o.estimated_contract_amount", "<=", filter.amount_max());
        appendRangeFilter(filters, parameters, "o.expected_close_date", ">=", filter.expected_close_from());
        appendRangeFilter(filters, parameters, "o.expected_close_date", "<=", filter.expected_close_to());
        if (filter.default_following()) {
            filters.append("  and o.status = 'following'\n");
        }
        List<Long> opportunityIds = jdbcTemplate.query(
                """
                select o.id
                from crm_opportunities o
                where o.deleted_at is null
                  and %s
                  %s
                order by o.updated_at desc, o.id desc
                """.formatted(condition.clause(), filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        return opportunityIds.stream()
                .map(this::findById)
                .toList();
    }

    @Transactional
    public OpportunityResponse update(Long opportunityId, OpportunityUpdateRequest request, Long actorUserId) {
        OpportunityResponse current = readableDetail(opportunityId, actorUserId);
        jdbcTemplate.update(
                """
                update crm_opportunities
                set stage = coalesce(?, stage),
                    status = coalesce(?, status),
                    level = coalesce(?, level),
                    source = coalesce(?, source),
                    potential_point = coalesce(?, potential_point),
                    estimated_budget_amount = coalesce(?, estimated_budget_amount),
                    estimated_contract_amount = coalesce(?, estimated_contract_amount),
                    expected_close_date = coalesce(?, expected_close_date),
                    risk_status = coalesce(?, risk_status),
                    current_progress = coalesce(?, current_progress),
                    next_plan = coalesce(?, next_plan),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.stage(),
                request.status(),
                request.level(),
                request.source(),
                request.potential_point(),
                request.estimated_budget_amount(),
                request.estimated_contract_amount(),
                request.expected_close_date(),
                request.risk_status(),
                request.current_progress(),
                request.next_plan(),
                request.remark(),
                actorUserId,
                opportunityId);
        if (request.collaborators() != null) {
            replaceCollaborators(opportunityId, request.collaborators());
        }
        if (request.contact_relations() != null) {
            replaceContactRelations(opportunityId, current.account_id(), request.contact_relations());
        }
        return findById(opportunityId);
    }

    @Transactional
    public OpportunityResponse close(Long opportunityId, OpportunityCloseRequest request, Long actorUserId) {
        readableDetail(opportunityId, actorUserId);
        validateCloseRequest(request);
        String closeType = request.close_type().trim();
        jdbcTemplate.update(
                """
                update crm_opportunities
                set status = ?,
                    close_type = ?,
                    close_reason = ?,
                    close_description = ?,
                    closed_at = current_timestamp,
                    closed_by = ?,
                    can_reopen = true,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                closeStatus(closeType),
                closeType,
                request.close_reason().trim(),
                request.close_description().trim(),
                actorUserId,
                actorUserId,
                opportunityId);
        return findById(opportunityId);
    }

    @Transactional
    public OpportunityResponse reopen(Long opportunityId, OpportunityReopenRequest request, Long actorUserId) {
        OpportunityResponse current = readableDetail(opportunityId, actorUserId);
        if (!Boolean.TRUE.equals(current.can_reopen())
                || !List.of("closed", "cancelled").contains(current.status())) {
            throw new BusinessRuleException("当前商机不满足重启规则");
        }
        jdbcTemplate.update(
                """
                update crm_opportunities
                set status = 'following',
                    close_type = null,
                    close_reason = null,
                    close_description = null,
                    closed_at = null,
                    closed_by = null,
                    can_reopen = false,
                    current_progress = coalesce(?, current_progress),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                normalizeText(request.reopen_reason()),
                actorUserId,
                opportunityId);
        return findById(opportunityId);
    }

    private Long insertOpportunity(OpportunityCreateRequest request, AccountResponse account, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_opportunities (
                        account_id, opportunity_name, stage, status, level, source,
                        potential_point, estimated_budget_amount, estimated_contract_amount,
                        expected_close_date, owner_department_id, owner_user_id, risk_status,
                        current_progress, next_plan, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, request.account_id());
            statement.setString(2, request.opportunity_name());
            statement.setString(3, request.stage());
            statement.setString(4, request.status());
            statement.setString(5, request.level());
            statement.setString(6, request.source());
            statement.setString(7, request.potential_point());
            statement.setObject(8, request.estimated_budget_amount());
            statement.setObject(9, request.estimated_contract_amount());
            statement.setObject(10, request.expected_close_date());
            statement.setObject(11, account.owner_department_id());
            statement.setObject(12, account.owner_user_id());
            statement.setString(13, request.risk_status());
            statement.setString(14, request.current_progress());
            statement.setString(15, request.next_plan());
            statement.setString(16, request.remark());
            statement.setObject(17, actorUserId);
            statement.setObject(18, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private OpportunityResponse findById(Long opportunityId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from crm_opportunities
                where id = ?
                  and deleted_at is null
                """,
                (rs, rowNum) -> new OpportunityResponse(
                        rs.getLong("id"),
                        rs.getLong("account_id"),
                        rs.getString("opportunity_name"),
                        rs.getString("stage"),
                        rs.getString("status"),
                        rs.getString("level"),
                        rs.getString("source"),
                        rs.getString("potential_point"),
                        rs.getBigDecimal("estimated_budget_amount"),
                        rs.getBigDecimal("estimated_contract_amount"),
                        nullableLocalDate(rs.getObject("expected_close_date")),
                        rs.getLong("owner_department_id"),
                        rs.getLong("owner_user_id"),
                        rs.getString("risk_status"),
                        rs.getString("risk_description"),
                        nullableOffsetDateTime(rs.getObject("last_activity_at")),
                        rs.getString("last_activity_summary"),
                        rs.getString("current_progress"),
                        rs.getString("next_plan"),
                        rs.getString("close_type"),
                        rs.getString("close_reason"),
                        rs.getString("close_description"),
                        nullableOffsetDateTime(rs.getObject("closed_at")),
                        nullableLong(rs.getObject("closed_by"), rs.getLong("closed_by")),
                        rs.getBoolean("can_reopen"),
                        rs.getString("remark"),
                        collaborators(opportunityId),
                        contactRelations(opportunityId)),
                opportunityId);
    }

    private void replaceCollaborators(Long opportunityId, List<OpportunityCollaboratorRequest> collaborators) {
        jdbcTemplate.update("delete from crm_opportunity_collaborators where opportunity_id = ?", opportunityId);
        if (collaborators == null) {
            return;
        }
        for (OpportunityCollaboratorRequest collaborator : collaborators) {
            jdbcTemplate.update(
                    """
                    insert into crm_opportunity_collaborators (opportunity_id, user_id, collaborator_role)
                    values (?, ?, ?)
                    """,
                    opportunityId,
                    collaborator.user_id(),
                    collaborator.collaborator_role());
        }
    }

    private void replaceContactRelations(
            Long opportunityId,
            Long accountId,
            List<OpportunityContactRelationRequest> contactRelations) {
        jdbcTemplate.update("delete from crm_opportunity_contacts where opportunity_id = ?", opportunityId);
        if (contactRelations == null) {
            return;
        }
        for (OpportunityContactRelationRequest relation : contactRelations) {
            validateContactBelongsToAccount(relation.contact_id(), accountId);
            jdbcTemplate.update(
                    """
                    insert into crm_opportunity_contacts (
                        opportunity_id, contact_id, role_in_opportunity, is_key_person
                    )
                    values (?, ?, ?, ?)
                    """,
                    opportunityId,
                    relation.contact_id(),
                    relation.role_in_opportunity(),
                    Boolean.TRUE.equals(relation.is_key_person()));
        }
    }

    private void validateContactBelongsToAccount(Long contactId, Long accountId) {
        Long contactAccountId = jdbcTemplate.queryForObject(
                """
                select account_id
                from crm_contacts
                where id = ?
                  and deleted_at is null
                """,
                Long.class,
                contactId);
        if (!Objects.equals(contactAccountId, accountId)) {
            throw new IllegalArgumentException("商机关联联系人必须属于同一客户");
        }
    }

    private List<OpportunityCollaboratorResponse> collaborators(Long opportunityId) {
        return jdbcTemplate.query(
                """
                select user_id, collaborator_role
                from crm_opportunity_collaborators
                where opportunity_id = ?
                order by user_id
                """,
                (rs, rowNum) -> new OpportunityCollaboratorResponse(
                        rs.getLong("user_id"),
                        rs.getString("collaborator_role")),
                opportunityId);
    }

    private List<OpportunityContactRelationResponse> contactRelations(Long opportunityId) {
        return jdbcTemplate.query(
                """
                select contact_id, role_in_opportunity, is_key_person
                from crm_opportunity_contacts
                where opportunity_id = ?
                order by contact_id
                """,
                (rs, rowNum) -> new OpportunityContactRelationResponse(
                        rs.getLong("contact_id"),
                        rs.getString("role_in_opportunity"),
                        rs.getBoolean("is_key_person")),
                opportunityId);
    }

    private static void appendKeywordFilter(StringBuilder sql, List<Object> parameters, String keyword) {
        if (!hasText(keyword)) {
            return;
        }
        sql.append("  and lower(o.opportunity_name) like ?\n");
        parameters.add("%" + keyword.trim().toLowerCase() + "%");
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
            Object value) {
        if (value == null) {
            return;
        }
        sql.append("  and ").append(column).append(" ").append(operator).append(" ?\n");
        parameters.add(value);
    }

    private static LocalDate nullableLocalDate(Object value) {
        return value == null ? null : ((java.sql.Date) value).toLocalDate();
    }

    private static OffsetDateTime nullableOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant().atOffset(OffsetDateTime.now().getOffset());
        }
        return null;
    }

    private static Long nullableLong(Object value, long longValue) {
        return value == null ? null : longValue;
    }

    private static void validateCloseRequest(OpportunityCloseRequest request) {
        if (!hasText(request.close_type())) {
            throw new BusinessRuleException("关闭或取消商机必须填写关闭类型");
        }
        if (!hasText(request.close_reason())) {
            throw new BusinessRuleException("关闭或取消商机必须填写原因");
        }
        if (!hasText(request.close_description())) {
            throw new BusinessRuleException("关闭或取消商机必须填写说明");
        }
    }

    private static String closeStatus(String closeType) {
        return "cancelled".equals(closeType) ? "cancelled" : "closed";
    }

    private static String normalizeText(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
