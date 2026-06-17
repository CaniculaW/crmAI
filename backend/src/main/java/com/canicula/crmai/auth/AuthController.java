package com.canicula.crmai.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AuthService authService;

    AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/auth/login")
    AuthTokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request, httpRequest);
    }

    @GetMapping("/api/auth/me")
    CurrentUserResponse me(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return authService.currentUser(bearerToken(authorization));
    }

    @PostMapping("/api/auth/logout")
    Map<String, Boolean> logout(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        authService.logout(bearerToken(authorization), request);
        return Map.of("logged_out", true);
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("登录状态已失效");
        }
        return authorization.substring("Bearer ".length());
    }
}
