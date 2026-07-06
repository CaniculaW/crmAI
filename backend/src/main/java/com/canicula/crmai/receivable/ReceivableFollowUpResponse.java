package com.canicula.crmai.receivable;

import java.time.OffsetDateTime;

public record ReceivableFollowUpResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        Long contract_id,
        Long receivable_plan_id,
        OffsetDateTime follow_up_at,
        Long follow_up_by,
        String follow_up_content,
        String customer_feedback,
        String next_action,
        OffsetDateTime next_follow_up_at,
        String remark,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
