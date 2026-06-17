package com.canicula.crmai.identity;

public record LoginAccountCreateRequest(
        Long userId,
        String loginType,
        String loginIdentifier,
        boolean primary,
        String status) {
}
