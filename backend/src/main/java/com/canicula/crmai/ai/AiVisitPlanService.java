package com.canicula.crmai.ai;

import com.canicula.crmai.activity.ActivityCreateRequest;
import com.canicula.crmai.activity.ActivityResponse;
import com.canicula.crmai.activity.ActivityService;
import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.contact.ContactResponse;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.PreparedStatement;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiVisitPlanService {

    private final AiContextService aiContextService;
    private final ActivityService activityService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    AiVisitPlanService(
            AiContextService aiContextService,
            ActivityService activityService,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        this.aiContextService = aiContextService;
        this.activityService = activityService;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AiVisitPlanResponse generate(AiVisitPlanGenerateRequest request, Long userId) {
        AiOpportunityContextResponse context = aiContextService.opportunityContext(request.opportunity_id(), userId);
        AiVisitPlanContent content = buildContent(context);
        Long planId = insertPlan(content, userId);
        return findOwnedPlan(planId, userId);
    }

    public List<AiVisitPlanResponse> list(Long userId, String status, Long opportunityId) {
        if (hasText(status) && opportunityId != null) {
            return jdbcTemplate.query(
                    """
                    select *
                    from ai_visit_plans
                    where created_by = ?
                      and status = ?
                      and opportunity_id = ?
                    order by created_at desc, id desc
                    """,
                    (rs, rowNum) -> mapPlan(rs),
                    userId,
                    status,
                    opportunityId);
        }
        if (hasText(status)) {
            return jdbcTemplate.query(
                    """
                    select *
                    from ai_visit_plans
                    where created_by = ?
                      and status = ?
                    order by created_at desc, id desc
                    """,
                    (rs, rowNum) -> mapPlan(rs),
                    userId,
                    status);
        }
        if (opportunityId != null) {
            return jdbcTemplate.query(
                    """
                    select *
                    from ai_visit_plans
                    where created_by = ?
                      and opportunity_id = ?
                    order by created_at desc, id desc
                    """,
                    (rs, rowNum) -> mapPlan(rs),
                    userId,
                    opportunityId);
        }
        return jdbcTemplate.query(
                """
                select *
                from ai_visit_plans
                where created_by = ?
                order by created_at desc, id desc
                """,
                (rs, rowNum) -> mapPlan(rs),
                userId);
    }

    @Transactional
    public AiVisitPlanResponse confirm(Long planId, Long userId, String traceId) {
        AiVisitPlanResponse plan = findOwnedPlan(planId, userId);
        AiVisitPlanContent content = findOwnedContent(planId, userId);
        if (!"pending_confirmation".equals(plan.status())) {
            throw new BusinessRuleException("只有待确认拜访计划可以确认写入");
        }
        claimPlanForWriting(planId, userId);
        ActivityResponse activity = activityService.create(new ActivityCreateRequest(
                plan.account_id(),
                plan.opportunity_id(),
                "AI拜访计划-" + plan.opportunity_name(),
                "customer_visit",
                "planned",
                "pending",
                OffsetDateTime.now(),
                OffsetDateTime.now().plusDays(3),
                content.owner_department_id(),
                content.owner_user_id(),
                joinItems(plan.agenda(), "AI助手建议安排客户拜访，确认目标、议程和关键问题。"),
                null,
                joinItems(plan.expected_outcomes(), "形成下一步推进结论"),
                joinItems(plan.follow_up_actions(), "安排评审并记录客户反馈"),
                joinItems(plan.questions(), null),
                false,
                null,
                "ai_visit_plan",
                "来源AI拜访计划：" + plan.id(),
                List.of(),
                List.of(),
                hasRiskQuestion(plan.questions()) ? List.of("ai_detected_risk") : List.of()), userId);
        insertWriteLog(plan.id(), "visit_plan_confirm", "activity", activity.id(), "success", null, userId, traceId);
        jdbcTemplate.update(
                """
                update ai_visit_plans
                set status = 'confirmed',
                    write_activity_id = ?,
                    confirmed_by = ?,
                    confirmed_at = current_timestamp
                where id = ?
                  and created_by = ?
                  and status = 'writing'
                """,
                activity.id(),
                userId,
                planId,
                userId);
        return findOwnedPlan(planId, userId);
    }

    @Transactional
    public AiVisitPlanResponse reject(Long planId, Long userId, String reason, String traceId) {
        AiVisitPlanResponse plan = findOwnedPlan(planId, userId);
        if (!"pending_confirmation".equals(plan.status())) {
            throw new BusinessRuleException("只有待确认拜访计划可以驳回");
        }
        int updatedRows = jdbcTemplate.update(
                """
                update ai_visit_plans
                set status = 'rejected',
                    rejection_reason = ?,
                    rejected_by = ?,
                    rejected_at = current_timestamp
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                hasText(reason) ? reason.strip() : "用户驳回AI拜访计划",
                userId,
                planId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("拜访计划已被处理，请刷新后重试");
        }
        insertWriteLog(plan.id(), "visit_plan_reject", "visit_plan", plan.id(), "success", null, userId, traceId);
        return findOwnedPlan(planId, userId);
    }

    private AiVisitPlanContent buildContent(AiOpportunityContextResponse context) {
        OpportunityResponse opportunity = context.opportunity();
        List<ActivityResponse> activities = context.recent_activities();
        List<ContactResponse> contacts = context.contacts();
        List<String> objectives = visitObjectives(opportunity, activities);
        List<String> attendees = attendees(contacts);
        List<String> agenda = agenda(opportunity, activities);
        List<String> materials = materials(opportunity);
        List<String> questions = questions(opportunity, contacts, activities);
        List<String> outcomes = expectedOutcomes(opportunity);
        List<String> followUps = followUpActions(opportunity, activities);
        List<AiEvidenceItem> evidence = context.evidence();
        return new AiVisitPlanContent(
                opportunity.id(),
                opportunity.account_id(),
                opportunity.owner_department_id(),
                opportunity.owner_user_id(),
                opportunity.opportunity_name(),
                context.account().account_name(),
                objectives,
                attendees,
                agenda,
                materials,
                questions,
                outcomes,
                followUps,
                evidence,
                activities.size(),
                evidence.size());
    }

    private List<String> visitObjectives(OpportunityResponse opportunity, List<ActivityResponse> activities) {
        List<String> objectives = new ArrayList<>();
        objectives.add("明确AI助手试点范围、ROI材料和下一步评审安排。");
        if (hasText(opportunity.current_progress())) {
            objectives.add("围绕当前进展复盘客户认可点：" + opportunity.current_progress());
        }
        activities.stream()
                .filter(activity -> hasText(activity.conclusion()) || hasText(activity.customer_feedback()))
                .findFirst()
                .ifPresent(activity -> objectives.add("验证上一轮沟通结论：" + firstText(activity.conclusion(), activity.customer_feedback())));
        return dedupe(objectives);
    }

    private List<String> attendees(List<ContactResponse> contacts) {
        if (contacts.isEmpty()) {
            return List.of("证据不足：暂无联系人，需要补齐业务、技术、采购和财务参会人。");
        }
        return contacts.stream()
                .map(contact -> contact.name()
                        + " / "
                        + firstText(contact.department(), contact.title(), "未记录部门职务")
                        + " / 角色："
                        + roleText(contact.project_roles()))
                .filter(AiVisitPlanService::hasText)
                .limit(6)
                .toList();
    }

    private List<String> agenda(OpportunityResponse opportunity, List<ActivityResponse> activities) {
        List<String> items = new ArrayList<>();
        items.add("复盘当前阶段与客户反馈，确认AI助手试点范围。");
        items.add("对齐预算、财务审批路径和技术集成边界。");
        activities.stream()
                .filter(activity -> hasText(activity.next_plan()))
                .findFirst()
                .ifPresent(activity -> items.add("延续上一轮下一步计划：" + activity.next_plan()));
        if (hasText(opportunity.next_plan())) {
            items.add("确认商机下一步计划：" + opportunity.next_plan());
        }
        return dedupe(items);
    }

    private List<String> materials(OpportunityResponse opportunity) {
        List<String> items = new ArrayList<>();
        items.add("AI助手试点范围说明");
        items.add("ROI测算材料");
        items.add("实施排期与数据迁移清单");
        if (hasText(opportunity.potential_point())) {
            items.add("客户痛点与价值映射：" + opportunity.potential_point());
        }
        return dedupe(items);
    }

    private List<String> questions(
            OpportunityResponse opportunity,
            List<ContactResponse> contacts,
            List<ActivityResponse> activities) {
        List<String> items = new ArrayList<>();
        items.add("财务审批人是谁，财务审批材料和预算口径是否已经明确？");
        items.add("AI助手试点成功标准、上线时间和验收责任人分别是谁？");
        if (contacts.stream().noneMatch(contact -> containsAny(contact.department(), "技术", "IT")
                || containsAny(contact.title(), "技术", "IT", "架构"))) {
            items.add("技术集成、数据边界和安全要求由谁确认？");
        }
        if (hasText(opportunity.risk_description())) {
            items.add("当前风险如何消除：" + opportunity.risk_description());
        }
        activities.stream()
                .filter(activity -> hasText(activity.risk_description()))
                .findFirst()
                .ifPresent(activity -> items.add("上一轮行动风险如何闭环：" + activity.risk_description()));
        return dedupe(items);
    }

    private List<String> expectedOutcomes(OpportunityResponse opportunity) {
        List<String> items = new ArrayList<>();
        items.add("形成下一步评审安排、责任人和时间表。");
        items.add("确认AI助手试点范围、预算审批材料和客户侧验收标准。");
        if (hasText(opportunity.expected_close_date() == null ? null : String.valueOf(opportunity.expected_close_date()))) {
            items.add("校准预计成交日期：" + opportunity.expected_close_date());
        }
        return dedupe(items);
    }

    private List<String> followUpActions(OpportunityResponse opportunity, List<ActivityResponse> activities) {
        List<String> items = new ArrayList<>();
        activities.stream()
                .filter(activity -> hasText(activity.next_plan()))
                .findFirst()
                .ifPresent(activity -> items.add(activity.next_plan()));
        if (hasText(opportunity.next_plan())) {
            items.add(opportunity.next_plan());
        }
        items.add("拜访后24小时内整理会议纪要，安排业务、技术和财务评审并记录反馈。");
        return dedupe(items);
    }

    private Long insertPlan(AiVisitPlanContent content, Long userId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into ai_visit_plans (
                        opportunity_id, account_id, status, plan_json,
                        source_activity_count, source_evidence_count, created_by
                    )
                    values (?, ?, 'pending_confirmation', ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, content.opportunity_id());
            statement.setObject(2, content.account_id());
            statement.setString(3, writeJson(content));
            statement.setObject(4, content.source_activity_count());
            statement.setObject(5, content.source_evidence_count());
            statement.setObject(6, userId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private AiVisitPlanResponse findOwnedPlan(Long planId, Long userId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from ai_visit_plans
                where id = ?
                  and created_by = ?
                """,
                (rs, rowNum) -> mapPlan(rs),
                planId,
                userId);
    }

    private AiVisitPlanContent findOwnedContent(Long planId, Long userId) {
        return readContent(jdbcTemplate.queryForObject(
                "select plan_json from ai_visit_plans where id = ? and created_by = ?",
                String.class,
                planId,
                userId));
    }

    private AiVisitPlanResponse mapPlan(java.sql.ResultSet rs) throws java.sql.SQLException {
        AiVisitPlanContent content = readContent(rs.getString("plan_json"));
        return new AiVisitPlanResponse(
                rs.getLong("id"),
                rs.getString("status"),
                content.opportunity_id(),
                content.account_id(),
                content.opportunity_name(),
                content.account_name(),
                content.visit_objectives(),
                content.attendees(),
                content.agenda(),
                content.materials(),
                content.questions(),
                content.expected_outcomes(),
                content.follow_up_actions(),
                content.evidence(),
                rs.getInt("source_activity_count"),
                rs.getInt("source_evidence_count"),
                nullableLong(rs.getObject("write_activity_id")),
                rs.getString("rejection_reason"),
                nullableOffsetDateTime(rs.getObject("created_at")),
                nullableOffsetDateTime(rs.getObject("confirmed_at")),
                nullableOffsetDateTime(rs.getObject("rejected_at")));
    }

    private void claimPlanForWriting(Long planId, Long userId) {
        int updatedRows = jdbcTemplate.update(
                """
                update ai_visit_plans
                set status = 'writing'
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                planId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("拜访计划已被处理，请刷新后重试");
        }
    }

    private void insertWriteLog(
            Long planId,
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
                errorMessage == null ? null : errorMessage + " (visit_plan_id=" + planId + ")",
                userId,
                traceId);
    }

    private AiVisitPlanContent readContent(String json) {
        try {
            return objectMapper.readValue(json, AiVisitPlanContent.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI拜访计划内容解析失败", exception);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI拜访计划内容序列化失败", exception);
        }
    }

    private static List<String> dedupe(List<String> values) {
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String value : values) {
            if (hasText(value)) {
                unique.add(value.strip());
            }
        }
        return unique.stream().toList();
    }

    private static String roleText(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return "未记录项目角色";
        }
        return String.join("、", roles);
    }

    private static boolean hasRiskQuestion(List<String> questions) {
        return questions.stream().anyMatch(question -> containsAny(question, "风险", "审批", "预算", "安全"));
    }

    private static String joinItems(List<String> items, String fallback) {
        List<String> values = items.stream().filter(AiVisitPlanService::hasText).limit(5).toList();
        if (values.isEmpty()) {
            return fallback;
        }
        return String.join("；", values);
    }

    private static String firstText(String... values) {
        for (String value : values) {
            if (hasText(value)) {
                return value.strip();
            }
        }
        return "";
    }

    private static boolean containsAny(String value, String... needles) {
        if (value == null) {
            return false;
        }
        String normalized = value.toLowerCase();
        for (String needle : needles) {
            if (normalized.contains(needle.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static Long nullableLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return null;
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
