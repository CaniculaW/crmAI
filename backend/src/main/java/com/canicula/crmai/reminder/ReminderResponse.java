package com.canicula.crmai.reminder;

import java.time.OffsetDateTime;

public record ReminderResponse(
        Long id,
        String object_type,
        Long object_id,
        String reminder_type,
        String title,
        Long assignee_id,
        OffsetDateTime due_at,
        String status,
        OffsetDateTime completed_at,
        Long completed_by) {
}
