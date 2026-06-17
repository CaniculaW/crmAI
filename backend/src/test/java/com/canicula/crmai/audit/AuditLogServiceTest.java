package com.canicula.crmai.audit;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class AuditLogServiceTest {

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private LoginLogService loginLogService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void recordsLoginEventsForAuthenticationFlow() {
        loginLogService.record(new LoginLogEntry(
                42L,
                "sales.demo",
                "login_failed",
                false,
                "bad_credentials",
                "127.0.0.1",
                "JUnit",
                "login-trace-001"));

        Map<String, Object> row = jdbcTemplate.queryForMap(
                """
                select user_id, login_identifier, event_type, success, failure_reason, ip_address, user_agent, trace_id
                from sys_login_logs
                where trace_id = ?
                """,
                "login-trace-001");

        assertThat(row)
                .containsEntry("USER_ID", 42L)
                .containsEntry("LOGIN_IDENTIFIER", "sales.demo")
                .containsEntry("EVENT_TYPE", "login_failed")
                .containsEntry("SUCCESS", false)
                .containsEntry("FAILURE_REASON", "bad_credentials")
                .containsEntry("IP_ADDRESS", "127.0.0.1")
                .containsEntry("USER_AGENT", "JUnit")
                .containsEntry("TRACE_ID", "login-trace-001");
    }

    @Test
    void recordsAuditEventsWithJsonSnapshots() {
        auditLogService.record(new AuditLogEntry(
                7L,
                "system",
                "role.permission.update",
                "sys_role",
                1001L,
                Map.of("permissions", "old"),
                Map.of("permissions", "new"),
                "success",
                null,
                "127.0.0.1",
                "JUnit",
                "audit-trace-001"));

        Map<String, Object> row = jdbcTemplate.queryForMap(
                """
                select actor_user_id, module_code, action_code, object_type, object_id,
                       cast(before_data as varchar) as before_data,
                       cast(after_data as varchar) as after_data,
                       result, failure_reason, ip_address, user_agent, trace_id
                from sys_audit_logs
                where trace_id = ?
                """,
                "audit-trace-001");

        assertThat(row)
                .containsEntry("ACTOR_USER_ID", 7L)
                .containsEntry("MODULE_CODE", "system")
                .containsEntry("ACTION_CODE", "role.permission.update")
                .containsEntry("OBJECT_TYPE", "sys_role")
                .containsEntry("OBJECT_ID", 1001L)
                .containsEntry("RESULT", "success")
                .containsEntry("IP_ADDRESS", "127.0.0.1")
                .containsEntry("USER_AGENT", "JUnit")
                .containsEntry("TRACE_ID", "audit-trace-001");
        assertThat(row.get("BEFORE_DATA").toString()).contains("old");
        assertThat(row.get("AFTER_DATA").toString()).contains("new");
    }
}
