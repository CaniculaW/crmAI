package com.canicula.crmai.activity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;

public record ActivityCreateRequest(
        @NotNull Long account_id,
        Long opportunity_id,
        @NotBlank @Size(max = 255) String subject,
        @NotBlank @Size(max = 64) String activity_type,
        @NotBlank @Size(max = 64) String activity_status,
        @Size(max = 64) String activity_result,
        @NotNull OffsetDateTime activity_time,
        OffsetDateTime next_follow_up_at,
        @NotNull Long owner_department_id,
        @NotNull Long owner_user_id,
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
