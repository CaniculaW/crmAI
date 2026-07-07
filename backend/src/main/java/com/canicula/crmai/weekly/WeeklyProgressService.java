package com.canicula.crmai.weekly;

import com.canicula.crmai.identity.DataPermissionColumns;
import com.canicula.crmai.identity.DataPermissionCondition;
import com.canicula.crmai.identity.DataPermissionService;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class WeeklyProgressService {

    private static final DataPermissionColumns WEEKLY_PROGRESS_PERMISSION_COLUMNS = new DataPermissionColumns(
            "w.owner_user_id",
            "w.owner_department_id",
            "exists (select 1 from crm_opportunity_collaborators oc where oc.opportunity_id = w.opportunity_id and oc.user_id = ?)");

    private final JdbcTemplate jdbcTemplate;
    private final DataPermissionService dataPermissionService;

    WeeklyProgressService(JdbcTemplate jdbcTemplate, DataPermissionService dataPermissionService) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataPermissionService = dataPermissionService;
    }

    public List<WeeklyProgressResponse> readableList(Long userId, WeeklyProgressFilter filter) {
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "opportunity",
                WEEKLY_PROGRESS_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>(condition.parameters());
        StringBuilder filters = new StringBuilder();
        appendEqualsFilter(filters, parameters, "w.opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "w.owner_user_id", filter.owner_user_id());
        appendEqualsFilter(filters, parameters, "w.account_id", filter.account_id());
        appendRangeFilter(filters, parameters, "w.week_start_date", ">=", filter.week_start());
        appendRangeFilter(filters, parameters, "w.week_start_date", "<=", filter.week_end());
        if (Boolean.TRUE.equals(filter.risk_only())) {
            filters.append(
                    """
                      and exists (
                        select 1
                        from crm_sales_activities sar
                        where sar.opportunity_id = w.opportunity_id
                          and sar.activity_status = 'completed'
                          and sar.include_in_weekly_progress = true
                          and sar.deleted_at is null
                          and cast(date_trunc('week', sar.activity_time) as date) = w.week_start_date
                          and sar.activity_result = 'risk_found'
                      )
                    """);
        }
        return jdbcTemplate.query(
                """
                select *
                from v_opportunity_weekly_progress w
                where %s
                  %s
                order by w.week_start_date desc, w.latest_activity_at desc, w.opportunity_id desc
                """.formatted(condition.clause(), filters),
                (rs, rowNum) -> {
                    Long opportunityId = rs.getLong("opportunity_id");
                    LocalDate weekStart = nullableLocalDate(rs.getObject("week_start_date"));
                    return new WeeklyProgressResponse(
                            opportunityId,
                            rs.getLong("account_id"),
                            rs.getLong("owner_user_id"),
                            weekStart,
                            nullableLocalDate(rs.getObject("week_end_date")),
                            rs.getLong("activity_count"),
                            nullableOffsetDateTime(rs.getObject("latest_activity_at")),
                            progressItems(opportunityId, weekStart));
                },
                parameters.toArray());
    }

    private List<WeeklyProgressItemResponse> progressItems(Long opportunityId, LocalDate weekStart) {
        return jdbcTemplate.query(
                """
                select id, subject, activity_time, conclusion, next_plan, risk_description, activity_result
                from crm_sales_activities
                where opportunity_id = ?
                  and activity_status = 'completed'
                  and include_in_weekly_progress = true
                  and deleted_at is null
                  and cast(date_trunc('week', activity_time) as date) = ?
                order by activity_time asc, id asc
                """,
                (rs, rowNum) -> new WeeklyProgressItemResponse(
                        rs.getLong("id"),
                        rs.getString("subject"),
                        nullableOffsetDateTime(rs.getObject("activity_time")),
                        rs.getString("conclusion"),
                        rs.getString("next_plan"),
                        rs.getString("risk_description"),
                        rs.getString("activity_result")),
                opportunityId,
                weekStart);
    }

    private static void appendEqualsFilter(StringBuilder sql, List<Object> parameters, String column, Object value) {
        if (value == null) {
            return;
        }
        sql.append("  and ").append(column).append(" = ?\n");
        parameters.add(value);
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
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        return ((java.sql.Date) value).toLocalDate();
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
