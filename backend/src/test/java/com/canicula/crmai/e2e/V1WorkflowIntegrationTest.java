package com.canicula.crmai.e2e;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class V1WorkflowIntegrationTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void loginToWeeklyProgressWorkflowPassesThroughV1CoreApis() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("v1-e2e-dept-" + suffix);
        Long userId = createLoginReadyUser("v1_e2e_" + suffix, departmentId);
        String token = login("v1_e2e_" + suffix);

        ResponseEntity<JsonNode> meResponse = restTemplate.exchange(
                "/api/auth/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v1-e2e-me-trace")),
                JsonNode.class);
        Long accountId = createAccount(token, "V1闭环客户-" + suffix, departmentId, userId);
        Long contactId = createContact(token, accountId, "V1闭环联系人-" + suffix);
        Long opportunityId = createOpportunity(token, accountId, contactId, departmentId, userId, suffix);
        Long activityId = createActivity(token, accountId, opportunityId, contactId, departmentId, userId, suffix);
        Long reminderId = findReminderId(activityId);

        ResponseEntity<JsonNode> pendingReminderResponse = restTemplate.exchange(
                "/api/reminders?object_type=activity&object_id=" + activityId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v1-e2e-pending-reminder-trace")),
                JsonNode.class);
        ResponseEntity<JsonNode> completeActivityResponse = restTemplate.exchange(
                "/api/activities/" + activityId + "/complete",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "activity_result", "milestone_completed",
                        "conclusion", "V1闭环验证通过-" + suffix,
                        "next_plan", "进入试点联调"), authHeaders(token, "v1-e2e-complete-trace")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountDetailResponse = restTemplate.exchange(
                "/api/accounts/" + accountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v1-e2e-account-detail-trace")),
                JsonNode.class);
        ResponseEntity<JsonNode> opportunityDetailResponse = restTemplate.exchange(
                "/api/opportunities/" + opportunityId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v1-e2e-opportunity-detail-trace")),
                JsonNode.class);
        ResponseEntity<JsonNode> weeklyProgressResponse = restTemplate.exchange(
                "/api/opportunities/" + opportunityId + "/weekly-progress",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v1-e2e-weekly-progress-trace")),
                JsonNode.class);
        ResponseEntity<JsonNode> completedReminderResponse = restTemplate.exchange(
                "/api/reminders?status=completed",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "v1-e2e-completed-reminder-trace")),
                JsonNode.class);
        Integer completeAuditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'activity.complete' and object_id = ?",
                Integer.class,
                activityId);

        assertThat(meResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(meResponse.getBody().path("data").path("id").asLong()).isEqualTo(userId);
        assertThat(pendingReminderResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(pendingReminderResponse.getBody().path("data")).anySatisfy(reminder -> {
            assertThat(reminder.path("id").asLong()).isEqualTo(reminderId);
            assertThat(reminder.path("status").asText()).isEqualTo("pending");
        });
        assertThat(completeActivityResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completeActivityResponse.getBody().path("data").path("activity_status").asText())
                .isEqualTo("completed");
        assertThat(accountDetailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accountDetailResponse.getBody().path("data").path("last_activity_summary").asText())
                .isEqualTo("V1闭环验证通过-" + suffix);
        assertThat(opportunityDetailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(opportunityDetailResponse.getBody().path("data").path("last_activity_summary").asText())
                .isEqualTo("V1闭环验证通过-" + suffix);
        assertThat(weeklyProgressResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(weeklyProgressResponse.getBody().path("data")).anySatisfy(row -> {
            assertThat(row.path("opportunity_id").asLong()).isEqualTo(opportunityId);
            assertThat(row.path("progress_items")).anySatisfy(item ->
                    assertThat(item.path("conclusion").asText()).isEqualTo("V1闭环验证通过-" + suffix));
        });
        assertThat(completedReminderResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completedReminderResponse.getBody().path("data")).anySatisfy(reminder ->
                assertThat(reminder.path("id").asLong()).isEqualTo(reminderId));
        assertThat(completeAuditCount).isEqualTo(1);
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
                new HttpEntity<>(request, authHeaders(accessToken, "v1-e2e-account-create-trace")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createContact(String accessToken, Long accountId, String name) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("name", name);
        request.put("contact_type", "decision_maker");
        request.put("attitude", "supporter");
        request.put("project_roles", List.of("budget_promoter"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/contacts",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "v1-e2e-contact-create-trace")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createOpportunity(
            String accessToken,
            Long accountId,
            Long contactId,
            Long departmentId,
            Long ownerUserId,
            String suffix) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_name", "V1闭环商机-" + suffix);
        request.put("stage", "lead");
        request.put("status", "following");
        request.put("level", "A");
        request.put("source", "customer");
        request.put("potential_point", "年度项目型CRM建设");
        request.put("estimated_budget_amount", 1200000);
        request.put("estimated_contract_amount", 980000);
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("risk_status", "normal");
        request.put("collaborators", List.of());
        request.put("contact_relations", List.of(Map.of(
                "contact_id", contactId,
                "role_in_opportunity", "decision_maker",
                "is_key_person", true)));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/opportunities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "v1-e2e-opportunity-create-trace")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createActivity(
            String accessToken,
            Long accountId,
            Long opportunityId,
            Long contactId,
            Long departmentId,
            Long ownerUserId,
            String suffix) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_id", opportunityId);
        request.put("subject", "V1闭环推进会-" + suffix);
        request.put("activity_type", "customer_visit");
        request.put("activity_status", "planned");
        request.put("activity_result", "pending");
        request.put("activity_time", OffsetDateTime.now().withNano(0).toString());
        request.put("next_follow_up_at", OffsetDateTime.now().plusDays(1).withNano(0).toString());
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("include_in_weekly_progress", true);
        request.put("communication_content", "确认V1核心闭环");
        request.put("next_plan", "准备试点联调");
        request.put("contact_ids", List.of(contactId));
        request.put("participants", List.of(Map.of("user_id", ownerUserId, "participant_role", "owner")));
        request.put("risk_types", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/activities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "v1-e2e-activity-create-trace")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "V1闭环测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(String username, Long departmentId) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "v1_e2e_role_" + username,
                "V1闭环测试角色",
                "V1闭环测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "V1闭环测试用户",
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
        List.of(
                "account.create",
                "account.read",
                "contact.create",
                "contact.read",
                "opportunity.create",
                "opportunity.read",
                "activity.create",
                "activity.read",
                "activity.complete",
                "reminder.read",
                "weekly_progress.read")
                .forEach(permission ->
                        identityService.grantPermission(roleId, identityService.findPermissionIdByCode(permission)));
        List.of("account", "contact", "opportunity", "activity").forEach(module ->
                grantDataScope(roleId, module, "global"));
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

    private String login(String username) {
        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("v1-e2e-login-trace")),
                JsonNode.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
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
}
