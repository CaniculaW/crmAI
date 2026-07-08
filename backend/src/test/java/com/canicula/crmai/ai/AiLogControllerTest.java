package com.canicula.crmai.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AiLogControllerTest {

    private static final String PASSWORD = "S3cure!123";

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void listsCurrentUsersGeneratedAndWriteAiLogs() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        LoginSubject subject = createAndLoginUser("ai_log_reader_" + suffix, List.of("ai.log.read"));
        Long otherUserId = createUserOnly("ai_log_other_" + suffix);
        Long inputRecordId = insertInputRecord(subject.userId(), "客户：AI日志客户-" + suffix);
        Long draftId = insertDraft(inputRecordId, subject.userId(), "account", "confirmed", "AI日志客户-" + suffix);
        Long weeklyReportId = insertWeeklyReport(subject.userId(), "pending_confirmation", "AI日志周报-" + suffix);
        insertWriteLog(draftId, inputRecordId, subject.userId(), "confirm", "account", 9001L, "success", null, "ai-log-confirm-trace");
        insertWriteLog(null, null, otherUserId, "confirm", "account", 9002L, "success", null, "ai-log-hidden-trace");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-logs?limit=20",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(subject.accessToken(), "ai-log-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> filteredResponse = restTemplate.exchange(
                "/api/ai-logs?event_type=write&ai_module=draft&status=success",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(subject.accessToken(), "ai-log-filter-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> objectAndTimeResponse = restTemplate.exchange(
                "/api/ai-logs?object_type=account&object_id=9001"
                        + "&occurred_from=2000-01-01T00:00:00Z&occurred_to=2100-01-01T00:00:00Z",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(subject.accessToken(), "ai-log-filter-trace-002")),
                JsonNode.class);
        ResponseEntity<JsonNode> futureTimeResponse = restTemplate.exchange(
                "/api/ai-logs?occurred_from=2100-01-01T00:00:00Z",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(subject.accessToken(), "ai-log-filter-trace-003")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode logs = response.getBody().path("data");
        assertThat(logs).anySatisfy(item -> {
            assertThat(item.path("event_type").asText()).isEqualTo("generated");
            assertThat(item.path("ai_module").asText()).isEqualTo("draft");
            assertThat(item.path("operation").asText()).isEqualTo("generate");
            assertThat(item.path("source_id").asLong()).isEqualTo(draftId);
            assertThat(item.path("title").asText()).isEqualTo("客户草稿");
            assertThat(item.path("summary").asText()).contains("AI日志客户-" + suffix);
            assertThat(item.path("business_url").asText()).isEqualTo("/ai-assistant/drafts");
        });
        assertThat(logs).anySatisfy(item -> {
            assertThat(item.path("event_type").asText()).isEqualTo("generated");
            assertThat(item.path("ai_module").asText()).isEqualTo("weekly_report");
            assertThat(item.path("operation").asText()).isEqualTo("generate");
            assertThat(item.path("source_id").asLong()).isEqualTo(weeklyReportId);
            assertThat(item.path("title").asText()).isEqualTo("AI周报");
            assertThat(item.path("summary").asText()).contains("AI日志周报-" + suffix);
            assertThat(item.path("business_url").asText()).isEqualTo("/ai-assistant/weekly-report");
        });
        assertThat(logs).anySatisfy(item -> {
            assertThat(item.path("event_type").asText()).isEqualTo("write");
            assertThat(item.path("ai_module").asText()).isEqualTo("draft");
            assertThat(item.path("operation").asText()).isEqualTo("confirm");
            assertThat(item.path("status").asText()).isEqualTo("success");
            assertThat(item.path("object_type").asText()).isEqualTo("account");
            assertThat(item.path("object_id").asLong()).isEqualTo(9001L);
            assertThat(item.path("trace_id").asText()).isEqualTo("ai-log-confirm-trace");
            assertThat(item.path("business_url").asText()).isEqualTo("/accounts?account_id=9001");
        });
        assertThat(logs).noneSatisfy(item ->
                assertThat(item.path("trace_id").asText()).isEqualTo("ai-log-hidden-trace"));
        assertThat(filteredResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(filteredResponse.getBody().path("data")).hasSize(1);
        assertThat(filteredResponse.getBody().path("data").get(0).path("operation").asText()).isEqualTo("confirm");
        assertThat(objectAndTimeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(objectAndTimeResponse.getBody().path("data")).hasSize(1);
        assertThat(objectAndTimeResponse.getBody().path("data").get(0).path("object_id").asLong()).isEqualTo(9001L);
        assertThat(futureTimeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(futureTimeResponse.getBody().path("data")).isEmpty();
    }

    @Test
    void recordsAuditLogWhenAiLogPermissionIsDenied() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        LoginSubject subject = createAndLoginUser("ai_log_low_" + suffix, List.of("ai.context.read"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-logs",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(subject.accessToken(), "ai-log-denied-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        Integer auditCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_audit_logs
                where actor_user_id = ?
                  and module_code = 'ai'
                  and action_code = 'permission.denied'
                  and object_type = 'permission'
                  and result = 'failed'
                  and trace_id = 'ai-log-denied-trace-001'
                """,
                Integer.class,
                subject.userId());
        assertThat(auditCount).isEqualTo(1);
    }

    private Long insertInputRecord(Long userId, String sourceText) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    "insert into ai_input_records (source_text, created_by) values (?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, sourceText);
            statement.setLong(2, userId);
            return statement;
        }, keyHolder);
        return generatedId(keyHolder);
    }

    private Long insertDraft(Long inputRecordId, Long userId, String draftType, String status, String accountName) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into ai_extraction_drafts (
                        input_record_id, draft_type, status, target_action, source_text,
                        payload_json, missing_fields, conflicts, confidence_status, created_by
                    )
                    values (?, ?, ?, 'create', ?, ?, '[]', '[]', 'high', ?)
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, inputRecordId);
            statement.setString(2, draftType);
            statement.setString(3, status);
            statement.setString(4, "客户：" + accountName);
            statement.setString(5, "{\"account_name\":\"" + accountName + "\"}");
            statement.setLong(6, userId);
            return statement;
        }, keyHolder);
        return generatedId(keyHolder);
    }

    private Long insertWeeklyReport(Long userId, String status, String headline) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into ai_weekly_reports (
                        week_start_date, week_end_date, status, report_json, source_activity_count, created_by
                    )
                    values (current_date - 6, current_date, ?, ?, 2, ?)
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, status);
            statement.setString(2, "{\"personal_summary\":{\"headline\":\"" + headline + "\"},\"opportunity_progress\":[]}");
            statement.setLong(3, userId);
            return statement;
        }, keyHolder);
        return generatedId(keyHolder);
    }

    private void insertWriteLog(
            Long draftId,
            Long inputRecordId,
            Long userId,
            String operation,
            String objectType,
            Long objectId,
            String status,
            String errorMessage,
            String traceId) {
        jdbcTemplate.update(
                """
                insert into ai_write_logs (
                    draft_id, input_record_id, operation, object_type, object_id,
                    status, error_message, created_by, trace_id
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                draftId,
                inputRecordId,
                operation,
                objectType,
                objectId,
                status,
                errorMessage,
                userId,
                traceId);
    }

    private static Long generatedId(KeyHolder keyHolder) {
        Object id = keyHolder.getKeys().get("id");
        return ((Number) id).longValue();
    }

    private LoginSubject createAndLoginUser(String username, List<String> permissionCodes) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "dept-" + username,
                "AI日志测试部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "role_" + username,
                "AI日志测试角色",
                "AI日志测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "AI日志测试用户",
                null,
                username + "@example.com",
                "sales_rep",
                "active"));
        identityService.createLoginAccount(new LoginAccountCreateRequest(
                userId,
                "username",
                username,
                true,
                "active"));
        identityService.assignRole(userId, roleId);
        permissionCodes.forEach(permissionCode ->
                identityService.grantPermission(roleId, identityService.findPermissionIdByCode(permissionCode)));
        passwordCredentialService.createPasswordCredential(userId, PASSWORD);

        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", PASSWORD), traceHeaders("ai-log-login-trace-001")),
                JsonNode.class);
        return new LoginSubject(
                userId,
                departmentId,
                loginResponse.getBody().path("data").path("access_token").asText());
    }

    private Long createUserOnly(String username) {
        return createAndLoginUser(username, List.of("ai.context.read")).userId();
    }

    private static HttpHeaders traceHeaders(String traceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Trace-Id", traceId);
        return headers;
    }

    private static HttpHeaders authHeaders(String accessToken, String traceId) {
        HttpHeaders headers = traceHeaders(traceId);
        headers.setBearerAuth(accessToken);
        return headers;
    }

    private record LoginSubject(Long userId, Long departmentId, String accessToken) {
    }
}
