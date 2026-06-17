package com.canicula.crmai.activity;

import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;

public record ActivityUpdateRequest(
        @Size(max = 255) String subject,
        @Size(max = 64) String activity_type,
        @Size(max = 64) String activity_status,
        @Size(max = 64) String activity_result,
        OffsetDateTime activity_time,
        OffsetDateTime next_follow_up_at,
        String communication_content,
        String customer_feedback,
        String conclusion,
        String next_plan,
        String risk_description,
        Boolean include_in_weekly_progress,
        @Size(max = 32) String weekly_period,
        @Size(max = 64) String source_type,
        @Size(max = 512) String remark,
        List<Long> contact_ids,
        List<ActivityParticipantRequest> participants,
        List<String> risk_types) {
}
