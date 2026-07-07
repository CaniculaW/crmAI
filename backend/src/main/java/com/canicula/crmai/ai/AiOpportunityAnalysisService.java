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
public class AiOpportunityAnalysisService {

    private final AiContextService aiContextService;
    private final ActivityService activityService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    AiOpportunityAnalysisService(
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
    public AiOpportunityAnalysisResponse generate(AiOpportunityAnalysisGenerateRequest request, Long userId) {
        AiOpportunityContextResponse context = aiContextService.opportunityContext(request.opportunity_id(), userId);
        AiOpportunityAnalysisContent content = buildContent(context);
        Long analysisId = insertAnalysis(content, userId);
        return findOwnedAnalysis(analysisId, userId);
    }

    public List<AiOpportunityAnalysisResponse> list(Long userId, String status, Long opportunityId) {
        if (hasText(status) && opportunityId != null) {
            return jdbcTemplate.query(
                    """
                    select *
                    from ai_opportunity_analyses
                    where created_by = ?
                      and status = ?
                      and opportunity_id = ?
                    order by created_at desc, id desc
                    """,
                    (rs, rowNum) -> mapAnalysis(rs),
                    userId,
                    status,
                    opportunityId);
        }
        if (hasText(status)) {
            return jdbcTemplate.query(
                    """
                    select *
                    from ai_opportunity_analyses
                    where created_by = ?
                      and status = ?
                    order by created_at desc, id desc
                    """,
                    (rs, rowNum) -> mapAnalysis(rs),
                    userId,
                    status);
        }
        if (opportunityId != null) {
            return jdbcTemplate.query(
                    """
                    select *
                    from ai_opportunity_analyses
                    where created_by = ?
                      and opportunity_id = ?
                    order by created_at desc, id desc
                    """,
                    (rs, rowNum) -> mapAnalysis(rs),
                    userId,
                    opportunityId);
        }
        return jdbcTemplate.query(
                """
                select *
                from ai_opportunity_analyses
                where created_by = ?
                order by created_at desc, id desc
                """,
                (rs, rowNum) -> mapAnalysis(rs),
                userId);
    }

    @Transactional
    public AiOpportunityAnalysisResponse confirm(Long analysisId, Long userId, String traceId) {
        AiOpportunityAnalysisResponse analysis = findOwnedAnalysis(analysisId, userId);
        AiOpportunityAnalysisContent content = findOwnedContent(analysisId, userId);
        if (!"pending_confirmation".equals(analysis.status())) {
            throw new BusinessRuleException("只有待确认商机分析可以确认写入");
        }
        claimAnalysisForWriting(analysisId, userId);
        ActivityResponse activity = activityService.create(new ActivityCreateRequest(
                analysis.account_id(),
                analysis.opportunity_id(),
                "AI商机分析-" + analysis.opportunity_name(),
                "opportunity_analysis",
                "planned",
                "pending",
                OffsetDateTime.now(),
                OffsetDateTime.now().plusDays(3),
                content.owner_department_id(),
                content.owner_user_id(),
                "AI根据商机上下文生成作战分析，用户确认后转为下一步行动。",
                null,
                joinItems(analysis.win_factors(), "暂无明确赢单因素"),
                joinItems(analysis.next_actions(), "补齐关键人关系并确认下一步推进计划"),
                joinItems(analysis.risks(), null),
                false,
                null,
                "ai_opportunity_analysis",
                "来源AI商机分析：" + analysis.id(),
                List.of(),
                List.of(),
                hasMeaningfulRisk(analysis.risks()) ? List.of("ai_detected_risk") : List.of()), userId);
        insertWriteLog(analysis.id(), "opportunity_analysis_confirm", "activity", activity.id(), "success", null, userId, traceId);
        jdbcTemplate.update(
                """
                update ai_opportunity_analyses
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
                analysisId,
                userId);
        return findOwnedAnalysis(analysisId, userId);
    }

    @Transactional
    public AiOpportunityAnalysisResponse reject(Long analysisId, Long userId, String reason, String traceId) {
        AiOpportunityAnalysisResponse analysis = findOwnedAnalysis(analysisId, userId);
        if (!"pending_confirmation".equals(analysis.status())) {
            throw new BusinessRuleException("只有待确认商机分析可以驳回");
        }
        int updatedRows = jdbcTemplate.update(
                """
                update ai_opportunity_analyses
                set status = 'rejected',
                    rejection_reason = ?,
                    rejected_by = ?,
                    rejected_at = current_timestamp
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                hasText(reason) ? reason.strip() : "用户驳回AI商机分析",
                userId,
                analysisId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("商机分析已被处理，请刷新后重试");
        }
        insertWriteLog(analysis.id(), "opportunity_analysis_reject", "opportunity_analysis", analysis.id(), "success", null, userId, traceId);
        return findOwnedAnalysis(analysisId, userId);
    }

    private AiOpportunityAnalysisContent buildContent(AiOpportunityContextResponse context) {
        OpportunityResponse opportunity = context.opportunity();
        List<ActivityResponse> activities = context.recent_activities();
        List<ContactResponse> contacts = context.contacts();
        List<String> stageHealth = new ArrayList<>();
        stageHealth.add("当前阶段 " + safe(opportunity.stage()) + "，状态 " + safe(opportunity.status()) + "，预计成交日 " + safe(String.valueOf(opportunity.expected_close_date())) + "。");
        if (hasText(opportunity.current_progress())) {
            stageHealth.add("当前进展：" + opportunity.current_progress());
        }
        List<String> relationshipGaps = relationshipGaps(contacts, opportunity);
        List<String> risks = risks(opportunity, activities);
        List<String> blockers = blockers(opportunity, activities, risks);
        List<String> winFactors = winFactors(opportunity, contacts, activities);
        List<String> nextActions = nextActions(opportunity, relationshipGaps, blockers, activities);
        List<AiEvidenceItem> evidence = context.evidence();
        return new AiOpportunityAnalysisContent(
                opportunity.id(),
                opportunity.account_id(),
                opportunity.owner_department_id(),
                opportunity.owner_user_id(),
                opportunity.opportunity_name(),
                context.account().account_name(),
                dedupe(stageHealth),
                relationshipGaps,
                risks,
                blockers,
                winFactors,
                nextActions,
                evidence,
                activities.size(),
                evidence.size());
    }

    private List<String> relationshipGaps(List<ContactResponse> contacts, OpportunityResponse opportunity) {
        List<String> gaps = new ArrayList<>();
        if (contacts.isEmpty()) {
            gaps.add("证据不足：暂无联系人，需要补齐业务、技术、采购和财务角色。");
            return gaps;
        }
        boolean hasFinance = contacts.stream().anyMatch(contact -> containsAny(contact.department(), "财务", "采购")
                || containsAny(contact.title(), "财务", "采购", "CFO")
                || contact.project_roles().stream().anyMatch(role -> containsAny(role, "财务", "采购", "预算")));
        if (!hasFinance) {
            gaps.add("财务审批人未明确，需要补齐预算、采购或财务角色。");
        }
        boolean hasDecisionMaker = contacts.stream().anyMatch(contact -> containsAny(contact.contact_type(), "decision")
                || containsAny(contact.decision_influence(), "high", "决策")
                || contact.project_roles().stream().anyMatch(role -> containsAny(role, "决策", "负责人")));
        if (!hasDecisionMaker) {
            gaps.add("关键决策人证据不足，需要确认业务决策人与影响人。");
        }
        if (gaps.isEmpty()) {
            gaps.add("关键业务负责人已沉淀，但仍需持续验证采购、财务和技术影响链。");
        }
        if (hasText(opportunity.next_plan()) && containsAny(opportunity.next_plan(), "审批", "预算")) {
            gaps.add("下一步涉及审批链路，需确认财务审批人和预算口径。");
        }
        return dedupe(gaps);
    }

    private List<String> risks(OpportunityResponse opportunity, List<ActivityResponse> activities) {
        List<String> risks = new ArrayList<>();
        if (hasText(opportunity.risk_description())) {
            risks.add(opportunity.risk_description());
        }
        for (ActivityResponse activity : activities) {
            if (hasText(activity.risk_description())) {
                risks.add(activity.risk_description());
            }
        }
        if (hasText(opportunity.risk_status()) && !"normal".equals(opportunity.risk_status())) {
            risks.add("商机风险状态为 " + opportunity.risk_status() + "，需要销售负责人持续复盘。");
        }
        if (risks.isEmpty()) {
            risks.add("暂无明确风险证据，保持常规跟进和阶段推进。");
        }
        return dedupe(risks);
    }

    private List<String> blockers(OpportunityResponse opportunity, List<ActivityResponse> activities, List<String> risks) {
        List<String> blockers = new ArrayList<>();
        String combined = String.join("；", risks) + "；" + safe(opportunity.next_plan());
        if (containsAny(combined, "预算", "审批", "财务")) {
            blockers.add("预算审批链路是当前阻塞点，需要确认财务审批人、审批材料和预算口径。");
        }
        boolean hasCompletedActivity = activities.stream().anyMatch(activity -> "completed".equals(activity.activity_status()));
        if (!hasCompletedActivity) {
            blockers.add("缺少近期已完成行动证据，需要补齐客户沟通结果后再判断成交把握。");
        }
        if (blockers.isEmpty()) {
            blockers.add("暂无明确阻塞点，建议继续按下一步行动推进并记录客户反馈。");
        }
        return dedupe(blockers);
    }

    private List<String> winFactors(
            OpportunityResponse opportunity,
            List<ContactResponse> contacts,
            List<ActivityResponse> activities) {
        List<String> factors = new ArrayList<>();
        if (hasText(opportunity.potential_point())) {
            factors.add("客户痛点：" + opportunity.potential_point());
        }
        if (hasText(opportunity.current_progress())) {
            factors.add("推进基础：" + opportunity.current_progress());
        }
        contacts.stream()
                .filter(contact -> containsAny(contact.attitude(), "positive", "认可", "支持"))
                .findFirst()
                .ifPresent(contact -> factors.add(contact.name() + "态度积极，" + firstText(contact.last_communication_summary(), contact.remark(), "可作为内部推动人。")));
        activities.stream()
                .filter(activity -> hasText(activity.conclusion()) || hasText(activity.customer_feedback()))
                .findFirst()
                .ifPresent(activity -> factors.add(firstText(activity.conclusion(), activity.customer_feedback())));
        if (factors.isEmpty()) {
            factors.add("证据不足：尚未沉淀明确赢单因素，需要补齐痛点、价值和关键人反馈。");
        }
        return dedupe(factors);
    }

    private List<String> nextActions(
            OpportunityResponse opportunity,
            List<String> relationshipGaps,
            List<String> blockers,
            List<ActivityResponse> activities) {
        List<String> actions = new ArrayList<>();
        if (relationshipGaps.stream().anyMatch(item -> containsAny(item, "财务", "预算", "采购"))
                || blockers.stream().anyMatch(item -> containsAny(item, "预算", "审批", "财务"))) {
            actions.add("确认财务审批人、预算口径和审批材料清单。");
        }
        activities.stream()
                .filter(activity -> hasText(activity.next_plan()))
                .findFirst()
                .ifPresent(activity -> actions.add(activity.next_plan()));
        if (hasText(opportunity.next_plan())) {
            actions.add(opportunity.next_plan());
        }
        if (actions.isEmpty()) {
            actions.add("安排下一次客户沟通，补齐决策链、风险点和成交时间表。");
        }
        return dedupe(actions);
    }

    private Long insertAnalysis(AiOpportunityAnalysisContent content, Long userId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into ai_opportunity_analyses (
                        opportunity_id, account_id, status, analysis_json,
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

    private AiOpportunityAnalysisResponse findOwnedAnalysis(Long analysisId, Long userId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from ai_opportunity_analyses
                where id = ?
                  and created_by = ?
                """,
                (rs, rowNum) -> mapAnalysis(rs),
                analysisId,
                userId);
    }

    private AiOpportunityAnalysisResponse mapAnalysis(java.sql.ResultSet rs) throws java.sql.SQLException {
        AiOpportunityAnalysisContent content = readContent(rs.getString("analysis_json"));
        return new AiOpportunityAnalysisResponse(
                rs.getLong("id"),
                rs.getString("status"),
                content.opportunity_id(),
                content.account_id(),
                content.opportunity_name(),
                content.account_name(),
                content.stage_health(),
                content.relationship_gaps(),
                content.risks(),
                content.blockers(),
                content.win_factors(),
                content.next_actions(),
                content.evidence(),
                rs.getInt("source_activity_count"),
                rs.getInt("source_evidence_count"),
                nullableLong(rs.getObject("write_activity_id")),
                rs.getString("rejection_reason"),
                nullableOffsetDateTime(rs.getObject("created_at")),
                nullableOffsetDateTime(rs.getObject("confirmed_at")),
                nullableOffsetDateTime(rs.getObject("rejected_at")));
    }

    private void claimAnalysisForWriting(Long analysisId, Long userId) {
        int updatedRows = jdbcTemplate.update(
                """
                update ai_opportunity_analyses
                set status = 'writing'
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                analysisId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("商机分析已被处理，请刷新后重试");
        }
    }

    private AiOpportunityAnalysisContent findOwnedContent(Long analysisId, Long userId) {
        return readContent(jdbcTemplate.queryForObject(
                "select analysis_json from ai_opportunity_analyses where id = ? and created_by = ?",
                String.class,
                analysisId,
                userId));
    }

    private void insertWriteLog(
            Long analysisId,
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
                errorMessage == null ? null : errorMessage + " (analysis_id=" + analysisId + ")",
                userId,
                traceId);
    }

    private AiOpportunityAnalysisContent readContent(String json) {
        try {
            return objectMapper.readValue(json, AiOpportunityAnalysisContent.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI商机分析内容解析失败", exception);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI商机分析内容序列化失败", exception);
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

    private static boolean hasMeaningfulRisk(List<String> risks) {
        return risks.stream().anyMatch(risk -> !risk.contains("暂无明确风险"));
    }

    private static String joinItems(List<String> items, String fallback) {
        List<String> values = items.stream().filter(AiOpportunityAnalysisService::hasText).limit(4).toList();
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

    private static String safe(String value) {
        return hasText(value) ? value.strip() : "未记录";
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
