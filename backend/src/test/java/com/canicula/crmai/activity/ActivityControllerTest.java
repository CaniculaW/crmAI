package com.canicula.crmai.activity;

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
class ActivityControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void returnsNotFoundForMissingActivity() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("activity-missing-dept-" + suffix);
        createLoginReadyUser(
                "activity_missing_" + suffix,
                departmentId,
                List.of("activity.read"),
                List.of("global"));
        String token = login("activity_missing_" + suffix);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/activities/999999999",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "activity-missing-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().path("code").asText()).isEqualTo("NOT_FOUND");
    }

    @Test
    void createsCustomerActivityWithoutOpportunityAndReadsByAccount() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("activity-customer-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "activity_customer_" + suffix,
                departmentId,
                List.of("account.create", "activity.create", "activity.read"),
                List.of("global"));
        String token = login("activity_customer_" + suffix);
        Long accountId = createAccount(token, "客户经营行动客户-" + suffix, departmentId, userId);

        Long activityId = createActivity(
                token,
                accountId,
                null,
                "客户经营拜访-" + suffix,
                departmentId,
                userId,
                List.of(),
                List.of(Map.of("user_id", userId, "participant_role", "owner")),
                List.of());
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/activities/" + activityId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "activity-detail-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountActivitiesResponse = restTemplate.exchange(
                "/api/accounts/" + accountId + "/activities",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "activity-account-list-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'activity.create' and object_id = ?",
                Integer.class,
                activityId);

        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode detail = detailResponse.getBody().path("data");
        assertThat(detail.path("subject").asText()).isEqualTo("客户经营拜访-" + suffix);
        assertThat(detail.path("opportunity_id").isNull()).isTrue();
        assertThat(accountActivitiesResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accountActivitiesResponse.getBody().path("data")).anySatisfy(activity ->
                assertThat(activity.path("id").asLong()).isEqualTo(activityId));
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void createsOpportunityActivityWithContactsParticipantsAndRiskTypes() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("activity-project-dept-" + suffix);
        Long ownerUserId = createLoginReadyUser(
                "activity_project_owner_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "contact.create",
                        "opportunity.create",
                        "activity.create",
                        "activity.read"),
                List.of("global"));
        Long participantUserId = createLoginReadyUser(
                "activity_project_participant_" + suffix,
                departmentId,
                List.of("activity.read"),
                List.of("collaborated"));
        String token = login("activity_project_owner_" + suffix);
        Long accountId = createAccount(token, "项目行动客户-" + suffix, departmentId, ownerUserId);
        Long contactId = createContact(token, accountId, "项目行动联系人-" + suffix);
        Long opportunityId = createOpportunity(token, accountId, "项目行动商机-" + suffix, departmentId, ownerUserId);

        Long activityId = createActivity(
                token,
                accountId,
                opportunityId,
                "项目推进会-" + suffix,
                departmentId,
                ownerUserId,
                List.of(contactId),
                List.of(
                        Map.of("user_id", ownerUserId, "participant_role", "owner"),
                        Map.of("user_id", participantUserId, "participant_role", "presales")),
                List.of("budget", "technical"));
        ResponseEntity<JsonNode> participantDetailResponse = restTemplate.exchange(
                "/api/activities/" + activityId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(login("activity_project_participant_" + suffix), "activity-participant-detail-trace-001")),
                JsonNode.class);

        assertThat(participantDetailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode detail = participantDetailResponse.getBody().path("data");
        assertThat(detail.path("opportunity_id").asLong()).isEqualTo(opportunityId);
        assertThat(detail.path("contact_ids")).anySatisfy(contact ->
                assertThat(contact.asLong()).isEqualTo(contactId));
        assertThat(detail.path("participants")).anySatisfy(participant ->
                assertThat(participant.path("user_id").asLong()).isEqualTo(participantUserId));
        assertThat(detail.path("risk_types")).anySatisfy(risk ->
                assertThat(risk.asText()).isEqualTo("budget"));
    }

    @Test
    void listsActivitiesByOwnerParticipantAndFilters() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("activity-list-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "activity_list_creator_" + suffix,
                departmentId,
                List.of("account.create", "activity.create"),
                List.of("global"));
        Long viewerUserId = createLoginReadyUser(
                "activity_list_viewer_" + suffix,
                departmentId,
                List.of("activity.read"),
                List.of("own", "collaborated"));
        Long otherUserId = createLoginReadyUser(
                "activity_list_other_" + suffix,
                departmentId,
                List.of("activity.read"),
                List.of("own"));
        String creatorToken = login("activity_list_creator_" + suffix);
        String viewerToken = login("activity_list_viewer_" + suffix);
        Long viewerAccountId = createAccount(creatorToken, "可见行动客户-" + suffix, departmentId, viewerUserId);
        Long otherAccountId = createAccount(creatorToken, "不可见行动客户-" + suffix, departmentId, otherUserId);

        createActivity(
                creatorToken,
                viewerAccountId,
                null,
                "本人负责行动-" + suffix,
                departmentId,
                viewerUserId,
                List.of(),
                List.of(),
                List.of());
        createActivity(
                creatorToken,
                otherAccountId,
                null,
                "本人参与行动-" + suffix,
                departmentId,
                otherUserId,
                List.of(),
                List.of(Map.of("user_id", viewerUserId, "participant_role", "presales")),
                List.of());
        createActivity(
                creatorToken,
                otherAccountId,
                null,
                "不可见行动-" + suffix,
                departmentId,
                otherUserId,
                List.of(),
                List.of(),
                List.of());

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/activities?activity_status=planned&participant_user_id=" + viewerUserId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "activity-list-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(activity ->
                assertThat(activity.path("subject").asText()).isEqualTo("本人参与行动-" + suffix));
        assertThat(listResponse.getBody().path("data")).noneSatisfy(activity ->
                assertThat(activity.path("subject").asText()).isEqualTo("不可见行动-" + suffix));
    }

    @Test
    void completesActivityAndBackfillsAccountAndOpportunityWithRiskUpgrade() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("activity-complete-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "activity_complete_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "account.read",
                        "contact.create",
                        "opportunity.create",
                        "opportunity.read",
                        "activity.create",
                        "activity.read",
                        "activity.complete"),
                List.of("global"));
        String token = login("activity_complete_" + suffix);
        Long accountId = createAccount(token, "行动完成客户-" + suffix, departmentId, userId);
        Long contactId = createContact(token, accountId, "行动完成联系人-" + suffix);
        Long opportunityId = createOpportunity(token, accountId, "行动完成商机-" + suffix, departmentId, userId);
        Long activityId = createActivity(
                token,
                accountId,
                opportunityId,
                "风险推进会-" + suffix,
                departmentId,
                userId,
                List.of(contactId),
                List.of(Map.of("user_id", userId, "participant_role", "owner")),
                List.of());

        ResponseEntity<JsonNode> completeResponse = restTemplate.exchange(
                "/api/activities/" + activityId + "/complete",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "activity_result", "risk_found",
                        "conclusion", "客户预算存在审批风险",
                        "next_plan", "拉通财务负责人确认预算路径",
                        "risk_description", "预算审批链路未明确",
                        "risk_types", List.of("budget")), authHeaders(token, "activity-complete-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountDetailResponse = restTemplate.exchange(
                "/api/accounts/" + accountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "activity-complete-account-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> opportunityDetailResponse = restTemplate.exchange(
                "/api/opportunities/" + opportunityId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "activity-complete-opportunity-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'activity.complete' and object_id = ?",
                Integer.class,
                activityId);

        assertThat(completeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode completed = completeResponse.getBody().path("data");
        assertThat(completed.path("activity_status").asText()).isEqualTo("completed");
        assertThat(completed.path("activity_result").asText()).isEqualTo("risk_found");
        assertThat(completed.path("completed_by").asLong()).isEqualTo(userId);
        assertThat(completed.path("completed_at").isMissingNode()).isFalse();
        assertThat(accountDetailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode account = accountDetailResponse.getBody().path("data");
        assertThat(account.path("last_activity_summary").asText()).isEqualTo("客户预算存在审批风险");
        assertThat(opportunityDetailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode opportunity = opportunityDetailResponse.getBody().path("data");
        assertThat(opportunity.path("last_activity_summary").asText()).isEqualTo("客户预算存在审批风险");
        assertThat(opportunity.path("risk_status").asText()).isEqualTo("risk");
        assertThat(opportunity.path("risk_description").asText()).isEqualTo("预算审批链路未明确");
        assertThat(auditCount).isEqualTo(1);

        ResponseEntity<JsonNode> duplicateCompleteResponse = restTemplate.exchange(
                "/api/activities/" + activityId + "/complete",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "activity_result", "aligned",
                        "conclusion", "不应覆盖首次完成结论"), authHeaders(token, "activity-duplicate-complete-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> detailAfterDuplicate = restTemplate.exchange(
                "/api/activities/" + activityId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "activity-duplicate-detail-trace-001")),
                JsonNode.class);
        Integer auditCountAfterDuplicate = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'activity.complete' and object_id = ?",
                Integer.class,
                activityId);

        assertThat(duplicateCompleteResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(duplicateCompleteResponse.getBody().path("code").asText()).isEqualTo("BUSINESS_RULE_FAILED");
        assertThat(detailAfterDuplicate.getBody().path("data").path("conclusion").asText())
                .isEqualTo("客户预算存在审批风险");
        assertThat(detailAfterDuplicate.getBody().path("data").path("completed_at").asText())
                .isEqualTo(completed.path("completed_at").asText());
        assertThat(auditCountAfterDuplicate).isEqualTo(1);
    }

    @Test
    void weeklyProgressIncludesOnlyCompletedOpportunityActivitiesAndKeepsDetails() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("activity-weekly-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "activity_weekly_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "contact.create",
                        "opportunity.create",
                        "activity.create",
                        "activity.read",
                        "activity.complete",
                        "weekly_progress.read"),
                List.of("global"));
        String token = login("activity_weekly_" + suffix);
        Long accountId = createAccount(token, "周进展客户-" + suffix, departmentId, userId);
        Long contactId = createContact(token, accountId, "周进展联系人-" + suffix);
        Long opportunityId = createOpportunity(token, accountId, "周进展商机-" + suffix, departmentId, userId);
        Long firstActivityId = createActivity(
                token,
                accountId,
                opportunityId,
                "周进展行动一-" + suffix,
                departmentId,
                userId,
                List.of(contactId),
                List.of(Map.of("user_id", userId, "participant_role", "owner")),
                List.of());
        Long secondActivityId = createActivity(
                token,
                accountId,
                opportunityId,
                "周进展行动二-" + suffix,
                departmentId,
                userId,
                List.of(contactId),
                List.of(Map.of("user_id", userId, "participant_role", "owner")),
                List.of());
        Long excludedActivityId = createActivity(
                token,
                accountId,
                opportunityId,
                "不进周进展行动-" + suffix,
                departmentId,
                userId,
                List.of(contactId),
                List.of(Map.of("user_id", userId, "participant_role", "owner")),
                List.of(),
                false);
        Long customerOnlyActivityId = createActivity(
                token,
                accountId,
                null,
                "客户经营周进展外行动-" + suffix,
                departmentId,
                userId,
                List.of(contactId),
                List.of(Map.of("user_id", userId, "participant_role", "owner")),
                List.of());
        createActivity(
                token,
                accountId,
                opportunityId,
                "未完成周进展外行动-" + suffix,
                departmentId,
                userId,
                List.of(contactId),
                List.of(Map.of("user_id", userId, "participant_role", "owner")),
                List.of());
        completeActivity(token, firstActivityId, "第一条周进展结论", "继续跟进方案", null);
        completeActivity(token, secondActivityId, "第二条周进展结论", "推进报价", null);
        completeActivity(token, excludedActivityId, "不应出现的结论", "内部记录", null);
        completeActivity(token, customerOnlyActivityId, "客户经营行动结论", "客户关系维护", null);

        ResponseEntity<JsonNode> weeklyResponse = restTemplate.exchange(
                "/api/opportunities/" + opportunityId + "/weekly-progress",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "activity-weekly-progress-trace-001")),
                JsonNode.class);

        assertThat(weeklyResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode rows = weeklyResponse.getBody().path("data");
        assertThat(rows).hasSize(1);
        JsonNode row = rows.get(0);
        assertThat(row.path("opportunity_id").asLong()).isEqualTo(opportunityId);
        assertThat(row.path("activity_count").asInt()).isEqualTo(2);
        assertThat(row.path("progress_items")).anySatisfy(item ->
                assertThat(item.path("conclusion").asText()).isEqualTo("第一条周进展结论"));
        assertThat(row.path("progress_items")).anySatisfy(item ->
                assertThat(item.path("conclusion").asText()).isEqualTo("第二条周进展结论"));
        assertThat(row.path("progress_items")).noneSatisfy(item ->
                assertThat(item.path("conclusion").asText()).isEqualTo("不应出现的结论"));
        assertThat(row.path("progress_items")).noneSatisfy(item ->
                assertThat(item.path("conclusion").asText()).isEqualTo("客户经营行动结论"));
    }

    @Test
    void rejectsInvalidWeeklyProgressMonth() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("activity-invalid-month-dept-" + suffix);
        createLoginReadyUser(
                "activity_invalid_month_" + suffix,
                departmentId,
                List.of("weekly_progress.read"),
                List.of("global"));
        String token = login("activity_invalid_month_" + suffix);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/weekly-progress/opportunities?month=2026-13",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "weekly-invalid-month-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().path("code").asText()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().path("trace_id").asText()).isEqualTo("weekly-invalid-month-trace-001");
    }

    private Long createActivity(
            String accessToken,
            Long accountId,
            Long opportunityId,
            String subject,
            Long departmentId,
            Long ownerUserId,
            List<Long> contactIds,
            List<Map<String, Object>> participants,
            List<String> riskTypes) {
        return createActivity(
                accessToken,
                accountId,
                opportunityId,
                subject,
                departmentId,
                ownerUserId,
                contactIds,
                participants,
                riskTypes,
                true);
    }

    private Long createActivity(
            String accessToken,
            Long accountId,
            Long opportunityId,
            String subject,
            Long departmentId,
            Long ownerUserId,
            List<Long> contactIds,
            List<Map<String, Object>> participants,
            List<String> riskTypes,
            boolean includeInWeeklyProgress) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_id", opportunityId);
        request.put("subject", subject);
        request.put("activity_type", "customer_visit");
        request.put("activity_status", "planned");
        request.put("activity_result", "pending");
        request.put("activity_time", OffsetDateTime.now().plusDays(1).withNano(0).toString());
        request.put("next_follow_up_at", OffsetDateTime.now().plusDays(7).withNano(0).toString());
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("include_in_weekly_progress", includeInWeeklyProgress);
        request.put("communication_content", "沟通客户需求");
        request.put("next_plan", "安排方案评审");
        request.put("contact_ids", contactIds);
        request.put("participants", participants);
        request.put("risk_types", riskTypes);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/activities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "activity-helper-create-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private void completeActivity(
            String accessToken,
            Long activityId,
            String conclusion,
            String nextPlan,
            String riskDescription) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("activity_result", riskDescription == null ? "milestone_completed" : "risk_found");
        request.put("conclusion", conclusion);
        request.put("next_plan", nextPlan);
        if (riskDescription != null) {
            request.put("risk_description", riskDescription);
            request.put("risk_types", List.of("budget"));
        }
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/activities/" + activityId + "/complete",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "activity-helper-complete-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
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
                new HttpEntity<>(request, authHeaders(accessToken, "activity-helper-account-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createContact(String accessToken, Long accountId, String name) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("name", name);
        request.put("contact_type", "decision_maker");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/contacts",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "activity-helper-contact-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createOpportunity(String accessToken, Long accountId, String name, Long departmentId, Long ownerUserId) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_name", name);
        request.put("stage", "lead");
        request.put("status", "following");
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("collaborators", List.of());
        request.put("contact_relations", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/opportunities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "activity-helper-opportunity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "行动测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "activity_role_" + username,
                "行动测试角色",
                "行动测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "行动测试用户",
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
            grantDataScope(roleId, "contact", scope);
            grantDataScope(roleId, "opportunity", scope);
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
                        "password", "S3cure!123"), traceHeaders("activity-login-trace-001")),
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
}
