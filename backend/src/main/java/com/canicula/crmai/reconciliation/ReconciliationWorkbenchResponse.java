package com.canicula.crmai.reconciliation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record ReconciliationWorkbenchResponse(
        Summary summary,
        List<PendingInvoice> pending_invoices,
        List<PendingPayment> pending_payments,
        List<ReconciliationResponse> recent_reconciliations) {

    public record Summary(
            BigDecimal effective_invoice_amount,
            BigDecimal confirmed_payment_amount,
            BigDecimal reconciled_amount,
            BigDecimal unreconciled_invoice_amount,
            BigDecimal unallocated_payment_amount) {
    }

    public record PendingInvoice(
            Long id,
            Long account_id,
            Long opportunity_id,
            Long contract_id,
            String plan_name,
            String invoice_no,
            String invoice_status,
            BigDecimal actual_invoice_amount,
            BigDecimal reconciled_amount,
            BigDecimal unreconciled_amount) {
    }

    public record PendingPayment(
            Long id,
            Long account_id,
            Long opportunity_id,
            Long contract_id,
            String payment_name,
            String payment_status,
            OffsetDateTime received_at,
            BigDecimal confirmed_amount,
            BigDecimal reconciled_amount,
            BigDecimal unreconciled_amount) {
    }
}
