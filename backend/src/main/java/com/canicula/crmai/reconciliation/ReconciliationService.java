package com.canicula.crmai.reconciliation;

import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.auth.ForbiddenException;
import com.canicula.crmai.contract.ContractResponse;
import com.canicula.crmai.contract.ContractService;
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
public class ReconciliationService {

    private static final List<String> RECONCILABLE_INVOICE_STATUSES = List.of("invoiced", "signed");
    private static final List<String> RECONCILABLE_PAYMENT_STATUSES = List.of("confirmed", "partially_reconciled");

    private final JdbcTemplate jdbcTemplate;
    private final ContractService contractService;

    ReconciliationService(JdbcTemplate jdbcTemplate, ContractService contractService) {
        this.jdbcTemplate = jdbcTemplate;
        this.contractService = contractService;
    }

    public ReconciliationWorkbenchResponse workbench(Long actorUserId, ReconciliationWorkbenchFilter filter) {
        List<ReconciliationWorkbenchResponse.PendingInvoice> pendingInvoices = pendingInvoices(actorUserId, filter);
        List<ReconciliationWorkbenchResponse.PendingPayment> pendingPayments = pendingPayments(actorUserId, filter);
        List<ReconciliationResponse> recentReconciliations = readableList(
                        actorUserId,
                        new ReconciliationListFilter(
                                filter.keyword(),
                                filter.account_id(),
                                filter.opportunity_id(),
                                filter.contract_id(),
                                null,
                                null,
                                null,
                                null))
                .stream()
                .limit(20)
                .toList();
        BigDecimal invoiceAmount = pendingInvoices.stream()
                .map(ReconciliationWorkbenchResponse.PendingInvoice::actual_invoice_amount)
                .map(ReconciliationService::nullToZero)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paymentAmount = pendingPayments.stream()
                .map(ReconciliationWorkbenchResponse.PendingPayment::confirmed_amount)
                .map(ReconciliationService::nullToZero)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal reconciledAmount = recentReconciliations.stream()
                .filter(reconciliation -> "active".equals(reconciliation.reconciliation_status()))
                .map(ReconciliationResponse::reconciled_amount)
                .map(ReconciliationService::nullToZero)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal unreconciledInvoiceAmount = pendingInvoices.stream()
                .map(ReconciliationWorkbenchResponse.PendingInvoice::unreconciled_amount)
                .map(ReconciliationService::nullToZero)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal unallocatedPaymentAmount = pendingPayments.stream()
                .map(ReconciliationWorkbenchResponse.PendingPayment::unreconciled_amount)
                .map(ReconciliationService::nullToZero)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new ReconciliationWorkbenchResponse(
                new ReconciliationWorkbenchResponse.Summary(
                        scale(invoiceAmount),
                        scale(paymentAmount),
                        scale(reconciledAmount),
                        scale(unreconciledInvoiceAmount),
                        scale(unallocatedPaymentAmount)),
                pendingInvoices,
                pendingPayments,
                recentReconciliations);
    }

    public List<ReconciliationResponse> readableList(Long actorUserId, ReconciliationListFilter filter) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder filters = new StringBuilder();
        appendKeywordFilter(filters, parameters, filter.keyword());
        appendEqualsFilter(filters, parameters, "account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "contract_id", filter.contract_id());
        appendEqualsFilter(filters, parameters, "invoice_id", filter.invoice_id());
        appendEqualsFilter(filters, parameters, "payment_id", filter.payment_id());
        appendEqualsFilter(filters, parameters, "reconciliation_status", filter.reconciliation_status());
        if (Boolean.TRUE.equals(filter.active_only())) {
            filters.append("  and reconciliation_status = 'active'\n");
        }
        List<Long> reconciliationIds = jdbcTemplate.query(
                """
                select id
                from crm_reconciliations
                where deleted_at is null
                  %s
                order by updated_at desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        List<ReconciliationResponse> readable = new ArrayList<>();
        for (Long reconciliationId : reconciliationIds) {
            try {
                readable.add(readableDetail(reconciliationId, actorUserId));
            } catch (IllegalArgumentException | ForbiddenException ignored) {
                // List queries hide rows outside linked contract data scope.
            }
        }
        return readable;
    }

    public ReconciliationResponse readableDetail(Long reconciliationId, Long actorUserId) {
        ReconciliationRow row = findRow(reconciliationId);
        readableContract(row.contract_id(), actorUserId);
        return toResponse(row);
    }

    @Transactional
    public ReconciliationResponse create(ReconciliationCreateRequest request, Long actorUserId) {
        requirePositive(request.reconciled_amount(), "核销金额必须大于0");
        InvoiceSnapshot invoice = findInvoice(request.invoice_id());
        PaymentSnapshot payment = findPayment(request.payment_id());
        readableContract(invoice.contract_id(), actorUserId);
        if (!Objects.equals(invoice.contract_id(), payment.contract_id())) {
            throw new BusinessRuleException("发票与回款必须属于同一合同");
        }
        if (!RECONCILABLE_INVOICE_STATUSES.contains(invoice.invoice_status())) {
            throw new BusinessRuleException("仅已开票或已签收发票可核销");
        }
        if (!RECONCILABLE_PAYMENT_STATUSES.contains(payment.payment_status())) {
            throw new BusinessRuleException("仅已确认或部分核销回款可核销");
        }
        BigDecimal invoiceRemaining = invoice.unreconciledAmount();
        BigDecimal paymentRemaining = payment.unreconciledAmount();
        if (request.reconciled_amount().compareTo(invoiceRemaining) > 0
                || request.reconciled_amount().compareTo(paymentRemaining) > 0) {
            throw new BusinessRuleException("核销金额不能超过发票或回款剩余金额");
        }
        Long reconciliationId = insertReconciliation(request, invoice, payment, actorUserId);
        int updatedInvoiceCount = jdbcTemplate.update(
                """
                update crm_invoices
                set reconciled_amount = reconciled_amount + ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                  and actual_invoice_amount - reconciled_amount >= ?
                """,
                request.reconciled_amount(),
                actorUserId,
                invoice.id(),
                request.reconciled_amount());
        if (updatedInvoiceCount == 0) {
            throw new BusinessRuleException("核销金额不能超过发票剩余金额");
        }
        int updatedPaymentCount = jdbcTemplate.update(
                """
                update crm_payments
                set reconciled_amount = reconciled_amount + ?,
                    payment_status = case
                        when reconciled_amount + ? < confirmed_amount then 'partially_reconciled'
                        else 'reconciled'
                    end,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                  and confirmed_amount - reconciled_amount >= ?
                """,
                request.reconciled_amount(),
                request.reconciled_amount(),
                actorUserId,
                payment.id(),
                request.reconciled_amount());
        if (updatedPaymentCount == 0) {
            throw new BusinessRuleException("核销金额不能超过回款剩余金额");
        }
        return readableDetail(reconciliationId, actorUserId);
    }

    @Transactional
    public ReconciliationResponse voidReconciliation(Long reconciliationId, ReconciliationVoidRequest request, Long actorUserId) {
        requireText(request.void_reason(), "撤销核销必须填写原因");
        ReconciliationRow row = findRow(reconciliationId);
        readableContract(row.contract_id(), actorUserId);
        if ("voided".equals(row.reconciliation_status())) {
            throw new BusinessRuleException("核销记录已撤销");
        }
        PaymentSnapshot payment = findPayment(row.payment_id());
        BigDecimal nextPaymentReconciledAmount = nullToZero(payment.reconciled_amount()).subtract(row.reconciled_amount());
        if (nextPaymentReconciledAmount.compareTo(BigDecimal.ZERO) < 0) {
            nextPaymentReconciledAmount = BigDecimal.ZERO;
        }
        jdbcTemplate.update(
                """
                update crm_invoices
                set reconciled_amount = case
                        when reconciled_amount - ? < 0 then 0
                        else reconciled_amount - ?
                    end,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                row.reconciled_amount(),
                row.reconciled_amount(),
                actorUserId,
                row.invoice_id());
        jdbcTemplate.update(
                """
                update crm_payments
                set reconciled_amount = ?,
                    payment_status = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                nextPaymentReconciledAmount,
                paymentStatusAfterReconciliation(nextPaymentReconciledAmount, payment.confirmed_amount()),
                actorUserId,
                row.payment_id());
        jdbcTemplate.update(
                """
                update crm_reconciliations
                set reconciliation_status = 'voided',
                    void_reason = ?,
                    voided_at = current_timestamp,
                    voided_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.void_reason().trim(),
                actorUserId,
                reconciliationId);
        return readableDetail(reconciliationId, actorUserId);
    }

    private List<ReconciliationWorkbenchResponse.PendingInvoice> pendingInvoices(
            Long actorUserId,
            ReconciliationWorkbenchFilter filter) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder filters = new StringBuilder();
        appendEqualsFilter(filters, parameters, "account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "contract_id", filter.contract_id());
        if (hasText(filter.keyword())) {
            filters.append("  and (lower(plan_name) like ? or lower(invoice_no) like ?)\n");
            String keyword = "%" + filter.keyword().trim().toLowerCase() + "%";
            parameters.add(keyword);
            parameters.add(keyword);
        }
        List<Long> invoiceIds = jdbcTemplate.query(
                """
                select id
                from crm_invoices
                where deleted_at is null
                  and invoice_status in ('invoiced', 'signed')
                  and actual_invoice_amount > reconciled_amount
                  %s
                order by invoice_date desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        List<ReconciliationWorkbenchResponse.PendingInvoice> invoices = new ArrayList<>();
        for (Long invoiceId : invoiceIds) {
            try {
                InvoiceSnapshot invoice = findInvoice(invoiceId);
                readableContract(invoice.contract_id(), actorUserId);
                invoices.add(new ReconciliationWorkbenchResponse.PendingInvoice(
                        invoice.id(),
                        invoice.account_id(),
                        invoice.opportunity_id(),
                        invoice.contract_id(),
                        invoice.plan_name(),
                        invoice.invoice_no(),
                        invoice.invoice_status(),
                        invoice.actual_invoice_amount(),
                        invoice.reconciled_amount(),
                        invoice.unreconciledAmount()));
            } catch (IllegalArgumentException ignored) {
                // Hide unreadable invoice rows.
            }
        }
        return invoices;
    }

    private List<ReconciliationWorkbenchResponse.PendingPayment> pendingPayments(
            Long actorUserId,
            ReconciliationWorkbenchFilter filter) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder filters = new StringBuilder();
        appendEqualsFilter(filters, parameters, "account_id", filter.account_id());
        appendEqualsFilter(filters, parameters, "opportunity_id", filter.opportunity_id());
        appendEqualsFilter(filters, parameters, "contract_id", filter.contract_id());
        if (hasText(filter.keyword())) {
            filters.append("  and (lower(payment_name) like ? or lower(bank_flow_no) like ?)\n");
            String keyword = "%" + filter.keyword().trim().toLowerCase() + "%";
            parameters.add(keyword);
            parameters.add(keyword);
        }
        List<Long> paymentIds = jdbcTemplate.query(
                """
                select id
                from crm_payments
                where deleted_at is null
                  and payment_status in ('confirmed', 'partially_reconciled')
                  and confirmed_amount > reconciled_amount
                  %s
                order by received_at desc, id desc
                """.formatted(filters),
                (rs, rowNum) -> rs.getLong("id"),
                parameters.toArray());
        List<ReconciliationWorkbenchResponse.PendingPayment> payments = new ArrayList<>();
        for (Long paymentId : paymentIds) {
            try {
                PaymentSnapshot payment = findPayment(paymentId);
                readableContract(payment.contract_id(), actorUserId);
                payments.add(new ReconciliationWorkbenchResponse.PendingPayment(
                        payment.id(),
                        payment.account_id(),
                        payment.opportunity_id(),
                        payment.contract_id(),
                        payment.payment_name(),
                        payment.payment_status(),
                        payment.received_at(),
                        payment.confirmed_amount(),
                        payment.reconciled_amount(),
                        payment.unreconciledAmount()));
            } catch (IllegalArgumentException ignored) {
                // Hide unreadable payment rows.
            }
        }
        return payments;
    }

    private Long insertReconciliation(
            ReconciliationCreateRequest request,
            InvoiceSnapshot invoice,
            PaymentSnapshot payment,
            Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        String reconciliationNo = "REC-" + actorUserId + "-" + System.nanoTime();
        OffsetDateTime reconciledAt = request.reconciled_at() == null ? OffsetDateTime.now() : request.reconciled_at();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into crm_reconciliations (
                        account_id, opportunity_id, contract_id, invoice_id, payment_id,
                        reconciliation_no, reconciliation_status, reconciled_amount,
                        reconciled_at, reconciled_by, reconcile_note
                    )
                    values (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setObject(1, invoice.account_id());
            statement.setObject(2, invoice.opportunity_id());
            statement.setObject(3, invoice.contract_id());
            statement.setObject(4, invoice.id());
            statement.setObject(5, payment.id());
            statement.setString(6, reconciliationNo);
            statement.setObject(7, request.reconciled_amount());
            statement.setObject(8, reconciledAt);
            statement.setObject(9, actorUserId);
            statement.setString(10, normalizeText(request.reconcile_note()));
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private ReconciliationResponse toResponse(ReconciliationRow row) {
        InvoiceSnapshot invoice = findInvoice(row.invoice_id());
        PaymentSnapshot payment = findPayment(row.payment_id());
        return new ReconciliationResponse(
                row.id(),
                row.account_id(),
                row.opportunity_id(),
                row.contract_id(),
                row.invoice_id(),
                row.payment_id(),
                invoice.invoice_no(),
                payment.payment_name(),
                row.reconciliation_no(),
                row.reconciliation_status(),
                row.reconciled_amount(),
                row.reconciled_at(),
                row.reconciled_by(),
                row.reconcile_note(),
                row.void_reason(),
                row.voided_at(),
                row.voided_by(),
                invoice.actual_invoice_amount(),
                invoice.reconciled_amount(),
                invoice.unreconciledAmount(),
                payment.confirmed_amount(),
                payment.reconciled_amount(),
                payment.unreconciledAmount(),
                row.created_at(),
                row.updated_at());
    }

    private ReconciliationRow findRow(Long reconciliationId) {
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_reconciliations
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new ReconciliationRow(
                            rs.getLong("id"),
                            rs.getLong("account_id"),
                            nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                            rs.getLong("contract_id"),
                            rs.getLong("invoice_id"),
                            rs.getLong("payment_id"),
                            rs.getString("reconciliation_no"),
                            rs.getString("reconciliation_status"),
                            rs.getBigDecimal("reconciled_amount"),
                            nullableOffsetDateTime(rs.getObject("reconciled_at")),
                            rs.getLong("reconciled_by"),
                            rs.getString("reconcile_note"),
                            rs.getString("void_reason"),
                            nullableOffsetDateTime(rs.getObject("voided_at")),
                            nullableLong(rs.getObject("voided_by"), rs.getLong("voided_by")),
                            nullableOffsetDateTime(rs.getObject("created_at")),
                            nullableOffsetDateTime(rs.getObject("updated_at"))),
                    reconciliationId);
        } catch (EmptyResultDataAccessException exception) {
            throw new IllegalArgumentException("核销记录不存在或已删除");
        }
    }

    private InvoiceSnapshot findInvoice(Long invoiceId) {
        if (invoiceId == null) {
            throw new BusinessRuleException("发票不能为空");
        }
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_invoices
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new InvoiceSnapshot(
                            rs.getLong("id"),
                            rs.getLong("account_id"),
                            nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                            rs.getLong("contract_id"),
                            rs.getString("plan_name"),
                            rs.getString("invoice_no"),
                            rs.getString("invoice_status"),
                            rs.getBigDecimal("actual_invoice_amount"),
                            rs.getBigDecimal("reconciled_amount")),
                    invoiceId);
        } catch (EmptyResultDataAccessException exception) {
            throw new BusinessRuleException("发票不存在或已删除");
        }
    }

    private PaymentSnapshot findPayment(Long paymentId) {
        if (paymentId == null) {
            throw new BusinessRuleException("到账流水不能为空");
        }
        try {
            return jdbcTemplate.queryForObject(
                    """
                    select *
                    from crm_payments
                    where id = ?
                      and deleted_at is null
                    """,
                    (rs, rowNum) -> new PaymentSnapshot(
                            rs.getLong("id"),
                            rs.getLong("account_id"),
                            nullableLong(rs.getObject("opportunity_id"), rs.getLong("opportunity_id")),
                            rs.getLong("contract_id"),
                            rs.getString("payment_name"),
                            rs.getString("payment_status"),
                            nullableOffsetDateTime(rs.getObject("received_at")),
                            rs.getBigDecimal("confirmed_amount"),
                            rs.getBigDecimal("reconciled_amount")),
                    paymentId);
        } catch (EmptyResultDataAccessException exception) {
            throw new BusinessRuleException("到账流水不存在或已删除");
        }
    }

    private ContractResponse readableContract(Long contractId, Long actorUserId) {
        if (contractId == null) {
            throw new BusinessRuleException("合同不能为空");
        }
        return contractService.readableDetail(contractId, actorUserId);
    }

    private static String paymentStatusAfterReconciliation(BigDecimal reconciledAmount, BigDecimal confirmedAmount) {
        BigDecimal normalizedReconciled = nullToZero(reconciledAmount);
        BigDecimal normalizedConfirmed = nullToZero(confirmedAmount);
        if (normalizedReconciled.compareTo(BigDecimal.ZERO) <= 0) {
            return "confirmed";
        }
        if (normalizedReconciled.compareTo(normalizedConfirmed) < 0) {
            return "partially_reconciled";
        }
        return "reconciled";
    }

    private static void appendKeywordFilter(StringBuilder sql, List<Object> parameters, String keyword) {
        if (!hasText(keyword)) {
            return;
        }
        sql.append(
                """
                  and (
                      lower(reconciliation_no) like ?
                      or lower(reconcile_note) like ?
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

    private static void requirePositive(BigDecimal amount, String message) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException(message);
        }
    }

    private static void requireText(String value, String message) {
        if (!hasText(value)) {
            throw new BusinessRuleException(message);
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String normalizeText(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : value;
    }

    private static BigDecimal scale(BigDecimal value) {
        return nullToZero(value).setScale(2, RoundingMode.HALF_UP);
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

    private record InvoiceSnapshot(
            Long id,
            Long account_id,
            Long opportunity_id,
            Long contract_id,
            String plan_name,
            String invoice_no,
            String invoice_status,
            BigDecimal actual_invoice_amount,
            BigDecimal reconciled_amount) {

        BigDecimal unreconciledAmount() {
            BigDecimal amount = nullToZero(actual_invoice_amount).subtract(nullToZero(reconciled_amount));
            return amount.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : amount;
        }
    }

    private record PaymentSnapshot(
            Long id,
            Long account_id,
            Long opportunity_id,
            Long contract_id,
            String payment_name,
            String payment_status,
            OffsetDateTime received_at,
            BigDecimal confirmed_amount,
            BigDecimal reconciled_amount) {

        BigDecimal unreconciledAmount() {
            BigDecimal amount = nullToZero(confirmed_amount).subtract(nullToZero(reconciled_amount));
            return amount.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : amount;
        }
    }

    private record ReconciliationRow(
            Long id,
            Long account_id,
            Long opportunity_id,
            Long contract_id,
            Long invoice_id,
            Long payment_id,
            String reconciliation_no,
            String reconciliation_status,
            BigDecimal reconciled_amount,
            OffsetDateTime reconciled_at,
            Long reconciled_by,
            String reconcile_note,
            String void_reason,
            OffsetDateTime voided_at,
            Long voided_by,
            OffsetDateTime created_at,
            OffsetDateTime updated_at) {
    }
}
