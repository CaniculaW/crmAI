package com.canicula.crmai.ai;

import com.canicula.crmai.account.AccountCreateRequest;
import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.activity.ActivityCreateRequest;
import com.canicula.crmai.activity.ActivityResponse;
import com.canicula.crmai.activity.ActivityService;
import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.contact.ContactCreateRequest;
import com.canicula.crmai.contact.ContactResponse;
import com.canicula.crmai.contact.ContactService;
import com.canicula.crmai.identity.DataPermissionColumns;
import com.canicula.crmai.identity.DataPermissionCondition;
import com.canicula.crmai.identity.DataPermissionService;
import com.canicula.crmai.opportunity.OpportunityCreateRequest;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.opportunity.OpportunityService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AiDraftService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };
    private static final DataPermissionColumns ACCOUNT_PERMISSION_COLUMNS = new DataPermissionColumns(
            "a.owner_user_id",
            "a.owner_department_id",
            "exists (select 1 from crm_account_collaborators ac where ac.account_id = a.id and ac.user_id = ?)");
    private static final DataPermissionColumns OPPORTUNITY_PERMISSION_COLUMNS = new DataPermissionColumns(
            "o.owner_user_id",
            "o.owner_department_id",
            "exists (select 1 from crm_opportunity_collaborators oc where oc.opportunity_id = o.id and oc.user_id = ?)");

    private final AccountService accountService;
    private final ContactService contactService;
    private final OpportunityService opportunityService;
    private final ActivityService activityService;
    private final DataPermissionService dataPermissionService;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate auditLogTransactionTemplate;

    AiDraftService(
            AccountService accountService,
            ContactService contactService,
            OpportunityService opportunityService,
            ActivityService activityService,
            DataPermissionService dataPermissionService,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager) {
        this.accountService = accountService;
        this.contactService = contactService;
        this.opportunityService = opportunityService;
        this.activityService = activityService;
        this.dataPermissionService = dataPermissionService;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.auditLogTransactionTemplate = new TransactionTemplate(transactionManager);
        this.auditLogTransactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional
    public AiDraftParseResponse parse(String sourceText, Long userId) {
        Long inputRecordId = insertInputRecord(sourceText, userId);
        List<AiDraftResponse> drafts = new ArrayList<>();
        for (String line : sourceText.split("\\R")) {
            ParsedDraft parsedDraft = parseLine(line, userId);
            if (parsedDraft != null) {
                drafts.add(insertDraft(inputRecordId, line.strip(), parsedDraft, userId));
            }
        }
        if (drafts.isEmpty()) {
            drafts.add(insertDraft(
                    inputRecordId,
                    sourceText,
                    new ParsedDraft(
                            "unknown",
                            "need_more_info",
                            "create",
                            Map.of("source_text", sourceText),
                            List.of("draft_type"),
                            List.of("未识别出客户、联系人、商机或行动"),
                            "low"),
                    userId));
        }
        return new AiDraftParseResponse(inputRecordId, drafts);
    }

    public List<AiDraftResponse> list(Long userId, String status) {
        if (status == null || status.isBlank()) {
            return jdbcTemplate.query(
                    """
                    select *
                    from ai_extraction_drafts
                    where created_by = ?
                    order by created_at desc, id desc
                    """,
                    this::mapDraft,
                    userId);
        }
        return jdbcTemplate.query(
                """
                select *
                from ai_extraction_drafts
                where created_by = ?
                  and status = ?
                order by created_at desc, id desc
                """,
                this::mapDraft,
                userId,
                status);
    }

    @Transactional
    public AiDraftResponse confirm(Long draftId, Long userId, String traceId) {
        AiDraftResponse draft = findOwnedDraft(draftId, userId);
        if (!"pending_confirmation".equals(draft.status())) {
            throw new BusinessRuleException("只有待确认草稿可以确认写入");
        }
        if (!draft.missing_fields().isEmpty()) {
            throw new BusinessRuleException("草稿仍有缺失字段，不能写入");
        }
        claimDraftForWriting(draftId, userId);
        try {
            WriteResult writeResult = writeDraft(draft, userId);
            jdbcTemplate.update(
                    """
                    update ai_extraction_drafts
                    set status = 'confirmed',
                        write_object_type = ?,
                        write_object_id = ?,
                        confirmed_by = ?,
                        confirmed_at = current_timestamp
                    where id = ?
                      and created_by = ?
                      and status = 'writing'
                    """,
                    writeResult.objectType(),
                    writeResult.objectId(),
                    userId,
                    draftId,
                    userId);
            insertWriteLog(draft, "confirm", writeResult.objectType(), writeResult.objectId(), "success", null, userId, traceId);
            return findOwnedDraft(draftId, userId);
        } catch (RuntimeException exception) {
            insertWriteLogInNewTransaction(draft, "confirm", draft.draft_type(), null, "failed", exception.getMessage(), userId, traceId);
            throw exception;
        }
    }

    @Transactional
    public AiDraftResponse reject(Long draftId, Long userId, String reason, String traceId) {
        AiDraftResponse draft = findOwnedDraft(draftId, userId);
        if (!Set.of("pending_confirmation", "need_more_info").contains(draft.status())) {
            throw new BusinessRuleException("只有未处理草稿可以拒绝");
        }
        int updatedRows = jdbcTemplate.update(
                """
                update ai_extraction_drafts
                set status = 'rejected',
                    rejection_reason = ?,
                    rejected_by = ?,
                    rejected_at = current_timestamp
                where id = ?
                  and created_by = ?
                  and status in ('pending_confirmation', 'need_more_info')
                """,
                blankToDefault(reason, "用户拒绝草稿"),
                userId,
                draftId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("草稿已被处理，请刷新后重试");
        }
        insertWriteLog(draft, "reject", draft.draft_type(), null, "success", null, userId, traceId);
        return findOwnedDraft(draftId, userId);
    }

    private ParsedDraft parseLine(String rawLine, Long userId) {
        String line = rawLine == null ? "" : rawLine.strip();
        if (line.isBlank()) {
            return null;
        }
        if (line.startsWith("客户：") || line.startsWith("客户:")) {
            return accountDraft(line, userId);
        }
        if (line.startsWith("联系人：") || line.startsWith("联系人:")) {
            return contactDraft(line, userId);
        }
        if (line.startsWith("商机：") || line.startsWith("商机:") || line.startsWith("线索：") || line.startsWith("线索:")) {
            return opportunityDraft(line, userId);
        }
        if (line.startsWith("行动：") || line.startsWith("行动:") || line.startsWith("拜访：") || line.startsWith("拜访:")) {
            return activityDraft(line, userId);
        }
        return null;
    }

    private ParsedDraft accountDraft(String line, Long userId) {
        Map<String, String> values = splitFields(line, "客户");
        String accountName = firstValue(values, "客户", "名称", "客户名称");
        Map<String, Object> payload = new LinkedHashMap<>();
        put(payload, "account_name", accountName);
        put(payload, "account_short_name", accountName);
        put(payload, "account_type", "enterprise");
        put(payload, "account_level", "A");
        put(payload, "account_status", "following");
        put(payload, "account_source", "ai_text");
        put(payload, "industry", values.get("行业"));
        putRegion(payload, values.get("地区"));
        put(payload, "owner_department_id", ownerDepartmentId(userId));
        put(payload, "owner_user_id", userId);
        put(payload, "background", values.get("背景"));
        put(payload, "key_needs", firstValue(values, "需求", "痛点"));
        put(payload, "remark", "AI文本录入草稿");
        List<String> missing = missing(payload, "account_name", "owner_department_id", "owner_user_id");
        List<String> conflicts = accountName == null ? List.of() : accountConflicts(accountName, userId);
        return new ParsedDraft(
                "account",
                missing.isEmpty() ? "pending_confirmation" : "need_more_info",
                "create",
                payload,
                missing,
                conflicts,
                confidence(missing, conflicts));
    }

    private ParsedDraft contactDraft(String line, Long userId) {
        Map<String, String> values = splitFields(line, "联系人");
        String contactName = firstValue(values, "联系人", "姓名", "联系人姓名");
        Long accountId = findAccountId(firstValue(values, "客户", "客户名称"), userId);
        Map<String, Object> payload = new LinkedHashMap<>();
        put(payload, "account_id", accountId);
        put(payload, "name", contactName);
        put(payload, "department", values.get("部门"));
        put(payload, "title", firstValue(values, "职务", "职位"));
        put(payload, "mobile", firstValue(values, "手机", "电话"));
        put(payload, "email", values.get("邮箱"));
        put(payload, "contact_type", "business");
        put(payload, "decision_influence", values.get("影响力"));
        put(payload, "attitude", attitude(firstValue(values, "态度", "反馈")));
        put(payload, "relationship_heat", values.getOrDefault("热度", "warm"));
        put(payload, "importance_level", "A");
        put(payload, "last_communication_summary", values.get("反馈"));
        put(payload, "next_action", values.get("下一步"));
        put(payload, "remark", "AI文本录入草稿");
        List<String> missing = missing(payload, "account_id", "name");
        return new ParsedDraft(
                "contact",
                missing.isEmpty() ? "pending_confirmation" : "need_more_info",
                "create",
                payload,
                missing,
                List.of(),
                confidence(missing, List.of()));
    }

    private ParsedDraft opportunityDraft(String line, Long userId) {
        Map<String, String> values = splitFields(line, line.startsWith("线索") ? "线索" : "商机");
        String opportunityName = firstValue(values, "商机", "线索", "商机名称", "名称");
        Long accountId = findAccountId(firstValue(values, "客户", "客户名称"), userId);
        Map<String, Object> payload = new LinkedHashMap<>();
        put(payload, "account_id", accountId);
        put(payload, "opportunity_name", opportunityName);
        put(payload, "stage", "lead");
        put(payload, "status", "following");
        put(payload, "level", "A");
        put(payload, "source", "ai_text");
        put(payload, "potential_point", firstValue(values, "需求", "痛点"));
        put(payload, "estimated_budget_amount", amount(values.get("金额")));
        put(payload, "estimated_contract_amount", amount(values.get("金额")));
        put(payload, "expected_close_date", values.get("预计成交"));
        put(payload, "owner_department_id", ownerDepartmentId(userId));
        put(payload, "owner_user_id", userId);
        put(payload, "risk_status", "normal");
        put(payload, "current_progress", values.get("进展"));
        put(payload, "next_plan", values.get("下一步"));
        put(payload, "remark", "AI文本录入草稿");
        List<String> missing = missing(payload, "account_id", "opportunity_name", "owner_department_id", "owner_user_id");
        return new ParsedDraft(
                "opportunity",
                missing.isEmpty() ? "pending_confirmation" : "need_more_info",
                "create",
                payload,
                missing,
                List.of(),
                confidence(missing, List.of()));
    }

    private ParsedDraft activityDraft(String line, Long userId) {
        Map<String, String> values = splitFields(line, line.startsWith("拜访") ? "拜访" : "行动");
        String subject = firstValue(values, "行动", "拜访", "主题", "行动主题");
        Long accountId = findAccountId(firstValue(values, "客户", "客户名称"), userId);
        Long opportunityId = findOpportunityId(firstValue(values, "商机", "商机名称"), accountId, userId);
        Map<String, Object> payload = new LinkedHashMap<>();
        put(payload, "account_id", accountId);
        put(payload, "opportunity_id", opportunityId);
        put(payload, "subject", subject);
        put(payload, "activity_type", line.contains("拜访") ? "visit" : "follow_up");
        put(payload, "activity_status", "completed");
        put(payload, "activity_result", "milestone_completed");
        put(payload, "activity_time", firstValue(values, "时间", "行动时间"));
        put(payload, "owner_department_id", ownerDepartmentId(userId));
        put(payload, "owner_user_id", userId);
        put(payload, "communication_content", firstValue(values, "内容", "沟通内容"));
        put(payload, "customer_feedback", firstValue(values, "反馈", "客户反馈"));
        put(payload, "conclusion", values.get("结论"));
        put(payload, "next_plan", values.get("下一步"));
        put(payload, "risk_description", values.get("风险"));
        put(payload, "include_in_weekly_progress", true);
        put(payload, "source_type", "ai_text");
        put(payload, "remark", "AI文本录入草稿");
        List<String> missing = missing(payload, "account_id", "subject", "activity_type", "activity_time", "owner_department_id", "owner_user_id");
        return new ParsedDraft(
                "activity",
                missing.isEmpty() ? "pending_confirmation" : "need_more_info",
                "create",
                payload,
                missing,
                List.of(),
                confidence(missing, List.of()));
    }

    private WriteResult writeDraft(AiDraftResponse draft, Long userId) {
        return switch (draft.draft_type()) {
            case "account" -> {
                requireBusinessPermission(userId, "account.create");
                AccountResponse response = accountService.create(new AccountCreateRequest(
                        null,
                        asString(draft.payload(), "account_name"),
                        asString(draft.payload(), "account_short_name"),
                        asString(draft.payload(), "account_type"),
                        asString(draft.payload(), "account_level"),
                        asString(draft.payload(), "account_status"),
                        asString(draft.payload(), "account_source"),
                        asString(draft.payload(), "industry"),
                        asString(draft.payload(), "region_province"),
                        asString(draft.payload(), "region_city"),
                        null,
                        "warm",
                        asLong(draft.payload(), "owner_department_id"),
                        asLong(draft.payload(), "owner_user_id"),
                        asString(draft.payload(), "background"),
                        asString(draft.payload(), "key_needs"),
                        asString(draft.payload(), "remark"),
                        List.of()), userId);
                yield new WriteResult("account", response.id());
            }
            case "contact" -> {
                requireBusinessPermission(userId, "contact.create");
                ContactResponse response = contactService.create(new ContactCreateRequest(
                        asLong(draft.payload(), "account_id"),
                        asString(draft.payload(), "name"),
                        asString(draft.payload(), "department"),
                        asString(draft.payload(), "title"),
                        asString(draft.payload(), "mobile"),
                        asString(draft.payload(), "email"),
                        null,
                        asString(draft.payload(), "contact_type"),
                        asString(draft.payload(), "decision_influence"),
                        asString(draft.payload(), "attitude"),
                        asString(draft.payload(), "relationship_heat"),
                        asString(draft.payload(), "importance_level"),
                        null,
                        null,
                        asString(draft.payload(), "last_communication_summary"),
                        asString(draft.payload(), "next_action"),
                        asString(draft.payload(), "remark"),
                        List.of()), userId);
                yield new WriteResult("contact", response.id());
            }
            case "opportunity" -> {
                requireBusinessPermission(userId, "opportunity.create");
                OpportunityResponse response = opportunityService.create(new OpportunityCreateRequest(
                        asLong(draft.payload(), "account_id"),
                        asString(draft.payload(), "opportunity_name"),
                        asString(draft.payload(), "stage"),
                        asString(draft.payload(), "status"),
                        asString(draft.payload(), "level"),
                        asString(draft.payload(), "source"),
                        asString(draft.payload(), "potential_point"),
                        asBigDecimal(draft.payload(), "estimated_budget_amount"),
                        asBigDecimal(draft.payload(), "estimated_contract_amount"),
                        asLocalDate(draft.payload(), "expected_close_date"),
                        asLong(draft.payload(), "owner_department_id"),
                        asLong(draft.payload(), "owner_user_id"),
                        asString(draft.payload(), "risk_status"),
                        asString(draft.payload(), "current_progress"),
                        asString(draft.payload(), "next_plan"),
                        asString(draft.payload(), "remark"),
                        List.of(),
                        List.of()), userId);
                yield new WriteResult("opportunity", response.id());
            }
            case "activity" -> {
                requireBusinessPermission(userId, "activity.create");
                ActivityResponse response = activityService.create(new ActivityCreateRequest(
                        asLong(draft.payload(), "account_id"),
                        asLong(draft.payload(), "opportunity_id"),
                        asString(draft.payload(), "subject"),
                        asString(draft.payload(), "activity_type"),
                        asString(draft.payload(), "activity_status"),
                        asString(draft.payload(), "activity_result"),
                        asOffsetDateTime(draft.payload(), "activity_time"),
                        null,
                        asLong(draft.payload(), "owner_department_id"),
                        asLong(draft.payload(), "owner_user_id"),
                        asString(draft.payload(), "communication_content"),
                        asString(draft.payload(), "customer_feedback"),
                        asString(draft.payload(), "conclusion"),
                        asString(draft.payload(), "next_plan"),
                        asString(draft.payload(), "risk_description"),
                        true,
                        null,
                        asString(draft.payload(), "source_type"),
                        asString(draft.payload(), "remark"),
                        List.of(),
                        List.of(),
                        List.of()), userId);
                yield new WriteResult("activity", response.id());
            }
            default -> throw new BusinessRuleException("不支持的草稿类型");
        };
    }

    private Long insertInputRecord(String sourceText, Long userId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "insert into ai_input_records (source_text, created_by) values (?, ?)",
                    new String[] {"id"});
            ps.setString(1, sourceText);
            ps.setLong(2, userId);
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    private AiDraftResponse insertDraft(Long inputRecordId, String sourceLine, ParsedDraft parsedDraft, Long userId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    insert into ai_extraction_drafts (
                        input_record_id, draft_type, status, target_action, source_text, payload_json,
                        missing_fields, conflicts, confidence_status, created_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            ps.setLong(1, inputRecordId);
            ps.setString(2, parsedDraft.draftType());
            ps.setString(3, parsedDraft.status());
            ps.setString(4, parsedDraft.targetAction());
            ps.setString(5, sourceLine);
            ps.setString(6, writeJson(parsedDraft.payload()));
            ps.setString(7, writeJson(parsedDraft.missingFields()));
            ps.setString(8, writeJson(parsedDraft.conflicts()));
            ps.setString(9, parsedDraft.confidenceStatus());
            ps.setLong(10, userId);
            return ps;
        }, keyHolder);
        return findOwnedDraft(keyHolder.getKey().longValue(), userId);
    }

    private void claimDraftForWriting(Long draftId, Long userId) {
        int updatedRows = jdbcTemplate.update(
                """
                update ai_extraction_drafts
                set status = 'writing'
                where id = ?
                  and created_by = ?
                  and status = 'pending_confirmation'
                """,
                draftId,
                userId);
        if (updatedRows != 1) {
            throw new BusinessRuleException("草稿已被处理，请刷新后重试");
        }
    }

    private AiDraftResponse findOwnedDraft(Long draftId, Long userId) {
        return jdbcTemplate.queryForObject(
                """
                select *
                from ai_extraction_drafts
                where id = ?
                  and created_by = ?
                """,
                this::mapDraft,
                draftId,
                userId);
    }

    private AiDraftResponse mapDraft(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new AiDraftResponse(
                rs.getLong("id"),
                rs.getLong("input_record_id"),
                rs.getString("draft_type"),
                rs.getString("status"),
                rs.getString("target_action"),
                rs.getString("source_text"),
                readMap(rs.getString("payload_json")),
                readStringList(rs.getString("missing_fields")),
                readStringList(rs.getString("conflicts")),
                rs.getString("confidence_status"),
                rs.getString("write_object_type"),
                boxedLong(rs, "write_object_id"),
                rs.getString("rejection_reason"),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("confirmed_at", OffsetDateTime.class),
                rs.getObject("rejected_at", OffsetDateTime.class));
    }

    private void insertWriteLog(
            AiDraftResponse draft,
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
                    draft_id, input_record_id, operation, object_type, object_id,
                    status, error_message, created_by, trace_id
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                draft.id(),
                draft.input_record_id(),
                operation,
                objectType,
                objectId,
                status,
                errorMessage,
                userId,
                traceId);
    }

    private void insertWriteLogInNewTransaction(
            AiDraftResponse draft,
            String operation,
            String objectType,
            Long objectId,
            String status,
            String errorMessage,
            Long userId,
            String traceId) {
        auditLogTransactionTemplate.executeWithoutResult(statusContext ->
                insertWriteLog(draft, operation, objectType, objectId, status, errorMessage, userId, traceId));
    }

    private Map<String, String> splitFields(String line, String firstKey) {
        Map<String, String> values = new LinkedHashMap<>();
        String normalized = line.replace('，', ',').replace('：', ':');
        String[] parts = normalized.split(",");
        for (int i = 0; i < parts.length; i++) {
            String part = parts[i].strip();
            if (part.isBlank()) {
                continue;
            }
            int separator = part.indexOf(':');
            if (separator > 0) {
                values.put(part.substring(0, separator).strip(), part.substring(separator + 1).strip());
            } else if (i == 0) {
                values.put(firstKey, part);
            }
        }
        return values;
    }

    private Long findAccountId(String accountName, Long userId) {
        if (accountName == null || accountName.isBlank()) {
            return null;
        }
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "account",
                ACCOUNT_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>();
        parameters.add(accountName);
        parameters.addAll(condition.parameters());
        List<Long> ids = jdbcTemplate.query(
                """
                select a.id
                from crm_accounts a
                where a.account_name = ?
                  and a.deleted_at is null
                  and %s
                order by id desc
                limit 1
                """.formatted(condition.clause()),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        return ids.isEmpty() ? null : ids.get(0);
    }

    private Long findOpportunityId(String opportunityName, Long accountId, Long userId) {
        if (opportunityName == null || opportunityName.isBlank() || accountId == null) {
            return null;
        }
        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "opportunity",
                OPPORTUNITY_PERMISSION_COLUMNS);
        List<Object> parameters = new ArrayList<>();
        parameters.add(accountId);
        parameters.add(opportunityName);
        parameters.addAll(condition.parameters());
        List<Long> ids = jdbcTemplate.query(
                """
                select o.id
                from crm_opportunities o
                where o.account_id = ?
                  and o.opportunity_name = ?
                  and o.deleted_at is null
                  and %s
                order by id desc
                limit 1
                """.formatted(condition.clause()),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        return ids.isEmpty() ? null : ids.get(0);
    }

    private List<String> accountConflicts(String accountName, Long userId) {
        Long accountId = findAccountId(accountName, userId);
        return accountId == null ? List.of() : List.of("客户名称已存在，需确认是否新建");
    }

    private Long ownerDepartmentId(Long userId) {
        return jdbcTemplate.queryForObject(
                "select department_id from sys_users where id = ?",
                Long.class,
                userId);
    }

    private Set<String> permissions(Long userId) {
        return Set.copyOf(jdbcTemplate.queryForList(
                """
                select distinct p.permission_code
                from sys_permissions p
                join sys_role_permissions rp on rp.permission_id = p.id
                join sys_user_roles ur on ur.role_id = rp.role_id
                where ur.user_id = ?
                  and p.is_active = true
                """,
                String.class,
                userId));
    }

    private void requireBusinessPermission(Long userId, String permissionCode) {
        if (!permissions(userId).contains(permissionCode)) {
            throw new ForbiddenException("无权执行AI草稿写入目标操作");
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI草稿序列化失败", exception);
        }
    }

    private Map<String, Object> readMap(String json) {
        try {
            return objectMapper.readValue(json, MAP_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI草稿载荷解析失败", exception);
        }
    }

    private List<String> readStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, STRING_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI草稿列表解析失败", exception);
        }
    }

    private static List<String> missing(Map<String, Object> payload, String... fields) {
        List<String> missing = new ArrayList<>();
        for (String field : fields) {
            Object value = payload.get(field);
            if (value == null || (value instanceof String text && text.isBlank())) {
                missing.add(field);
            }
        }
        return missing;
    }

    private static void put(Map<String, Object> payload, String key, Object value) {
        if (value != null && (!(value instanceof String text) || !text.isBlank())) {
            payload.put(key, value);
        }
    }

    private static void putRegion(Map<String, Object> payload, String region) {
        if (region == null || region.isBlank()) {
            return;
        }
        String[] parts = region.split("[/\\s-]+");
        put(payload, "region_province", parts[0]);
        put(payload, "region_city", parts.length > 1 ? parts[1] : parts[0]);
    }

    private static String firstValue(Map<String, String> values, String... keys) {
        for (String key : keys) {
            String value = values.get(key);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private static String attitude(String value) {
        if (value == null) {
            return null;
        }
        if (value.contains("积极") || value.toLowerCase(Locale.ROOT).contains("positive")) {
            return "positive";
        }
        if (value.contains("消极") || value.toLowerCase(Locale.ROOT).contains("negative")) {
            return "negative";
        }
        return value;
    }

    private static BigDecimal amount(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.replaceAll("[^0-9.]", "");
        return normalized.isBlank() ? null : new BigDecimal(normalized);
    }

    private static String confidence(List<String> missing, List<String> conflicts) {
        if (!missing.isEmpty()) {
            return "low";
        }
        return conflicts.isEmpty() ? "high" : "medium";
    }

    private static String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }

    private static String asString(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value == null ? null : value.toString();
    }

    private static Long asLong(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.valueOf(value.toString());
    }

    private static BigDecimal asBigDecimal(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        return new BigDecimal(value.toString());
    }

    private static LocalDate asLocalDate(Map<String, Object> payload, String key) {
        String value = asString(payload, key);
        return value == null || value.isBlank() ? null : LocalDate.parse(value);
    }

    private static OffsetDateTime asOffsetDateTime(Map<String, Object> payload, String key) {
        String value = asString(payload, key);
        return value == null || value.isBlank() ? null : OffsetDateTime.parse(value);
    }

    private static Long boxedLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record ParsedDraft(
            String draftType,
            String status,
            String targetAction,
            Map<String, Object> payload,
            List<String> missingFields,
            List<String> conflicts,
            String confidenceStatus) {
    }

    private record WriteResult(String objectType, Long objectId) {
    }
}
