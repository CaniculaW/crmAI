package com.canicula.crmai.system;

import com.canicula.crmai.auth.AuthService;
import com.canicula.crmai.auth.CurrentUserResponse;
import com.canicula.crmai.auth.UnauthorizedException;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BootstrapController {

    private final AuthService authService;
    private final JdbcTemplate jdbcTemplate;

    BootstrapController(AuthService authService, JdbcTemplate jdbcTemplate) {
        this.authService = authService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/api/bootstrap")
    BootstrapResponse bootstrap(@RequestHeader(name = "Authorization", required = false) String authorization) {
        CurrentUserResponse currentUser = authService.currentUser(bearerToken(authorization));
        return new BootstrapResponse(
                currentUser,
                currentUser.permissions().size(),
                Map.of(
                        "departments", count("select count(*) from sys_departments where deleted_at is null"),
                        "users", count("select count(*) from sys_users where deleted_at is null"),
                        "roles", count("select count(*) from sys_roles where deleted_at is null"),
                        "accounts", count("select count(*) from crm_accounts where deleted_at is null"),
                        "contacts", count("select count(*) from crm_contacts where deleted_at is null"),
                        "opportunities", count("select count(*) from crm_opportunities where deleted_at is null"),
                        "activities", count("select count(*) from crm_sales_activities where deleted_at is null")));
    }

    private int count(String sql) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
        return count == null ? 0 : count;
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("登录状态已失效");
        }
        return authorization.substring("Bearer ".length());
    }

    public record BootstrapResponse(
            CurrentUserResponse user,
            int permissions_count,
            Map<String, Integer> v1_counts) {
    }
}
