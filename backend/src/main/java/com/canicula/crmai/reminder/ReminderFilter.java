package com.canicula.crmai.reminder;

public record ReminderFilter(
        String status,
        Boolean overdue,
        String object_type,
        Long object_id) {
}
