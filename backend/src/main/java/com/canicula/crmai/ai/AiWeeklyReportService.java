package com.canicula.crmai.ai;

import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.activity.ActivityCreateRequest;
import com.canicula.crmai.activity.ActivityListFilter;
import com.canicula.crmai.activity.ActivityResponse;
import com.canicula.crmai.activity.ActivityService;
import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.opportunity.OpportunityService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.PreparedStatement;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiWeeklyReportService {

    private static final TypeReference<List<Long>> LONG_LIST_TYPE = new TypeReference<>() {
    };

    private final OpportunityService opportunityService;
    private final AccountService accountService;
    private final ActivityService activityService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    AiWeeklyReportService(
            OpportunityService opportunityService,
            AccountService accountService,
            ActivityService activityService,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        this.opportunityService = opportunityService;
        this.accountService = accountService;
        this.activityService = activityService;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AiWeeklyReportResponse generate(AiWeeklyReportGenerateRequest request, Long userId) {
        LocalDate weekStart = request.week_start() == null ? currentWeekStart() : request.week_start();
        LocalDate weekEnd = request.week_end() == null ? weekStart.plusDays(6) : request.week_end();
        List<ActivityResponse> weeklyActivities = activityService.readableList(
                userId,
                new ActivityListFilter(
                        null,
                        null,
                        null,
                        userId,
                        null,
                        null,
                        "completed",
                        null,
                        null,
                        weekStart.atStartOfDay().atOffset(OffsetDateTime.now().getOffset()),
                        weekEnd.plusDays(1).atStartOfDay().minusNanos(1).atOffset(OffsetDateTime.now().getOffset()),
                        null,
                        true))
                .stream()
                .filter(activity -> activity.opportunity_id() != null)
                .toList();
        AiWeeklyReportContent content = buildContent(weeklyActivities, userId);
        Long reportId = insertReport(weekStart, weekEnd, content, userId);
        return findOwnedReport(reportId, userId);
    }

    public List<AiWeeklyReportResponse> list(Long userId, String status) {
        if (status == null || status.isBlank()) {
            return jdbcTemplate.query(
                    """
                    select *
                    from ai_weekly_reports
                    where created_by = ?
                    order by created_at desc, id desc
                    """,
                    (rs, rowNum) -> mapReport(rs),
                    userId);
        }
        return jdbcTemplate.query(
                """
                select *
                from ai_weekly_reports
                where created_by = ?
                  and status = ?
                order by created_at desc, id desc
                """,
                (rs, rowNum) -> mapReport(rs),
                userId,
                status);
    }

    @Transactional
    public AiWeeklyReportResponse confirm(Long reportId, Long userId, String traceId) {
        AiWeeklyReportResponse report = findOwnedReport(reportId, userId);
        if (!"pending_confirmation".equals(report.status())) {
            throw new BusinessRuleException("只有待确认周报可以确认写入");
        }
        claimReportForWriting(reportId, userId);
        List<Long> activityIds = new ArrayList<>();
        for (AiOpportunityWeeklyProgress progress : report.opportunity_progress()) {
            ActivityResponse activity = activityService.create(new ActivityCreateRequest(
                    progress.account_id(),
                    progress.opportunity_id(),
                    "AI周进展-" + progress.opportunity_name(),
                    "weekly_review",
                    "completed",
                    hasText(progress.risk_summary()) ? "risk_found" : "milestone_completed",
                    report.week_start_date().plusDays(1).atTime(17, 0).atOffset(OffsetDateTime.now().getOffset()),
                    report.week_end_date().plusDays(3).atTime(10, 0).atOffset(OffsetDateTime.now().getOffset()),
                    progress.owner_department_id(),
                    progress.owner_user_id(),
                    "AI根据本周销售行动生成周进展草稿，用户确认后写入。",
                    null,
                    progress.summary(),
                    progress.next_week_plan(),
                    progress.risk_summary(),
                    true,
                    report.week_start_date().toString(),
                    "ai_weekly_report",
                    "来源AI周报：" + report.id(),
                    List.of(),
                    List.of(),
                    hasText(progress.risk_summary()) ? List.of("ai_detected_risk") : List.of()), userId);
            activityIds.add(activity.id());
            insertWriteLog(report.id(), "weekly_report_confirm", "activity", activity.id(), "success", null, userId, traceId);
        }
        jdbcTemplate.update(
                """
                update ai_weekly_reports
                set status = 'confirmed',
                    write_activity_ids = ?,
                    confirmed_by = ?,
                    confirmed_at = current_timestamp
                where id = ?
                  and created_by = ?
                  and status = 'writing'
                """,
                writeJson(activityIds),
                userId,
                reportId,
                userId);
        return findOwnedReport(reportId, userId);
    }

    @Transactional
    public AiWeeklyReportResponse reject(Long reportId, Long userId, String reason, String traceId) {
        AiWeeklyReportResponse report = findOwnedReport(reportId, userId);
        if (!"pending_confirmation".equals(report.status())) {
            throw new BusinessRuleException("只有待确认周报可以驳回");
        }
        int updatedRows = jdbcTemplate.update(
                """
                update ai_weekly_reports
                set status = 'rejected',
                    rejection_reason = ?,
                    rejected_by = ?,
                    rejected_at = current_timestamp
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                hasText(reason) ? reason.strip() : "用户驳回AI周报",
                userId,
                reportId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("周报已被处理，请刷新后重试");
        }
        insertWriteLog(report.id(), "weekly_report_reject", "weekly_report", report.id(), "success", null, userId, traceId);
        return findOwnedReport(reportId, userId);
    }

    private AiWeeklyReportContent buildContent(List<ActivityResponse> weeklyActivities, Long userId) {
        Map<Long, List<ActivityResponse>> groupedActivities = weeklyActivities.stream()
                .collect(Collectors.groupingBy(ActivityResponse::opportunity_id));
        List<AiOpportunityWeeklyProgress> opportunityProgress = groupedActivities.entrySet().stream()
                .map(entry -> opportunityProgress(entry.getKey(), entry.getValue(), userId))
                .toList();
        List<AiEvidenceItem> evidence = opportunityProgress.stream()
                .flatMap(progress -> progress.evidence().stream())
                .toList();
        int sourceActivityCount = weeklyActivities.size();
        AiWeeklyPersonalSummary summary = new AiWeeklyPersonalSummary(
                "本周跟进 " + opportunityProgress.size() + " 个商机，沉淀 " + sourceActivityCount + " 条有效行动。",
                uniqueNonBlank(opportunityProgress.stream().map(AiOpportunityWeeklyProgress::summary).toList()),
                uniqueNonBlank(opportunityProgress.stream().map(AiOpportunityWeeklyProgress::risk_summary).toList()),
                uniqueNonBlank(opportunityProgress.stream().map(AiOpportunityWeeklyProgress::next_week_plan).toList()));
        return new AiWeeklyReportContent(summary, opportunityProgress, evidence, sourceActivityCount);
    }

    private AiOpportunityWeeklyProgress opportunityProgress(Long opportunityId, List<ActivityResponse> activities, Long userId) {
        OpportunityResponse opportunity = opportunityService.readableDetail(opportunityId, userId);
        AccountResponse account = accountService.readableDetail(opportunity.account_id(), userId);
        List<AiEvidenceItem> evidence = activities.stream()
                .map(this::activityEvidence)
                .toList();
        return new AiOpportunityWeeklyProgress(
                opportunity.id(),
                opportunity.account_id(),
                opportunity.owner_department_id(),
                opportunity.owner_user_id(),
                opportunity.opportunity_name(),
                account.account_name(),
                (long) activities.size(),
                joinItemText(activities, "本周无已完成行动", FieldSelector.CONCLUSION),
                joinItemText(activities, "", FieldSelector.RISK),
                joinItemText(activities, firstText(opportunity.next_plan(), "下周继续推进客户确认"), FieldSelector.NEXT_PLAN),
                evidence);
    }

    private AiEvidenceItem activityEvidence(ActivityResponse item) {
        return new AiEvidenceItem(
                "activity",
                item.id(),
                item.subject(),
                firstText(item.conclusion(), item.next_plan(), item.risk_description()),
                item.activity_time(),
                "/activities?activity_id=" + item.id());
    }

    private Long insertReport(LocalDate weekStart, LocalDate weekEnd, AiWeeklyReportContent content, Long userId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into ai_weekly_reports (
                        week_start_date, week_end_date, status, report_json,
                        source_activity_count, created_by
                    )
                    values (?, ?, 'pending_confirmation', ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, weekStart);
            statement.setObject(2, weekEnd);
            statement.setString(3, writeJson(content));
            statement.setObject(4, content.source_activity_count());
            statement.setObject(5, userId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private AiWeeklyReportResponse findOwnedReport(Long reportId, Long userId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from ai_weekly_reports
                where id = ?
                  and created_by = ?
                """,
                (rs, rowNum) -> mapReport(rs),
                reportId,
                userId);
    }

    private AiWeeklyReportResponse mapReport(java.sql.ResultSet rs) throws java.sql.SQLException {
        AiWeeklyReportContent content = readContent(rs.getString("report_json"));
        return new AiWeeklyReportResponse(
                rs.getLong("id"),
                rs.getString("status"),
                rs.getObject("week_start_date", LocalDate.class),
                rs.getObject("week_end_date", LocalDate.class),
                content.personal_summary(),
                content.opportunity_progress(),
                content.evidence(),
                rs.getInt("source_activity_count"),
                readLongList(rs.getString("write_activity_ids")),
                rs.getString("rejection_reason"),
                nullableOffsetDateTime(rs.getObject("created_at")),
                nullableOffsetDateTime(rs.getObject("confirmed_at")),
                nullableOffsetDateTime(rs.getObject("rejected_at")));
    }

    private void claimReportForWriting(Long reportId, Long userId) {
        int updatedRows = jdbcTemplate.update(
                """
                update ai_weekly_reports
                set status = 'writing'
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                reportId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("周报已被处理，请刷新后重试");
        }
    }

    private void insertWriteLog(
            Long reportId,
            String operation,
            String objectType,
            Long objectId,
            String status,
            String errorMessage,
            Long userId,
            String traceId) {
        jdbcTemplate.update(
                """
                insert into ai_write_logs (
                    draft_id, input_record_id, operation, object_type,
                    object_id, status, error_message, created_by, trace_id
                )
                values (null, null, ?, ?, ?, ?, ?, ?, ?)
                """,
                operation,
                objectType,
                objectId,
                status,
                errorMessage == null ? null : errorMessage + " (report_id=" + reportId + ")",
                userId,
                traceId);
    }

    private AiWeeklyReportContent readContent(String json) {
        try {
            return objectMapper.readValue(json, AiWeeklyReportContent.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI周报内容解析失败", exception);
        }
    }

    private List<Long> readLongList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, LONG_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI周报写入结果解析失败", exception);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI周报内容序列化失败", exception);
        }
    }

    private static String joinItemText(
            List<ActivityResponse> items,
            String fallback,
            FieldSelector selector) {
        List<String> values = items.stream()
                .map(selector::value)
                .filter(AiWeeklyReportService::hasText)
                .map(String::strip)
                .distinct()
                .limit(4)
                .toList();
        if (values.isEmpty()) {
            return fallback;
        }
        return String.join("；", values);
    }

    private static List<String> uniqueNonBlank(List<String> values) {
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String value : values) {
            if (hasText(value)) {
                unique.add(value.strip());
            }
        }
        return unique.stream().toList();
    }

    private static String firstText(String... values) {
        for (String value : values) {
            if (hasText(value)) {
                return value.strip();
            }
        }
        return "";
    }

    private static LocalDate currentWeekStart() {
        return LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
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

    private enum FieldSelector {
        CONCLUSION {
            @Override
            String value(ActivityResponse item) {
                return item.conclusion();
            }
        },
        RISK {
            @Override
            String value(ActivityResponse item) {
                return item.risk_description();
            }
        },
        NEXT_PLAN {
            @Override
            String value(ActivityResponse item) {
                return item.next_plan();
            }
        };

        abstract String value(ActivityResponse item);
    }
}
