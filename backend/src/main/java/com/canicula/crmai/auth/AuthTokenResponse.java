package com.canicula.crmai.auth;

public record AuthTokenResponse(
        String access_token,
        String token_type,
        CurrentUserResponse user) {
}
