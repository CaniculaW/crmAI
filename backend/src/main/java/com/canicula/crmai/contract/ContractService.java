package com.canicula.crmai.contract;

import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.approval.ApprovalService;
import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.opportunity.OpportunityService;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
public class ContractService {

    private final JdbcTemplate jdbcTemplate;
    private final AccountService accountService;
    private final OpportunityService opportunityService;
    private final ApprovalService approvalService;

    ContractService(
            JdbcTemplate jdbcTemplate,
            AccountService accountService,
            OpportunityService opportunityService,
            ApprovalService approvalService) {
        this.jdbcTemplate = jdbcTemplate;
        this.accountService = accountService;
        this.opportunityService = opportunityService;
        this.approvalService = approvalService;
    }

    @Transactional
    public ContractResponse create(ContractCreateRequest request, Long actorUserId) {
        validateReadableBusinessObject(request.account_id(), request.opportunity_id(), actorUserId);
        Long contractId = insertContract(request, actorUserId);
        return findById(contractId);
    }

    public List<ContractResponse> readableList(Long actorUserId, ContractListFilter filter) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "contract_type", filter.contract_type());
        appendEqualsFilter(filters, parameters, "contract_status", filter.contract_status());
        appendEqualsFilter(filters, parameters, "risk_level", filter.risk_level());
        appendEqualsFilter(filters, parameters, "owner_user_id", filter.owner_user_id());
        appendEqualsFilter(filters, parameters, "business_owner_id", filter.business_owner_id());
        List<Long> contractIds = jdbcTemplate.query(
                """
                select id
                from crm_contracts
                where deleted_at is null
                  %s
                order by updated_at desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        List<ContractResponse> readableContracts = new ArrayList<>();
        for (Long contractId : contractIds) {
            try {
                readableContracts.add(readableDetail(contractId, actorUserId));
            } catch (IllegalArgumentException | ForbiddenException ignored) {
                // List queries hide rows outside the linked opportunity/account data scope.
            }
        }
        return readableContracts;
    }

    public ContractResponse readableDetail(Long contractId, Long actorUserId) {
        ContractResponse response = findById(contractId);
        try {
            validateReadableBusinessObject(response.account_id(), response.opportunity_id(), actorUserId);
            return response;
        } catch (IllegalArgumentException exception) {
            throw new ForbiddenException("合同不存在或无权访问");
        }
    }

    @Transactional
    public ContractResponse update(Long contractId, ContractUpdateRequest request, Long actorUserId) {
        ContractResponse current = readableDetail(contractId, actorUserId);
        boolean approvalSensitiveUpdate = hasApprovalSensitiveInput(request);
        requireApprovalSafeUpdate(current, approvalSensitiveUpdate);
        List<ContractChange> changes = detectChanges(current, request);
        if (!changes.isEmpty() && !hasText(request.change_reason())) {
            throw new BusinessRuleException("修改合同金额、付款条件、开票条件、交付范围或风险必须填写变更原因");
        }
        BigDecimal effectiveAmount = request.contract_amount() == null
                ? current.contract_amount()
                : request.contract_amount();
        BigDecimal effectiveTaxRate = request.tax_rate() == null
                ? current.tax_rate()
                : request.tax_rate();
        BigDecimal effectiveNetAmount = calculateNetAmount(effectiveAmount, effectiveTaxRate);
        String approvalStatusGuard = approvalSensitiveUpdate ? "and contract_status <> 'approving'" : "";
        int updatedCount = jdbcTemplate.update(
                ("""
                update crm_contracts
                set contract_name = coalesce(?, contract_name),
                    contract_no = coalesce(?, contract_no),
                    contract_type = coalesce(?, contract_type),
                    contract_status = coalesce(?, contract_status),
                    contract_amount = coalesce(?, contract_amount),
                    tax_rate = coalesce(?, tax_rate),
                    net_amount = ?,
                    our_signing_entity = coalesce(?, our_signing_entity),
                    customer_signing_entity = coalesce(?, customer_signing_entity),
                    owner_user_id = coalesce(?, owner_user_id),
                    business_owner_id = coalesce(?, business_owner_id),
                    signed_at = coalesce(?, signed_at),
                    effective_at = coalesce(?, effective_at),
                    ended_at = coalesce(?, ended_at),
                    payment_terms = coalesce(?, payment_terms),
                    invoice_terms = coalesce(?, invoice_terms),
                    delivery_scope = coalesce(?, delivery_scope),
                    acceptance_criteria = coalesce(?, acceptance_criteria),
                    risk_level = coalesce(?, risk_level),
                    risk_description = coalesce(?, risk_description),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                  %s
                """).formatted(approvalStatusGuard),
                normalizeText(request.contract_name()),
                normalizeText(request.contract_no()),
                normalizeText(request.contract_type()),
                normalizeText(request.contract_status()),
                request.contract_amount(),
                request.tax_rate(),
                effectiveNetAmount,
                normalizeText(request.our_signing_entity()),
                normalizeText(request.customer_signing_entity()),
                request.owner_user_id(),
                request.business_owner_id(),
                request.signed_at(),
                request.effective_at(),
                request.ended_at(),
                normalizeText(request.payment_terms()),
                normalizeText(request.invoice_terms()),
                normalizeText(request.delivery_scope()),
                normalizeText(request.acceptance_criteria()),
                normalizeText(request.risk_level()),
                normalizeText(request.risk_description()),
                normalizeText(request.remark()),
                actorUserId,
                contractId);
        if (updatedCount != 1) {
            throw new BusinessRuleException("合同状态已变化，请刷新后重试");
        }
        for (ContractChange change : changes) {
            insertChange(contractId, change, request.change_reason().trim(), actorUserId);
        }
        return findById(contractId);
    }

    @Transactional
    public long submitApproval(Long contractId, Long actorUserId) {
        approvalService.requireActorPermission(actorUserId, "contract.read");
        approvalService.requireActorPermission(actorUserId, "approval.submit");
        ContractResponse current = readableDetail(contractId, actorUserId);
        return approvalService.submitBusinessObject("contract", current.id(), current.contract_name(), actorUserId);
    }

    @Transactional
    public ContractResponse terminate(Long contractId, ContractTerminateRequest request, Long actorUserId) {
        ContractResponse current = readableDetail(contractId, actorUserId);
        if ("approving".equalsIgnoreCase(current.contract_status())) {
            throw new BusinessRuleException("审批中的合同不能修改状态");
        }
        if (!hasText(request.termination_reason())) {
            throw new BusinessRuleException("终止合同必须填写原因");
        }
        int updatedCount = jdbcTemplate.update(
                """
                update crm_contracts
                set contract_status = 'terminated',
                    termination_reason = ?,
                    terminated_at = current_timestamp,
                    terminated_by = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                  and contract_status <> 'approving'
                """,
                request.termination_reason().trim(),
                actorUserId,
                actorUserId,
                contractId);
        if (updatedCount != 1) {
            throw new BusinessRuleException("合同状态已变化，请刷新后重试");
        }
        return findById(contractId);
    }

    public List<ContractChangeResponse> readableChanges(Long contractId, Long actorUserId) {
        readableDetail(contractId, actorUserId);
        return jdbcTemplate.query(
                """
                select *
                from crm_contract_changes
                where contract_id = ?
                order by changed_at desc, id desc
                """,
                (rs, rowNum) -> new ContractChangeResponse(
                        rs.getLong("id"),
                        rs.getLong("contract_id"),
                        rs.getString("change_type"),
                        rs.getString("before_value"),
                        rs.getString("after_value"),
                        rs.getString("change_reason"),
                        nullableLong(rs.getObject("changed_by"), rs.getLong("changed_by")),
                        nullableOffsetDateTime(rs.getObject("changed_at"))),
                contractId);
    }

    public List<ContractMilestoneResponse> readableMilestones(Long contractId, Long actorUserId) {
        readableDetail(contractId, actorUserId);
        return jdbcTemplate.query(
                """
                select id
                from crm_contract_milestones
                where contract_id = ?
                  and deleted_at is null
                order by planned_at asc, id asc
                """,
                (rs, rowNum) -> findMilestoneById(rs.getLong("id")),
                contractId);
    }

    @Transactional
    public ContractMilestoneResponse createMilestone(
            Long contractId,
            ContractMilestoneCreateRequest request,
            Long actorUserId) {
        readableDetail(contractId, actorUserId);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_contract_milestones (
                        contract_id, milestone_name, milestone_type, planned_at,
                        actual_at, status, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, contractId);
            statement.setString(2, request.milestone_name().trim());
            statement.setString(3, request.milestone_type().trim());
            statement.setObject(4, request.planned_at());
            statement.setObject(5, request.actual_at());
            statement.setString(6, request.status().trim());
            statement.setString(7, normalizeText(request.remark()));
            statement.setObject(8, actorUserId);
            statement.setObject(9, actorUserId);
            return statement;
        }, keyHolder);
        return findMilestoneById(Objects.requireNonNull(keyHolder.getKey()).longValue());
    }

    @Transactional
    public ContractMilestoneResponse updateMilestone(
            Long contractId,
            Long milestoneId,
            ContractMilestoneUpdateRequest request,
            Long actorUserId) {
        readableDetail(contractId, actorUserId);
        ContractMilestoneResponse current = findMilestoneById(milestoneId);
        if (!Objects.equals(current.contract_id(), contractId)) {
            throw new IllegalArgumentException("合同节点不存在或无权访问");
        }
        jdbcTemplate.update(
                """
                update crm_contract_milestones
                set milestone_name = coalesce(?, milestone_name),
                    milestone_type = coalesce(?, milestone_type),
                    planned_at = coalesce(?, planned_at),
                    actual_at = coalesce(?, actual_at),
                    status = coalesce(?, status),
                    remark = coalesce(?, remark),
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and contract_id = ?
                  and deleted_at is null
                """,
                normalizeText(request.milestone_name()),
                normalizeText(request.milestone_type()),
                request.planned_at(),
                request.actual_at(),
                normalizeText(request.status()),
                normalizeText(request.remark()),
                actorUserId,
                milestoneId,
                contractId);
        return findMilestoneById(milestoneId);
    }

    private void validateReadableBusinessObject(Long accountId, Long opportunityId, Long actorUserId) {
        AccountResponse account = accountService.readableDetail(accountId, actorUserId);
        if (opportunityId == null) {
            return;
        }
        OpportunityResponse opportunity = opportunityService.readableDetail(opportunityId, actorUserId);
        if (!Objects.equals(account.id(), opportunity.account_id())) {
            throw new BusinessRuleException("合同必须关联同一客户下的商机");
        }
    }

    private Long insertContract(ContractCreateRequest request, Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        BigDecimal netAmount = calculateNetAmount(request.contract_amount(), request.tax_rate());
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_contracts (
                        account_id, opportunity_id, contract_name, contract_no, contract_type,
                        contract_status, contract_amount, tax_rate, net_amount, our_signing_entity,
                        customer_signing_entity, owner_user_id, business_owner_id, signed_at,
                        effective_at, ended_at, payment_terms, invoice_terms, delivery_scope,
                        acceptance_criteria, risk_level, risk_description, remark, created_by, updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, request.account_id());
            statement.setObject(2, request.opportunity_id());
            statement.setString(3, request.contract_name().trim());
            statement.setString(4, normalizeText(request.contract_no()));
            statement.setString(5, request.contract_type().trim());
            statement.setString(6, request.contract_status().trim());
            statement.setObject(7, request.contract_amount());
            statement.setObject(8, request.tax_rate());
            statement.setObject(9, netAmount);
            statement.setString(10, normalizeText(request.our_signing_entity()));
            statement.setString(11, normalizeText(request.customer_signing_entity()));
            statement.setObject(12, request.owner_user_id());
            statement.setObject(13, request.business_owner_id());
            statement.setObject(14, request.signed_at());
            statement.setObject(15, request.effective_at());
            statement.setObject(16, request.ended_at());
            statement.setString(17, normalizeText(request.payment_terms()));
            statement.setString(18, normalizeText(request.invoice_terms()));
            statement.setString(19, normalizeText(request.delivery_scope()));
            statement.setString(20, normalizeText(request.acceptance_criteria()));
            statement.setString(21, normalizeText(request.risk_level()));
            statement.setString(22, normalizeText(request.risk_description()));
            statement.setString(23, normalizeText(request.remark()));
            statement.setObject(24, actorUserId);
            statement.setObject(25, actorUserId);
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private ContractResponse findById(Long contractId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_contracts
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new ContractResponse(
                            rs.getLong("id"),
                            nullableLong(rs.getObject("tenant_id"), rs.getLong("tenant_id")),
                            rs.getLong("account_id"),
                            nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                            rs.getString("contract_name"),
                            rs.getString("contract_no"),
                            rs.getString("contract_type"),
                            rs.getString("contract_status"),
                            rs.getBigDecimal("contract_amount"),
                            rs.getBigDecimal("tax_rate"),
                            rs.getBigDecimal("net_amount"),
                            rs.getString("our_signing_entity"),
                            rs.getString("customer_signing_entity"),
                            nullableLong(rs.getObject("owner_user_id"), rs.getLong("owner_user_id")),
                            nullableLong(rs.getObject("business_owner_id"), rs.getLong("business_owner_id")),
                            nullableOffsetDateTime(rs.getObject("signed_at")),
                            nullableOffsetDateTime(rs.getObject("effective_at")),
                            nullableOffsetDateTime(rs.getObject("ended_at")),
                            rs.getString("payment_terms"),
                            rs.getString("invoice_terms"),
                            rs.getString("delivery_scope"),
                            rs.getString("acceptance_criteria"),
                            rs.getString("risk_level"),
                            rs.getString("risk_description"),
                            rs.getString("termination_reason"),
                            nullableOffsetDateTime(rs.getObject("terminated_at")),
                            nullableLong(rs.getObject("terminated_by"), rs.getLong("terminated_by")),
                            rs.getString("remark"),
                            nullableOffsetDateTime(rs.getObject("created_at")),
                            nullableOffsetDateTime(rs.getObject("updated_at"))),
                    contractId);
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("合同不存在或已删除");
        }
    }

    private void insertChange(Long contractId, ContractChange change, String reason, Long actorUserId) {
        jdbcTemplate.update(
                """
                insert into crm_contract_changes (
                    contract_id, change_type, before_value, after_value, change_reason, changed_by
                )
                values (?, ?, ?, ?, ?, ?)
                """,
                contractId,
                change.changeType(),
                change.beforeValue(),
                change.afterValue(),
                reason,
                actorUserId);
    }

    private ContractMilestoneResponse findMilestoneById(Long milestoneId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_contract_milestones
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new ContractMilestoneResponse(
                            rs.getLong("id"),
                            rs.getLong("contract_id"),
                            rs.getString("milestone_name"),
                            rs.getString("milestone_type"),
                            nullableOffsetDateTime(rs.getObject("planned_at")),
                            nullableOffsetDateTime(rs.getObject("actual_at")),
                            rs.getString("status"),
                            rs.getString("remark"),
                            nullableOffsetDateTime(rs.getObject("created_at")),
                            nullableOffsetDateTime(rs.getObject("updated_at"))),
                    milestoneId);
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("合同节点不存在或已删除");
        }
    }

    private static void requireApprovalSafeUpdate(ContractResponse current, boolean approvalSensitiveUpdate) {
        if (!"approving".equalsIgnoreCase(current.contract_status())) {
            return;
        }
        if (approvalSensitiveUpdate) {
            throw new BusinessRuleException("审批中的合同不能修改关键字段，仅允许更新备注");
        }
    }

    private static boolean hasApprovalSensitiveInput(ContractUpdateRequest request) {
        return request.contract_name() != null
                || request.contract_no() != null
                || request.contract_type() != null
                || request.contract_status() != null
                || request.contract_amount() != null
                || request.tax_rate() != null
                || request.our_signing_entity() != null
                || request.customer_signing_entity() != null
                || request.owner_user_id() != null
                || request.business_owner_id() != null
                || request.signed_at() != null
                || request.effective_at() != null
                || request.ended_at() != null
                || request.payment_terms() != null
                || request.invoice_terms() != null
                || request.delivery_scope() != null
                || request.acceptance_criteria() != null
                || request.risk_level() != null
                || request.risk_description() != null;
    }

    private static List<ContractChange> detectChanges(ContractResponse current, ContractUpdateRequest request) {
        List<ContractChange> changes = new ArrayList<>();
        if (request.contract_amount() != null && current.contract_amount().compareTo(request.contract_amount()) != 0) {
            changes.add(new ContractChange("amount", current.contract_amount().toPlainString(), request.contract_amount().toPlainString()));
        }
        detectTextChange(changes, "payment_terms", current.payment_terms(), request.payment_terms());
        detectTextChange(changes, "invoice_terms", current.invoice_terms(), request.invoice_terms());
        detectTextChange(changes, "scope", current.delivery_scope(), request.delivery_scope());
        detectTextChange(changes, "risk", current.risk_level(), request.risk_level());
        detectTextChange(changes, "risk", current.risk_description(), request.risk_description());
        return changes;
    }

    private static void detectTextChange(List<ContractChange> changes, String changeType, String current, String requested) {
        if (requested == null) {
            return;
        }
        String normalized = normalizeText(requested);
        if (!Objects.equals(current, normalized)) {
            changes.add(new ContractChange(changeType, current, normalized));
        }
    }

    private static BigDecimal calculateNetAmount(BigDecimal contractAmount, BigDecimal taxRate) {
        if (contractAmount == null) {
            return null;
        }
        if (taxRate == null) {
            return contractAmount;
        }
        return contractAmount.divide(BigDecimal.ONE.add(taxRate), 2, RoundingMode.HALF_UP);
    }

    private static void appendKeywordFilter(StringBuilder sql, List<Object> parameters, String keyword) {
        if (!hasText(keyword)) {
            return;
        }
        sql.append(
                """
                  and (
                      lower(contract_name) like ?
                      or lower(contract_no) like ?
                  )
                """);
        String keywordPattern = "%" + keyword.trim().toLowerCase() + "%";
        parameters.add(keywordPattern);
        parameters.add(keywordPattern);
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

    private record ContractChange(String changeType, String beforeValue, String afterValue) {
    }
}
