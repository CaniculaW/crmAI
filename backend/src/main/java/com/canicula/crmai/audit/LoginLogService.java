package com.canicula.crmai.audit;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class LoginLogService {

    private final JdbcTemplate jdbcTemplate;

    LoginLogService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void record(LoginLogEntry entry) {
        jdbcTemplate.update(
                """
                insert into sys_login_logs (
                    user_id, login_identifier, event_type, success, failure_reason,
                    ip_address, user_agent, trace_id
                )
                values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                entry.userId(),
                entry.loginIdentifier(),
                entry.eventType(),
                entry.success(),
                entry.failureReason(),
                entry.ipAddress(),
                entry.userAgent(),
                entry.traceId());
    }
}
