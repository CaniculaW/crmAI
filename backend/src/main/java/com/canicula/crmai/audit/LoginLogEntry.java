package com.canicula.crmai.audit;

import java.util.Objects;

public record LoginLogEntry(
        Long userId,
        String loginIdentifier,
        String eventType,
        boolean success,
        String failureReason,
        String ipAddress,
        String userAgent,
        String traceId) {

    public LoginLogEntry {
        Objects.requireNonNull(eventType, "eventType must not be null");
    }
}
