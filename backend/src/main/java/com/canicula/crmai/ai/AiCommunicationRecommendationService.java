package com.canicula.crmai.ai;

import com.canicula.crmai.activity.ActivityCreateRequest;
import com.canicula.crmai.activity.ActivityResponse;
import com.canicula.crmai.activity.ActivityService;
import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.contact.ContactResponse;
import com.canicula.crmai.contact.ContactService;
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
public class AiCommunicationRecommendationService {

    private final AiContextService aiContextService;
    private final ContactService contactService;
    private final ActivityService activityService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    AiCommunicationRecommendationService(
            AiContextService aiContextService,
            ContactService contactService,
            ActivityService activityService,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        this.aiContextService = aiContextService;
        this.contactService = contactService;
        this.activityService = activityService;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AiCommunicationRecommendationResponse generate(AiCommunicationRecommendationGenerateRequest request, Long userId) {
        AiOpportunityContextResponse context = aiContextService.opportunityContext(request.opportunity_id(), userId);
        ContactResponse contact = contactService.readableDetail(request.contact_id(), userId);
        ensureContactBelongsToContext(contact, context);
        AiCommunicationRecommendationContent content = buildContent(context, contact);
        Long recommendationId = insertRecommendation(content, userId);
        return findOwnedRecommendation(recommendationId, userId);
    }

    public List<AiCommunicationRecommendationResponse> list(Long userId, String status, Long opportunityId, Long contactId) {
        List<Object> parameters = new ArrayList<>();
        parameters.add(userId);
        StringBuilder filters = new StringBuilder();
        if (hasText(status)) {
            filters.append(" and status = ?");
            parameters.add(status);
        }
        if (opportunityId != null) {
            filters.append(" and opportunity_id = ?");
            parameters.add(opportunityId);
        }
        if (contactId != null) {
            filters.append(" and contact_id = ?");
            parameters.add(contactId);
        }
        return jdbcTemplate.query(
                """
                select *
                from ai_communication_recommendations
                where created_by = ?
                %s
                order by created_at desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> mapRecommendation(rs),
                parameters.toArray());
    }

    @Transactional
    public AiCommunicationRecommendationResponse confirm(Long recommendationId, Long userId, String traceId) {
        AiCommunicationRecommendationResponse recommendation = findOwnedRecommendation(recommendationId, userId);
        AiCommunicationRecommendationContent content = findOwnedContent(recommendationId, userId);
        if (!"pending_confirmation".equals(recommendation.status())) {
            throw new BusinessRuleException("只有待确认沟通建议可以确认写入");
        }
        claimRecommendationForWriting(recommendationId, userId);
        ActivityResponse activity = activityService.create(new ActivityCreateRequest(
                recommendation.account_id(),
                recommendation.opportunity_id(),
                "AI沟通建议-" + recommendation.contact_name(),
                "communication",
                "planned",
                "pending",
                OffsetDateTime.now(),
                OffsetDateTime.now().plusDays(2),
                content.owner_department_id(),
                content.owner_user_id(),
                recommendation.opening_message() + "；沟通重点：" + joinItems(recommendation.key_messages(), "围绕AI助手价值和ROI材料沟通"),
                null,
                joinItems(recommendation.tone(), "保持专业沟通"),
                joinItems(recommendation.recommended_channels(), "通过微信同步材料后电话确认"),
                joinItems(recommendation.do_not_say(), null),
                false,
                null,
                "ai_communication_recommendation",
                "来源AI沟通建议：" + recommendation.id(),
                List.of(recommendation.contact_id()),
                List.of(),
                hasRiskReminder(recommendation.do_not_say()) ? List.of("ai_detected_risk") : List.of()), userId);
        insertWriteLog(recommendation.id(), "communication_recommendation_confirm", "activity", activity.id(), "success", null, userId, traceId);
        jdbcTemplate.update(
                """
                update ai_communication_recommendations
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
                recommendationId,
                userId);
        return findOwnedRecommendation(recommendationId, userId);
    }

    @Transactional
    public AiCommunicationRecommendationResponse reject(Long recommendationId, Long userId, String reason, String traceId) {
        AiCommunicationRecommendationResponse recommendation = findOwnedRecommendation(recommendationId, userId);
        if (!"pending_confirmation".equals(recommendation.status())) {
            throw new BusinessRuleException("只有待确认沟通建议可以驳回");
        }
        int updatedRows = jdbcTemplate.update(
                """
                update ai_communication_recommendations
                set status = 'rejected',
                    rejection_reason = ?,
                    rejected_by = ?,
                    rejected_at = current_timestamp
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                hasText(reason) ? reason.strip() : "用户驳回AI沟通建议",
                userId,
                recommendationId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("沟通建议已被处理，请刷新后重试");
        }
        insertWriteLog(recommendation.id(), "communication_recommendation_reject", "communication_recommendation", recommendation.id(), "success", null, userId, traceId);
        return findOwnedRecommendation(recommendationId, userId);
    }

    private AiCommunicationRecommendationContent buildContent(AiOpportunityContextResponse context, ContactResponse contact) {
        OpportunityResponse opportunity = context.opportunity();
        List<ActivityResponse> activities = context.recent_activities();
        List<AiEvidenceItem> evidence = context.evidence();
        return new AiCommunicationRecommendationContent(
                opportunity.id(),
                opportunity.account_id(),
                contact.id(),
                opportunity.owner_department_id(),
                opportunity.owner_user_id(),
                opportunity.opportunity_name(),
                context.account().account_name(),
                contact.name(),
                firstText(contact.title(), contact.department(), "未记录职务"),
                recommendedChannels(contact, opportunity, activities),
                tone(contact),
                keyMessages(contact, opportunity, activities),
                timing(opportunity, activities),
                escalationPath(contact, context.contacts()),
                doNotSay(opportunity, activities),
                openingMessage(contact, opportunity),
                evidence,
                activities.size(),
                evidence.size());
    }

    private List<String> recommendedChannels(ContactResponse contact, OpportunityResponse opportunity, List<ActivityResponse> activities) {
        List<String> channels = new ArrayList<>();
        if (hasText(contact.wechat()) || containsAny(contact.next_action(), "微信") || activitiesText(activities).contains("微信")) {
            channels.add("优先微信同步AI助手试点范围和ROI材料，降低首次沟通压力。");
        } else {
            channels.add("先用微信或短信发送材料摘要，再跟进电话确认。");
        }
        if (containsAny(contact.decision_influence(), "high", "高")
                || containsAny(contact.contact_type(), "decision")
                || containsAny(String.join("、", contact.project_roles()), "决策", "负责人")) {
            channels.add("通过电话确认评审时间、关键诉求和决策链路。");
        }
        if (containsAny(opportunity.risk_description(), "预算", "审批", "价格")) {
            channels.add("涉及预算审批时以电话澄清口径，避免长消息造成误解。");
        }
        return dedupe(channels);
    }

    private List<String> tone(ContactResponse contact) {
        List<String> values = new ArrayList<>();
        values.add("保持专业、简洁、以业务价值为先。");
        if (containsAny(contact.attitude(), "positive", "支持", "认可")) {
            values.add("对方态度积极，可采用协作式语气推动下一步。");
        } else if (containsAny(contact.attitude(), "negative", "反对", "谨慎")) {
            values.add("对方态度谨慎，先确认顾虑，再给证据和选项。");
        } else {
            values.add("对方态度中性，先复述已确认事实，再提出低压力下一步。");
        }
        if (containsAny(contact.relationship_heat(), "cold", "陌生")) {
            values.add("关系热度不足，避免直接推进价格和合同话题。");
        }
        return dedupe(values);
    }

    private List<String> keyMessages(ContactResponse contact, OpportunityResponse opportunity, List<ActivityResponse> activities) {
        List<String> values = new ArrayList<>();
        values.add("围绕AI助手对销售记录、周报、商机分析和拜访计划的价值展开。");
        values.add("明确ROI口径、试点范围和评审材料，方便客户内部同步。");
        if (hasText(contact.last_communication_summary())) {
            values.add("承接上次沟通：" + contact.last_communication_summary());
        }
        if (hasText(opportunity.potential_point())) {
            values.add("结合客户痛点：" + opportunity.potential_point());
        }
        activities.stream()
                .filter(activity -> hasText(activity.customer_feedback()) || hasText(activity.conclusion()))
                .findFirst()
                .ifPresent(activity -> values.add("引用近期反馈：" + firstText(activity.customer_feedback(), activity.conclusion())));
        return dedupe(values);
    }

    private List<String> timing(OpportunityResponse opportunity, List<ActivityResponse> activities) {
        List<String> values = new ArrayList<>();
        values.add("建议在评审前同步材料，给客户预留内部转发和问题收集时间。");
        if (hasText(opportunity.next_plan())) {
            values.add("跟随商机下一步：" + opportunity.next_plan());
        }
        activities.stream()
                .filter(activity -> activity.next_follow_up_at() != null)
                .findFirst()
                .ifPresent(activity -> values.add("可衔接下一次跟进时间：" + activity.next_follow_up_at()));
        return dedupe(values);
    }

    private List<String> escalationPath(ContactResponse targetContact, List<ContactResponse> contacts) {
        List<String> values = new ArrayList<>();
        values.add("先与" + targetContact.name() + "确认业务价值和ROI材料，再请其牵引内部评审。");
        contacts.stream()
                .filter(contact -> !Objects.equals(contact.id(), targetContact.id()))
                .filter(contact -> containsAny(contact.department(), "财务", "采购")
                        || containsAny(contact.title(), "财务", "采购")
                        || contact.project_roles().stream().anyMatch(role -> containsAny(role, "财务", "采购")))
                .findFirst()
                .ifPresent(contact -> values.add("预算或审批问题升级给" + contact.name() + "确认口径。"));
        contacts.stream()
                .filter(contact -> !Objects.equals(contact.id(), targetContact.id()))
                .filter(contact -> containsAny(contact.department(), "技术", "信息")
                        || containsAny(contact.title(), "技术", "架构"))
                .findFirst()
                .ifPresent(contact -> values.add("技术集成问题转给" + contact.name() + "评估边界。"));
        return dedupe(values);
    }

    private List<String> doNotSay(OpportunityResponse opportunity, List<ActivityResponse> activities) {
        List<String> values = new ArrayList<>();
        values.add("不要在预算审批路径未明确前承诺最终价格、上线日期或客户侧收益。");
        if (hasText(opportunity.risk_description())) {
            values.add("不要回避当前风险：" + opportunity.risk_description());
        }
        activities.stream()
                .filter(activity -> hasText(activity.customer_feedback()) && containsAny(activity.customer_feedback(), "不要", "避免", "承诺"))
                .findFirst()
                .ifPresent(activity -> values.add(activity.customer_feedback()));
        return dedupe(values);
    }

    private String openingMessage(ContactResponse contact, OpportunityResponse opportunity) {
        return "您好" + contact.name() + "，我想把AI助手试点范围、ROI材料和评审前需要确认的问题同步给您，方便您内部判断下一步。";
    }

    private void ensureContactBelongsToContext(ContactResponse contact, AiOpportunityContextResponse context) {
        boolean belongsToOpportunityAccount = Objects.equals(contact.account_id(), context.account().id());
        boolean appearsInContext = context.contacts().stream().anyMatch(item -> Objects.equals(item.id(), contact.id()));
        if (!belongsToOpportunityAccount || !appearsInContext) {
            throw new BusinessRuleException("联系人不属于当前商机客户上下文");
        }
    }

    private Long insertRecommendation(AiCommunicationRecommendationContent content, Long userId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into ai_communication_recommendations (
                        opportunity_id, account_id, contact_id, status, recommendation_json,
                        source_activity_count, source_evidence_count, created_by
                    )
                    values (?, ?, ?, 'pending_confirmation', ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, content.opportunity_id());
            statement.setObject(2, content.account_id());
            statement.setObject(3, content.contact_id());
            statement.setString(4, writeJson(content));
            statement.setObject(5, content.source_activity_count());
            statement.setObject(6, content.source_evidence_count());
            statement.setObject(7, userId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private AiCommunicationRecommendationResponse findOwnedRecommendation(Long recommendationId, Long userId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from ai_communication_recommendations
                where id = ?
                  and created_by = ?
                """,
                (rs, rowNum) -> mapRecommendation(rs),
                recommendationId,
                userId);
    }

    private AiCommunicationRecommendationContent findOwnedContent(Long recommendationId, Long userId) {
        return readContent(jdbcTemplate.queryForObject(
                "select recommendation_json from ai_communication_recommendations where id = ? and created_by = ?",
                String.class,
                recommendationId,
                userId));
    }

    private AiCommunicationRecommendationResponse mapRecommendation(java.sql.ResultSet rs) throws java.sql.SQLException {
        AiCommunicationRecommendationContent content = readContent(rs.getString("recommendation_json"));
        return new AiCommunicationRecommendationResponse(
                rs.getLong("id"),
                rs.getString("status"),
                content.opportunity_id(),
                content.account_id(),
                content.contact_id(),
                content.opportunity_name(),
                content.account_name(),
                content.contact_name(),
                content.contact_title(),
                content.recommended_channels(),
                content.tone(),
                content.key_messages(),
                content.timing(),
                content.escalation_path(),
                content.do_not_say(),
                content.opening_message(),
                content.evidence(),
                rs.getInt("source_activity_count"),
                rs.getInt("source_evidence_count"),
                nullableLong(rs.getObject("write_activity_id")),
                rs.getString("rejection_reason"),
                nullableOffsetDateTime(rs.getObject("created_at")),
                nullableOffsetDateTime(rs.getObject("confirmed_at")),
                nullableOffsetDateTime(rs.getObject("rejected_at")));
    }

    private void claimRecommendationForWriting(Long recommendationId, Long userId) {
        int updatedRows = jdbcTemplate.update(
                """
                update ai_communication_recommendations
                set status = 'writing'
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                recommendationId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("沟通建议已被处理，请刷新后重试");
        }
    }

    private void insertWriteLog(
            Long recommendationId,
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
                errorMessage == null ? null : errorMessage + " (communication_recommendation_id=" + recommendationId + ")",
                userId,
                traceId);
    }

    private AiCommunicationRecommendationContent readContent(String json) {
        try {
            return objectMapper.readValue(json, AiCommunicationRecommendationContent.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI沟通建议内容解析失败", exception);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI沟通建议内容序列化失败", exception);
        }
    }

    private static String activitiesText(List<ActivityResponse> activities) {
        return activities.stream()
                .map(activity -> String.join("；",
                        firstText(activity.communication_content()),
                        firstText(activity.customer_feedback()),
                        firstText(activity.next_plan())))
                .reduce("", (left, right) -> left + "；" + right);
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

    private static boolean hasRiskReminder(List<String> reminders) {
        return reminders.stream().anyMatch(reminder -> containsAny(reminder, "不要", "风险", "预算", "承诺", "审批"));
    }

    private static String joinItems(List<String> items, String fallback) {
        List<String> values = items.stream().filter(AiCommunicationRecommendationService::hasText).limit(5).toList();
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
