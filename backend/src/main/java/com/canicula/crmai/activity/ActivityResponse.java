package com.canicula.crmai.activity;

import java.time.OffsetDateTime;
import java.util.List;

public record ActivityResponse(
        Long id,
        Long account_id,
        Long opportunity_id,
        String subject,
        String activity_type,
        String activity_status,
        String activity_result,
        OffsetDateTime activity_time,
        OffsetDateTime next_follow_up_at,
        Long owner_department_id,
        Long owner_user_id,
        String communication_content,
        String customer_feedback,
        String conclusion,
        String next_plan,
        String risk_description,
        Boolean include_in_weekly_progress,
        String weekly_period,
        String source_type,
        OffsetDateTime completed_at,
        Long completed_by,
        String remark,
        List<Long> contact_ids,
        List<ActivityParticipantResponse> participants,
        List<String> risk_types) {
}
