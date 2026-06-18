package com.canicula.crmai.reminder;

import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.auth.ForbiddenException;
import java.sql.PreparedStatement;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReminderService {

    private final JdbcTemplate jdbcTemplate;

    ReminderService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void syncActivityFollowUpReminder(
            Long activityId,
            String title,
            Long assigneeId,
            OffsetDateTime dueAt,
            Long actorUserId) {
        if (dueAt == null) {
            cancelPendingActivityReminder(activityId, actorUserId);
            return;
        }
        Integer updated = jdbcTemplate.update(
                """
                update crm_reminders
                set title = ?,
                    assignee_id = ?,
                    due_at = ?,
                    status = 'pending',
                    completed_at = null,
                    completed_by = null,
                    cancelled_at = null,
                    cancelled_by = null,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where object_type = 'activity'
                  and object_id = ?
                  and reminder_type = 'follow_up'
                  and status = 'pending'
                  and deleted_at is null
                """,
                title,
                assigneeId,
                dueAt,
                actorUserId,
                activityId);
        if (updated == 0) {
            insertReminder("activity", activityId, "follow_up", title, assigneeId, dueAt, actorUserId);
        }
    }

    @Transactional
    public void completePendingActivityReminder(Long activityId, Long actorUserId) {
        jdbcTemplate.update(
                """
                update crm_reminders
                set status = 'completed',
                    completed_at = current_timestamp,
                    completed_by = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where object_type = 'activity'
                  and object_id = ?
                  and reminder_type = 'follow_up'
                  and status = 'pending'
                  and deleted_at is null
                """,
                actorUserId,
                actorUserId,
                activityId);
    }

    public List<ReminderResponse> listMine(Long actorUserId, ReminderFilter filter) {
        List<Object> parameters = new ArrayList<>();
        parameters.add(actorUserId);
        StringBuilder filters = new StringBuilder();
        String normalizedStatus = normalizeText(filter.status());
        if (hasText(normalizedStatus)) {
            if ("overdue".equals(normalizedStatus)) {
                filters.append("  and r.status = 'pending' and r.due_at < current_timestamp\n");
            } else {
                filters.append("  and r.status = ?\n");
                parameters.add(normalizedStatus);
            }
        }
        if (Boolean.TRUE.equals(filter.overdue())) {
            filters.append("  and r.status = 'pending' and r.due_at < current_timestamp\n");
        }
        if (hasText(filter.object_type())) {
            filters.append("  and r.object_type = ?\n");
            parameters.add(normalizeObjectType(filter.object_type()));
        }
        if (filter.object_id() != null) {
            filters.append("  and r.object_id = ?\n");
            parameters.add(filter.object_id());
        }
        return jdbcTemplate.query(
                """
                select r.id
                from crm_reminders r
                where r.assignee_id = ?
                  and r.deleted_at is null
                  %s
                order by r.due_at asc, r.id asc
                """.formatted(filters),
                (rs, rowNum) -> findById(rs.getLong("id")),
                parameters.toArray());
    }

    @Transactional
    public ReminderResponse updateStatus(Long reminderId, ReminderUpdateRequest request, Long actorUserId) {
        ReminderResponse current = readableReminder(reminderId, actorUserId);
        String status = normalizeText(request.status());
        if (!List.of("completed", "cancelled").contains(status)) {
            throw new BusinessRuleException("提醒状态只能更新为 completed 或 cancelled");
        }
        if ("completed".equals(status)) {
            jdbcTemplate.update(
                    """
                    update crm_reminders
                    set status = 'completed',
                        completed_at = current_timestamp,
                        completed_by = ?,
                        updated_by = ?,
                        updated_at = current_timestamp,
                        version = version + 1
                    where id = ?
                      and deleted_at is null
                    """,
                    actorUserId,
                    actorUserId,
                    reminderId);
        } else {
            jdbcTemplate.update(
                    """
                    update crm_reminders
                    set status = 'cancelled',
                        cancelled_at = current_timestamp,
                        cancelled_by = ?,
                        updated_by = ?,
                        updated_at = current_timestamp,
                        version = version + 1
                    where id = ?
                      and deleted_at is null
                    """,
                    actorUserId,
                    actorUserId,
                    reminderId);
        }
        return findById(current.id());
    }

    private void cancelPendingActivityReminder(Long activityId, Long actorUserId) {
        jdbcTemplate.update(
                """
                update crm_reminders
                set status = 'cancelled',
                    cancelled_at = current_timestamp,
                    cancelled_by = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where object_type = 'activity'
                  and object_id = ?
                  and reminder_type = 'follow_up'
                  and status = 'pending'
                  and deleted_at is null
                """,
                actorUserId,
                actorUserId,
                activityId);
    }

    private Long insertReminder(
            String objectType,
            Long objectId,
            String reminderType,
            String title,
            Long assigneeId,
            OffsetDateTime dueAt,
            Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_reminders (
                        object_type, object_id, reminder_type, title, assignee_id,
                        due_at, status, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                    """,
                    new String[] {"id"});
            statement.setString(1, objectType);
            statement.setObject(2, objectId);
            statement.setString(3, reminderType);
            statement.setString(4, title);
            statement.setObject(5, assigneeId);
            statement.setObject(6, dueAt);
            statement.setObject(7, actorUserId);
            statement.setObject(8, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private ReminderResponse readableReminder(Long reminderId, Long actorUserId) {
        ReminderResponse response = findById(reminderId);
        if (!Objects.equals(response.assignee_id(), actorUserId)) {
            throw new ForbiddenException("无权访问该提醒");
        }
        return response;
    }

    private ReminderResponse findById(Long reminderId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_reminders
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new ReminderResponse(
                            rs.getLong("id"),
                            rs.getString("object_type"),
                            rs.getLong("object_id"),
                            rs.getString("reminder_type"),
                            rs.getString("title"),
                            rs.getLong("assignee_id"),
                            nullableOffsetDateTime(rs.getObject("due_at")),
                            effectiveStatus(
                                    rs.getString("status"),
                                    nullableOffsetDateTime(rs.getObject("due_at"))),
                            nullableOffsetDateTime(rs.getObject("completed_at")),
                            nullableLong(rs.getObject("completed_by"))),
                    reminderId);
        } catch (EmptyResultDataAccessException exception) {
            throw new BusinessRuleException("提醒不存在或已删除");
        }
    }

    private static String effectiveStatus(String status, OffsetDateTime dueAt) {
        if ("pending".equals(status) && dueAt != null && dueAt.isBefore(OffsetDateTime.now())) {
            return "overdue";
        }
        return status;
    }

    private static String normalizeObjectType(String objectType) {
        if (!hasText(objectType)) {
            return null;
        }
        return objectType.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeText(String value) {
        return hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
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
}
