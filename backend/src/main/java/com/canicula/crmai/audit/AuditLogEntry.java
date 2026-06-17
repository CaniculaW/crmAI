package com.canicula.crmai.audit;

import java.util.Objects;

public record AuditLogEntry(
        Long actorUserId,
        String moduleCode,
        String actionCode,
        String objectType,
        Long objectId,
        Object beforeData,
        Object afterData,
        String result,
        String failureReason,
        String ipAddress,
        String userAgent,
        String traceId) {

    public AuditLogEntry {
        Objects.requireNonNull(moduleCode, "moduleCode must not be null");
        Objects.requireNonNull(actionCode, "actionCode must not be null");
        Objects.requireNonNull(result, "result must not be null");
    }
}
