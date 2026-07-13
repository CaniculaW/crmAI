package com.canicula.crmai.solution;

import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.approval.ApprovalService;
import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.opportunity.OpportunityService;
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
public class SolutionDocumentService {

    private final JdbcTemplate jdbcTemplate;
    private final OpportunityService opportunityService;
    private final ApprovalService approvalService;

    SolutionDocumentService(
            JdbcTemplate jdbcTemplate,
            OpportunityService opportunityService,
            ApprovalService approvalService) {
        this.jdbcTemplate = jdbcTemplate;
        this.opportunityService = opportunityService;
        this.approvalService = approvalService;
    }

    @Transactional
    public SolutionDocumentResponse create(SolutionDocumentCreateRequest request, Long actorUserId) {
        OpportunityResponse opportunity = opportunityService.readableDetail(request.opportunity_id(), actorUserId);
        validateSameAccount(request.account_id(), opportunity.account_id());
        Long solutionId = insertSolutionDocument(request, actorUserId);
        return findById(solutionId);
    }

    public List<SolutionDocumentResponse> readableList(Long actorUserId, SolutionDocumentListFilter filter) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "document_type", filter.document_type());
        appendEqualsFilter(filters, parameters, "status", filter.status());
        appendEqualsFilter(filters, parameters, "bid_self_check_result", filter.bid_self_check_result());
        appendEqualsFilter(filters, parameters, "owner_user_id", filter.owner_user_id());
        List<Long> solutionIds = jdbcTemplate.query(
                """
                select id
                from crm_solution_documents
                where deleted_at is null
                  %s
                order by updated_at desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        List<SolutionDocumentResponse> readableSolutions = new ArrayList<>();
        for (Long solutionId : solutionIds) {
            try {
                readableSolutions.add(readableDetail(solutionId, actorUserId));
            } catch (IllegalArgumentException | ForbiddenException ignored) {
                // List queries hide rows outside the linked opportunity data scope.
            }
        }
        return readableSolutions;
    }

    public SolutionDocumentResponse readableDetail(Long solutionId, Long actorUserId) {
        SolutionDocumentResponse response = findById(solutionId);
        try {
            opportunityService.readableDetail(response.opportunity_id(), actorUserId);
            return response;
        } catch (IllegalArgumentException exception) {
            throw new ForbiddenException("方案标书不存在或无权访问");
        }
    }

    @Transactional
    public SolutionDocumentResponse update(
            Long solutionId,
            SolutionDocumentUpdateRequest request,
            Long actorUserId) {
        SolutionDocumentResponse current = readableDetail(solutionId, actorUserId);
        requireApprovalSafeUpdate(current, request);
        jdbcTemplate.update(
                """
                update crm_solution_documents
                set document_name = coalesce(?, document_name),
                    document_type = coalesce(?, document_type),
                    version_no = coalesce(?, version_no),
                    status = coalesce(?, status),
                    owner_user_id = coalesce(?, owner_user_id),
                    customer_requirement_summary = coalesce(?, customer_requirement_summary),
                    technical_solution_summary = coalesce(?, technical_solution_summary),
                    stakeholder_strategy = coalesce(?, stakeholder_strategy),
                    quotation_amount = coalesce(?, quotation_amount),
                    cost_amount = coalesce(?, cost_amount),
                    estimated_gross_margin_rate = coalesce(?, estimated_gross_margin_rate),
                    bid_self_check_result = coalesce(?, bid_self_check_result),
                    bid_risk_description = coalesce(?, bid_risk_description),
                    submitted_to_customer_at = coalesce(?, submitted_to_customer_at),
                    customer_feedback = coalesce(?, customer_feedback),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                normalizeText(request.document_name()),
                normalizeText(request.document_type()),
                normalizeText(request.version_no()),
                normalizeText(request.status()),
                request.owner_user_id(),
                normalizeText(request.customer_requirement_summary()),
                normalizeText(request.technical_solution_summary()),
                normalizeText(request.stakeholder_strategy()),
                request.quotation_amount(),
                request.cost_amount(),
                request.estimated_gross_margin_rate(),
                normalizeText(request.bid_self_check_result()),
                normalizeText(request.bid_risk_description()),
                request.submitted_to_customer_at(),
                normalizeText(request.customer_feedback()),
                normalizeText(request.remark()),
                actorUserId,
                solutionId);
        return findById(solutionId);
    }

    @Transactional
    public SolutionDocumentResponse submitApproval(Long solutionId, Long actorUserId) {
        approvalService.requireActorPermission(actorUserId, "approval.submit");
        SolutionDocumentResponse current = readableDetail(solutionId, actorUserId);
        approvalService.submitBusinessObject(
                approvalObjectType(current),
                current.id(),
                current.document_name(),
                actorUserId);
        return findById(solutionId);
    }

    @Transactional
    public SolutionDocumentResponse voidDocument(
            Long solutionId,
            SolutionDocumentVoidRequest request,
            Long actorUserId) {
        SolutionDocumentResponse current = readableDetail(solutionId, actorUserId);
        if ("approving".equalsIgnoreCase(current.status())) {
            throw new BusinessRuleException("审批中的报价或投标不能修改状态");
        }
        if (!hasText(request.void_reason())) {
            throw new BusinessRuleException("作废方案标书必须填写原因");
        }
        jdbcTemplate.update(
                """
                update crm_solution_documents
                set status = 'voided',
                    void_reason = ?,
                    voided_at = current_timestamp,
                    voided_by = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.void_reason().trim(),
                actorUserId,
                actorUserId,
                solutionId);
        return findById(solutionId);
    }

    private Long insertSolutionDocument(SolutionDocumentCreateRequest request, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_solution_documents (
                        account_id, opportunity_id, document_name, document_type, version_no,
                        status, owner_user_id, customer_requirement_summary, technical_solution_summary,
                        stakeholder_strategy, quotation_amount, cost_amount, estimated_gross_margin_rate,
                        bid_self_check_result, bid_risk_description, submitted_to_customer_at,
                        customer_feedback, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, request.account_id());
            statement.setObject(2, request.opportunity_id());
            statement.setString(3, request.document_name().trim());
            statement.setString(4, request.document_type().trim());
            statement.setString(5, request.version_no().trim());
            statement.setString(6, request.status().trim());
            statement.setObject(7, request.owner_user_id());
            statement.setString(8, normalizeText(request.customer_requirement_summary()));
            statement.setString(9, normalizeText(request.technical_solution_summary()));
            statement.setString(10, normalizeText(request.stakeholder_strategy()));
            statement.setObject(11, request.quotation_amount());
            statement.setObject(12, request.cost_amount());
            statement.setObject(13, request.estimated_gross_margin_rate());
            statement.setString(14, normalizeText(request.bid_self_check_result()));
            statement.setString(15, normalizeText(request.bid_risk_description()));
            statement.setObject(16, request.submitted_to_customer_at());
            statement.setString(17, normalizeText(request.customer_feedback()));
            statement.setString(18, normalizeText(request.remark()));
            statement.setObject(19, actorUserId);
            statement.setObject(20, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private SolutionDocumentResponse findById(Long solutionId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_solution_documents
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new SolutionDocumentResponse(
                            rs.getLong("id"),
                            nullableLong(rs.getObject("tenant_id"), rs.getLong("tenant_id")),
                            rs.getLong("account_id"),
                            rs.getLong("opportunity_id"),
                            rs.getString("document_name"),
                            rs.getString("document_type"),
                            rs.getString("version_no"),
                            rs.getString("status"),
                            nullableLong(rs.getObject("owner_user_id"), rs.getLong("owner_user_id")),
                            rs.getString("customer_requirement_summary"),
                            rs.getString("technical_solution_summary"),
                            rs.getString("stakeholder_strategy"),
                            rs.getBigDecimal("quotation_amount"),
                            rs.getBigDecimal("cost_amount"),
                            rs.getBigDecimal("estimated_gross_margin_rate"),
                            rs.getString("bid_self_check_result"),
                            rs.getString("bid_risk_description"),
                            nullableOffsetDateTime(rs.getObject("submitted_to_customer_at")),
                            rs.getString("customer_feedback"),
                            rs.getString("void_reason"),
                            nullableOffsetDateTime(rs.getObject("voided_at")),
                            nullableLong(rs.getObject("voided_by"), rs.getLong("voided_by")),
                            rs.getString("remark")),
                    solutionId);
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("方案标书不存在或无权访问");
        }
    }

    private static void validateSameAccount(Long requestAccountId, Long opportunityAccountId) {
        if (!Objects.equals(requestAccountId, opportunityAccountId)) {
            throw new BusinessRuleException("方案标书必须关联同一客户下的商机");
        }
    }

    private static String approvalObjectType(SolutionDocumentResponse document) {
        String documentType = normalizeText(document.document_type());
        if (documentType != null
                && ("bid".equalsIgnoreCase(documentType) || "bid_document".equalsIgnoreCase(documentType))) {
            return "bid";
        }
        if ((documentType != null && "quotation".equalsIgnoreCase(documentType))
                || document.quotation_amount() != null) {
            return "quotation";
        }
        throw new BusinessRuleException("仅报价和投标文件支持审批");
    }

    private static void requireApprovalSafeUpdate(
            SolutionDocumentResponse current,
            SolutionDocumentUpdateRequest request) {
        if (!"approving".equalsIgnoreCase(current.status())) {
            return;
        }
        boolean changed = changed(request.document_name(), current.document_name())
                || changed(request.document_type(), current.document_type())
                || changed(request.version_no(), current.version_no())
                || changed(request.status(), current.status())
                || changed(request.owner_user_id(), current.owner_user_id())
                || changed(request.customer_requirement_summary(), current.customer_requirement_summary())
                || changed(request.technical_solution_summary(), current.technical_solution_summary())
                || changed(request.stakeholder_strategy(), current.stakeholder_strategy())
                || changed(request.quotation_amount(), current.quotation_amount())
                || changed(request.cost_amount(), current.cost_amount())
                || changed(request.estimated_gross_margin_rate(), current.estimated_gross_margin_rate())
                || changed(request.bid_self_check_result(), current.bid_self_check_result())
                || changed(request.bid_risk_description(), current.bid_risk_description())
                || changed(request.submitted_to_customer_at(), current.submitted_to_customer_at())
                || changed(request.customer_feedback(), current.customer_feedback());
        if (changed) {
            throw new BusinessRuleException("审批中的报价或投标不能修改关键字段，仅允许更新备注");
        }
    }

    private static boolean changed(String requested, String current) {
        return requested != null && !Objects.equals(normalizeText(requested), normalizeText(current));
    }

    private static boolean changed(java.math.BigDecimal requested, java.math.BigDecimal current) {
        if (requested == null) {
            return false;
        }
        return current == null || requested.compareTo(current) != 0;
    }

    private static boolean changed(Object requested, Object current) {
        return requested != null && !Objects.equals(requested, current);
    }

    private static void appendKeywordFilter(StringBuilder sql, List<Object> parameters, String keyword) {
        if (!hasText(keyword)) {
            return;
        }
        sql.append("  and lower(document_name) like ?\n");
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

    private static String normalizeText(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
