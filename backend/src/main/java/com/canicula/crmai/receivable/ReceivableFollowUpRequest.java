package com.canicula.crmai.receivable;

import java.time.OffsetDateTime;

public record ReceivableFollowUpRequest(
        OffsetDateTime follow_up_at,
        String follow_up_content,
        String customer_feedback,
        String next_action,
        OffsetDateTime next_follow_up_at,
        String remark) {
}
