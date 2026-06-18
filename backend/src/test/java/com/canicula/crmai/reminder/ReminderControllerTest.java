package com.canicula.crmai.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReminderControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @LocalServerPort
    private int port;

    @Test
    void createsFollowUpReminderFromActivityAndListsMineOnly() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("reminder-create-dept-" + suffix);
        Long ownerUserId = createLoginReadyUser(
                "reminder_owner_" + suffix,
                departmentId,
                List.of("account.create", "activity.create", "reminder.read"),
                List.of("global"));
        Long otherUserId = createLoginReadyUser(
                "reminder_other_" + suffix,
                departmentId,
                List.of("account.create", "activity.create", "reminder.read"),
                List.of("global"));
        String ownerToken = login("reminder_owner_" + suffix);
        String otherToken = login("reminder_other_" + suffix);
        Long ownerAccountId = createAccount(ownerToken, "提醒客户-" + suffix, departmentId, ownerUserId);
        Long otherAccountId = createAccount(otherToken, "其他提醒客户-" + suffix, departmentId, otherUserId);
        Long activityId = createActivity(
                ownerToken,
                ownerAccountId,
                "跟进提醒行动-" + suffix,
                departmentId,
                ownerUserId,
                OffsetDateTime.now().plusDays(2).withNano(0));
        createActivity(
                otherToken,
                otherAccountId,
                "其他人的提醒行动-" + suffix,
                departmentId,
                otherUserId,
                OffsetDateTime.now().plusDays(2).withNano(0));

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/reminders",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(ownerToken, "reminder-list-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(reminder -> {
            assertThat(reminder.path("object_type").asText()).isEqualTo("activity");
            assertThat(reminder.path("object_id").asLong()).isEqualTo(activityId);
            assertThat(reminder.path("reminder_type").asText()).isEqualTo("follow_up");
            assertThat(reminder.path("title").asText()).isEqualTo("跟进提醒行动-" + suffix);
            assertThat(reminder.path("assignee_id").asLong()).isEqualTo(ownerUserId);
            assertThat(reminder.path("status").asText()).isEqualTo("pending");
        });
        assertThat(listResponse.getBody().path("data")).noneSatisfy(reminder ->
                assertThat(reminder.path("title").asText()).isEqualTo("其他人的提醒行动-" + suffix));
    }

    @Test
    void listsOverdueReminderAndCompletesItWithAuditLog() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("reminder-overdue-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "reminder_overdue_" + suffix,
                departmentId,
                List.of("account.create", "activity.create", "reminder.read", "reminder.update"),
                List.of("global"));
        String token = login("reminder_overdue_" + suffix);
        Long accountId = createAccount(token, "逾期提醒客户-" + suffix, departmentId, userId);
        Long activityId = createActivity(
                token,
                accountId,
                "逾期跟进行动-" + suffix,
                departmentId,
                userId,
                OffsetDateTime.now().minusDays(1).withNano(0));
        Long reminderId = findReminderId(activityId);

        ResponseEntity<JsonNode> overdueResponse = restTemplate.exchange(
                "/api/reminders?overdue=true",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "reminder-overdue-trace-001")),
                JsonNode.class);
        HttpJsonResponse completeResponse = patchJson(
                "/api/reminders/" + reminderId,
                Map.of("status", "completed"),
                authHeaders(token, "reminder-complete-trace-001"));
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'reminder.update' and object_id = ?",
                Integer.class,
                reminderId);

        assertThat(overdueResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(overdueResponse.getBody().path("data")).anySatisfy(reminder -> {
            assertThat(reminder.path("id").asLong()).isEqualTo(reminderId);
            assertThat(reminder.path("status").asText()).isEqualTo("overdue");
        });
        assertThat(completeResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode completed = completeResponse.body().path("data");
        assertThat(completed.path("id").asLong()).isEqualTo(reminderId);
        assertThat(completed.path("status").asText()).isEqualTo("completed");
        assertThat(completed.path("completed_at").isMissingNode()).isFalse();
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void completingActivityAlsoCompletesPendingFollowUpReminder() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("reminder-activity-complete-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "reminder_activity_complete_" + suffix,
                departmentId,
                List.of("account.create", "activity.create", "activity.complete", "reminder.read"),
                List.of("global"));
        String token = login("reminder_activity_complete_" + suffix);
        Long accountId = createAccount(token, "行动完成提醒客户-" + suffix, departmentId, userId);
        Long activityId = createActivity(
                token,
                accountId,
                "完成后关闭提醒行动-" + suffix,
                departmentId,
                userId,
                OffsetDateTime.now().plusDays(1).withNano(0));
        Long reminderId = findReminderId(activityId);

        ResponseEntity<JsonNode> completeActivityResponse = restTemplate.exchange(
                "/api/activities/" + activityId + "/complete",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "activity_result", "milestone_completed",
                        "conclusion", "客户已确认下一步",
                        "next_plan", "准备报价"), authHeaders(token, "reminder-activity-complete-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> completedRemindersResponse = restTemplate.exchange(
                "/api/reminders?status=completed",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "reminder-completed-list-trace-001")),
                JsonNode.class);

        assertThat(completeActivityResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completedRemindersResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completedRemindersResponse.getBody().path("data")).anySatisfy(reminder ->
                assertThat(reminder.path("id").asLong()).isEqualTo(reminderId));
    }

    private Long createActivity(
            String accessToken,
            Long accountId,
            String subject,
            Long departmentId,
            Long ownerUserId,
            OffsetDateTime nextFollowUpAt) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("subject", subject);
        request.put("activity_type", "customer_visit");
        request.put("activity_status", "planned");
        request.put("activity_result", "pending");
        request.put("activity_time", OffsetDateTime.now().withNano(0).toString());
        request.put("next_follow_up_at", nextFollowUpAt.toString());
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("contact_ids", List.of());
        request.put("participants", List.of());
        request.put("risk_types", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/activities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "reminder-helper-activity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createAccount(String accessToken, String accountName, Long departmentId, Long ownerUserId) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_name", accountName);
        request.put("account_type", "enterprise");
        request.put("account_status", "following");
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("collaborators", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/accounts",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "reminder-helper-account-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long findReminderId(Long activityId) {
        return jdbcTemplate.queryForObject(
                """
                select id
                from crm_reminders
                where object_type = 'activity'
                  and object_id = ?
                  and reminder_type = 'follow_up'
                """,
                Long.class,
                activityId);
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "提醒测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "reminder_role_" + username,
                "提醒测试角色",
                "提醒测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "提醒测试用户",
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
        permissions.forEach(permission ->
                identityService.grantPermission(roleId, identityService.findPermissionIdByCode(permission)));
        dataScopes.forEach(scope -> {
            grantDataScope(roleId, "account", scope);
            grantDataScope(roleId, "activity", scope);
        });
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");
        return userId;
    }

    private void grantDataScope(Long roleId, String moduleCode, String scopeCode) {
        Long dataScopeId = jdbcTemplate.queryForObject(
                "select id from sys_data_scopes where scope_code = ?",
                Long.class,
                scopeCode);
        jdbcTemplate.update(
                """
                insert into sys_role_data_scopes (role_id, module_code, data_scope_id)
                values (?, ?, ?)
                """,
                roleId,
                moduleCode,
                dataScopeId);
    }

    private String login(String username) {
        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("reminder-login-trace-001")),
                JsonNode.class);
        return loginResponse.getBody().path("data").path("access_token").asText();
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

    private HttpJsonResponse patchJson(String path, Map<String, Object> body, HttpHeaders headers) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + port + path))
                    .header("Content-Type", "application/json")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
            headers.forEach((name, values) -> values.forEach(value -> builder.header(name, value)));
            HttpResponse<String> response = HttpClient.newHttpClient().send(
                    builder.build(),
                    HttpResponse.BodyHandlers.ofString());
            return new HttpJsonResponse(response.statusCode(), objectMapper.readTree(response.body()));
        } catch (Exception exception) {
            throw new IllegalStateException("PATCH request failed", exception);
        }
    }

    private record HttpJsonResponse(int status, JsonNode body) {
    }
}
