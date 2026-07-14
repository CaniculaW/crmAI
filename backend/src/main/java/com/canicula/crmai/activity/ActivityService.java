package com.canicula.crmai.activity;

import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.api.ResourceNotFoundException;
import com.canicula.crmai.identity.DataPermissionColumns;
import com.canicula.crmai.identity.DataPermissionCondition;
import com.canicula.crmai.identity.DataPermissionService;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.opportunity.OpportunityService;
import com.canicula.crmai.reminder.ReminderService;
import java.sql.PreparedStatement;
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
public class ActivityService {

    private static final DataPermissionColumns ACTIVITY_PERMISSION_COLUMNS = new DataPermissionColumns(
            "sa.owner_user_id",
            "sa.owner_department_id",
            "exists (select 1 from crm_activity_participants ap where ap.activity_id = sa.id and ap.user_id = ?)");

    private final JdbcTemplate jdbcTemplate;
    private final DataPermissionService dataPermissionService;
    private final AccountService accountService;
    private final OpportunityService opportunityService;
    private final ReminderService reminderService;

    ActivityService(
            JdbcTemplate jdbcTemplate,
            DataPermissionService dataPermissionService,
            AccountService accountService,
            OpportunityService opportunityService,
            ReminderService reminderService) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataPermissionService = dataPermissionService;
        this.accountService = accountService;
        this.opportunityService = opportunityService;
        this.reminderService = reminderService;
    }

    @Transactional
    public ActivityResponse create(ActivityCreateRequest request, Long actorUserId) {
        AccountResponse account = accountService.readableDetail(request.account_id(), actorUserId);
        validateOpportunity(request.opportunity_id(), request.account_id(), actorUserId);
        Long activityId = insertActivity(request, actorUserId);
        replaceContacts(activityId, account.id(), request.contact_ids());
        replaceParticipants(activityId, request.participants());
        replaceRiskTypes(activityId, request.risk_types());
        reminderService.syncActivityFollowUpReminder(
                activityId,
                request.subject(),
                request.owner_user_id(),
                request.next_follow_up_at(),
                actorUserId);
        return findById(activityId);
    }

    public ActivityResponse readableDetail(Long activityId, Long userId) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "activity",
                ACTIVITY_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>();
        parameters.add(activityId);
        parameters.addAll(condition.parameters());
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select sa.id
                    from crm_sales_activities sa
                    where sa.id = ?
                      and sa.deleted_at is null
                      and %s
                    """.formatted(condition.clause()),
                    (rs, rowNum) -> findById(rs.getLong("id")),
                    parameters.toArray());
        } catch (EmptyResultDataAccessException exception) {
            throw new ResourceNotFoundException("销售行动不存在或无权访问");
        }
    }

    public List<ActivityResponse> readableList(Long userId, ActivityListFilter filter) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "activity",
                ACTIVITY_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>(condition.parameters());
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "sa.account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "sa.opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "sa.owner_user_id", filter.owner_user_id());
        appendEqualsFilter(filters, parameters, "sa.activity_type", filter.activity_type());
        appendEqualsFilter(filters, parameters, "sa.activity_status", filter.activity_status());
        appendEqualsFilter(filters, parameters, "sa.activity_result", filter.activity_result());
        appendRangeFilter(filters, parameters, "sa.activity_time", ">=", filter.activity_from());
        appendRangeFilter(filters, parameters, "sa.activity_time", "<=", filter.activity_to());
        appendParticipantFilter(filters, parameters, filter.participant_user_id());
        appendRiskTypeFilter(filters, parameters, filter.risk_type());
        if (Boolean.TRUE.equals(filter.overdue())) {
            filters.append("  and sa.next_follow_up_at < current_timestamp and sa.activity_status <> 'completed'\n");
        }
        if (filter.include_in_weekly_progress() != null) {
            filters.append("  and sa.include_in_weekly_progress = ?\n");
            parameters.add(filter.include_in_weekly_progress());
        }
        List<Long> activityIds = jdbcTemplate.query(
                """
                select sa.id
                from crm_sales_activities sa
                where sa.deleted_at is null
                  and %s
                  %s
                order by sa.activity_time desc, sa.id desc
                """.formatted(condition.clause(), filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        return activityIds.stream()
                .map(this::findById)
                .toList();
    }

    @Transactional
    public ActivityResponse update(Long activityId, ActivityUpdateRequest request, Long actorUserId) {
        ActivityResponse current = readableDetail(activityId, actorUserId);
        jdbcTemplate.update(
                """
                update crm_sales_activities
                set subject = coalesce(?, subject),
                    activity_type = coalesce(?, activity_type),
                    activity_status = coalesce(?, activity_status),
                    activity_result = coalesce(?, activity_result),
                    activity_time = coalesce(?, activity_time),
                    next_follow_up_at = coalesce(?, next_follow_up_at),
                    communication_content = coalesce(?, communication_content),
                    customer_feedback = coalesce(?, customer_feedback),
                    conclusion = coalesce(?, conclusion),
                    next_plan = coalesce(?, next_plan),
                    risk_description = coalesce(?, risk_description),
                    include_in_weekly_progress = coalesce(?, include_in_weekly_progress),
                    weekly_period = coalesce(?, weekly_period),
                    source_type = coalesce(?, source_type),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.subject(),
                request.activity_type(),
                request.activity_status(),
                request.activity_result(),
                request.activity_time(),
                request.next_follow_up_at(),
                request.communication_content(),
                request.customer_feedback(),
                request.conclusion(),
                request.next_plan(),
                request.risk_description(),
                request.include_in_weekly_progress(),
                request.weekly_period(),
                request.source_type(),
                request.remark(),
                actorUserId,
                activityId);
        if (request.contact_ids() != null) {
            replaceContacts(activityId, current.account_id(), request.contact_ids());
        }
        if (request.participants() != null) {
            replaceParticipants(activityId, request.participants());
        }
        if (request.risk_types() != null) {
            replaceRiskTypes(activityId, request.risk_types());
        }
        ActivityResponse updated = findById(activityId);
        if (request.next_follow_up_at() != null || request.subject() != null) {
            reminderService.syncActivityFollowUpReminder(
                    activityId,
                    updated.subject(),
                    updated.owner_user_id(),
                    updated.next_follow_up_at(),
                    actorUserId);
        }
        return updated;
    }

    @Transactional
    public ActivityResponse complete(Long activityId, ActivityCompleteRequest request, Long actorUserId) {
        ActivityResponse current = readableDetail(activityId, actorUserId);
        if ("completed".equalsIgnoreCase(current.activity_status())) {
            throw new BusinessRuleException("销售行动已完成，不能重复完成");
        }
        String conclusion = coalesceText(request.conclusion(), current.conclusion(), current.subject());
        String nextPlan = coalesceText(request.next_plan(), current.next_plan(), null);
        String riskDescription = coalesceText(request.risk_description(), current.risk_description(), null);
        String activityResult = coalesceText(request.activity_result(), current.activity_result(), "milestone_completed");
        int updatedCount = jdbcTemplate.update(
                """
                update crm_sales_activities
                set activity_status = 'completed',
                    activity_result = ?,
                    conclusion = ?,
                    next_plan = coalesce(?, next_plan),
                    risk_description = coalesce(?, risk_description),
                    completed_at = current_timestamp,
                    completed_by = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                  and activity_status <> 'completed'
                """,
                activityResult,
                conclusion,
                nextPlan,
                riskDescription,
                actorUserId,
                actorUserId,
                activityId);
        if (updatedCount != 1) {
            throw new BusinessRuleException("销售行动状态已变化，请刷新后重试");
        }
        if (request.risk_types() != null) {
            replaceRiskTypes(activityId, request.risk_types());
        }
        backfillAccountLastActivity(current.account_id(), current.activity_time(), conclusion, current.next_follow_up_at(), actorUserId);
        if (current.opportunity_id() != null) {
            backfillOpportunityLastActivity(
                    current.opportunity_id(),
                    current.activity_time(),
                    conclusion,
                    activityResult,
                    riskDescription,
                    actorUserId);
        }
        reminderService.completePendingActivityReminder(activityId, actorUserId);
        return findById(activityId);
    }

    private Long insertActivity(ActivityCreateRequest request, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_sales_activities (
                        account_id, opportunity_id, subject, activity_type, activity_status,
                        activity_result, activity_time, next_follow_up_at, owner_department_id,
                        owner_user_id, communication_content, customer_feedback, conclusion,
                        next_plan, risk_description, include_in_weekly_progress, weekly_period,
                        source_type, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, request.account_id());
            statement.setObject(2, request.opportunity_id());
            statement.setString(3, request.subject());
            statement.setString(4, request.activity_type());
            statement.setString(5, request.activity_status());
            statement.setString(6, request.activity_result());
            statement.setObject(7, request.activity_time());
            statement.setObject(8, request.next_follow_up_at());
            statement.setObject(9, request.owner_department_id());
            statement.setObject(10, request.owner_user_id());
            statement.setString(11, request.communication_content());
            statement.setString(12, request.customer_feedback());
            statement.setString(13, request.conclusion());
            statement.setString(14, request.next_plan());
            statement.setString(15, request.risk_description());
            statement.setObject(16, request.include_in_weekly_progress() == null
                    ? Boolean.TRUE
                    : request.include_in_weekly_progress());
            statement.setString(17, request.weekly_period());
            statement.setString(18, request.source_type());
            statement.setString(19, request.remark());
            statement.setObject(20, actorUserId);
            statement.setObject(21, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private ActivityResponse findById(Long activityId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from crm_sales_activities
                where id = ?
                  and deleted_at is null
                """,
                (rs, rowNum) -> new ActivityResponse(
                        rs.getLong("id"),
                        rs.getLong("account_id"),
                        nullableLong(rs.getObject("opportunity_id")),
                        rs.getString("subject"),
                        rs.getString("activity_type"),
                        rs.getString("activity_status"),
                        rs.getString("activity_result"),
                        nullableOffsetDateTime(rs.getObject("activity_time")),
                        nullableOffsetDateTime(rs.getObject("next_follow_up_at")),
                        rs.getLong("owner_department_id"),
                        rs.getLong("owner_user_id"),
                        rs.getString("communication_content"),
                        rs.getString("customer_feedback"),
                        rs.getString("conclusion"),
                        rs.getString("next_plan"),
                        rs.getString("risk_description"),
                        rs.getBoolean("include_in_weekly_progress"),
                        rs.getString("weekly_period"),
                        rs.getString("source_type"),
                        nullableOffsetDateTime(rs.getObject("completed_at")),
                        nullableLong(rs.getObject("completed_by")),
                        rs.getString("remark"),
                        contactIds(activityId),
                        participants(activityId),
                        riskTypes(activityId)),
                activityId);
    }

    private void backfillAccountLastActivity(
            Long accountId,
            OffsetDateTime activityTime,
            String summary,
            OffsetDateTime nextFollowUpAt,
            Long actorUserId) {
        jdbcTemplate.update(
                """
                update crm_accounts
                set last_activity_at = ?,
                    last_activity_summary = ?,
                    next_follow_up_at = coalesce(?, next_follow_up_at),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                activityTime,
                summary,
                nextFollowUpAt,
                actorUserId,
                accountId);
    }

    private void backfillOpportunityLastActivity(
            Long opportunityId,
            OffsetDateTime activityTime,
            String summary,
            String activityResult,
            String riskDescription,
            Long actorUserId) {
        jdbcTemplate.update(
                """
                update crm_opportunities
                set last_activity_at = ?,
                    last_activity_summary = ?,
                    risk_status = case when ? = 'risk_found' then 'risk' else risk_status end,
                    risk_description = case when ? = 'risk_found' then coalesce(?, risk_description) else risk_description end,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                activityTime,
                summary,
                activityResult,
                activityResult,
                riskDescription,
                actorUserId,
                opportunityId);
    }

    private void validateOpportunity(Long opportunityId, Long accountId, Long actorUserId) {
        if (opportunityId == null) {
            return;
        }
        OpportunityResponse opportunity = opportunityService.readableDetail(opportunityId, actorUserId);
        if (!Objects.equals(opportunity.account_id(), accountId)) {
            throw new IllegalArgumentException("销售行动关联商机必须属于同一客户");
        }
    }

    private void replaceContacts(Long activityId, Long accountId, List<Long> contactIds) {
        jdbcTemplate.update("delete from crm_activity_contacts where activity_id = ?", activityId);
        if (contactIds == null) {
            return;
        }
        for (Long contactId : contactIds) {
            validateContactBelongsToAccount(contactId, accountId);
            jdbcTemplate.update(
                    "insert into crm_activity_contacts (activity_id, contact_id) values (?, ?)",
                    activityId,
                    contactId);
        }
    }

    private void replaceParticipants(Long activityId, List<ActivityParticipantRequest> participants) {
        jdbcTemplate.update("delete from crm_activity_participants where activity_id = ?", activityId);
        if (participants == null) {
            return;
        }
        for (ActivityParticipantRequest participant : participants) {
            jdbcTemplate.update(
                    """
                    insert into crm_activity_participants (activity_id, user_id, participant_role)
                    values (?, ?, ?)
                    """,
                    activityId,
                    participant.user_id(),
                    participant.participant_role());
        }
    }

    private void replaceRiskTypes(Long activityId, List<String> riskTypes) {
        jdbcTemplate.update("delete from crm_activity_risk_types where activity_id = ?", activityId);
        if (riskTypes == null) {
            return;
        }
        for (String riskType : riskTypes) {
            if (hasText(riskType)) {
                jdbcTemplate.update(
                        "insert into crm_activity_risk_types (activity_id, risk_type) values (?, ?)",
                        activityId,
                        riskType.trim());
            }
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
            throw new IllegalArgumentException("销售行动联系人必须属于同一客户");
        }
    }

    private List<Long> contactIds(Long activityId) {
        return jdbcTemplate.queryForList(
                """
                select contact_id
                from crm_activity_contacts
                where activity_id = ?
                order by contact_id
                """,
                Long.class,
                activityId);
    }

    private List<ActivityParticipantResponse> participants(Long activityId) {
        return jdbcTemplate.query(
                """
                select user_id, participant_role
                from crm_activity_participants
                where activity_id = ?
                order by user_id
                """,
                (rs, rowNum) -> new ActivityParticipantResponse(
                        rs.getLong("user_id"),
                        rs.getString("participant_role")),
                activityId);
    }

    private List<String> riskTypes(Long activityId) {
        return jdbcTemplate.queryForList(
                """
                select risk_type
                from crm_activity_risk_types
                where activity_id = ?
                order by risk_type
                """,
                String.class,
                activityId);
    }

    private static void appendKeywordFilter(StringBuilder sql, List<Object> parameters, String keyword) {
        if (!hasText(keyword)) {
            return;
        }
        sql.append("  and lower(sa.subject) like ?\n");
        parameters.add("%" + keyword.trim().toLowerCase() + "%");
    }

    private static void appendParticipantFilter(StringBuilder sql, List<Object> parameters, Long participantUserId) {
        if (participantUserId == null) {
            return;
        }
        sql.append(
                """
                  and exists (
                    select 1
                    from crm_activity_participants apf
                    where apf.activity_id = sa.id
                      and apf.user_id = ?
                  )
                """);
        parameters.add(participantUserId);
    }

    private static void appendRiskTypeFilter(StringBuilder sql, List<Object> parameters, String riskType) {
        if (!hasText(riskType)) {
            return;
        }
        sql.append(
                """
                  and exists (
                    select 1
                    from crm_activity_risk_types artf
                    where artf.activity_id = sa.id
                      and artf.risk_type = ?
                  )
                """);
        parameters.add(riskType.trim());
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

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static String coalesceText(String first, String second, String third) {
        if (hasText(first)) {
            return first.trim();
        }
        if (hasText(second)) {
            return second.trim();
        }
        return hasText(third) ? third.trim() : null;
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

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
