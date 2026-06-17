package com.canicula.crmai.opportunity;

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
class OpportunityControllerTest {

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
    void createsOpportunityWithCollaboratorsAndContactsAndReadsDetail() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("opportunity-create-dept-" + suffix);
        Long ownerUserId = createLoginReadyUser(
                "opportunity_owner_" + suffix,
                departmentId,
                List.of("account.create", "contact.create", "opportunity.create", "opportunity.read"),
                List.of("global"));
        Long collaboratorUserId = createLoginReadyUser(
                "opportunity_collab_" + suffix,
                departmentId,
                List.of("opportunity.read"),
                List.of("collaborated"));
        String token = login("opportunity_owner_" + suffix);
        Long accountId = createAccount(token, "商机客户-" + suffix, departmentId, ownerUserId);
        Long contactId = createContact(token, accountId, "商机关联联系人-" + suffix);

        Long opportunityId = createOpportunity(
                token,
                accountId,
                "测试商机-" + suffix,
                "lead",
                "following",
                departmentId,
                ownerUserId,
                List.of(Map.of(
                        "user_id", collaboratorUserId,
                        "collaborator_role", "presales")),
                List.of(Map.of(
                        "contact_id", contactId,
                        "role_in_opportunity", "decision_maker",
                        "is_key_person", true)));
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/opportunities/" + opportunityId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "opportunity-detail-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountOpportunitiesResponse = restTemplate.exchange(
                "/api/accounts/" + accountId + "/opportunities",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "account-opportunities-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'opportunity.create' and object_id = ?",
                Integer.class,
                opportunityId);

        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode detail = detailResponse.getBody().path("data");
        assertThat(detail.path("opportunity_name").asText()).isEqualTo("测试商机-" + suffix);
        assertThat(detail.path("collaborators")).anySatisfy(collaborator ->
                assertThat(collaborator.path("user_id").asLong()).isEqualTo(collaboratorUserId));
        assertThat(detail.path("contact_relations")).anySatisfy(contact ->
                assertThat(contact.path("contact_id").asLong()).isEqualTo(contactId));
        assertThat(accountOpportunitiesResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accountOpportunitiesResponse.getBody().path("data")).anySatisfy(opportunity ->
                assertThat(opportunity.path("id").asLong()).isEqualTo(opportunityId));
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void listsOpportunitiesByDataPermissionAndDefaultFollowingFilter() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("opportunity-list-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "opportunity_list_creator_" + suffix,
                departmentId,
                List.of("account.create", "opportunity.create"),
                List.of("global"));
        Long viewerUserId = createLoginReadyUser(
                "opportunity_list_viewer_" + suffix,
                departmentId,
                List.of("opportunity.read"),
                List.of("own", "collaborated"));
        Long otherUserId = createLoginReadyUser(
                "opportunity_list_other_" + suffix,
                departmentId,
                List.of("opportunity.read"),
                List.of("own"));
        String creatorToken = login("opportunity_list_creator_" + suffix);
        String viewerToken = login("opportunity_list_viewer_" + suffix);
        Long viewerAccountId = createAccount(
                creatorToken,
                "可见商机客户-" + suffix,
                departmentId,
                viewerUserId);
        Long otherAccountId = createAccount(
                creatorToken,
                "不可见商机客户-" + suffix,
                departmentId,
                otherUserId);

        createOpportunity(
                creatorToken,
                viewerAccountId,
                "本人跟进商机-" + suffix,
                "lead",
                "following",
                departmentId,
                viewerUserId,
                List.of(),
                List.of());
        createOpportunity(
                creatorToken,
                otherAccountId,
                "协同跟进商机-" + suffix,
                "lead",
                "following",
                departmentId,
                otherUserId,
                List.of(Map.of(
                        "user_id", viewerUserId,
                        "collaborator_role", "presales")),
                List.of());
        createOpportunity(
                creatorToken,
                viewerAccountId,
                "暂停商机-" + suffix,
                "lead",
                "paused",
                departmentId,
                viewerUserId,
                List.of(),
                List.of());
        createOpportunity(
                creatorToken,
                otherAccountId,
                "不可见商机-" + suffix,
                "lead",
                "following",
                departmentId,
                otherUserId,
                List.of(),
                List.of());

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/opportunities?default_following=true&stage=lead&status=following",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "opportunity-list-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(opportunity ->
                assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("本人跟进商机-" + suffix));
        assertThat(listResponse.getBody().path("data")).anySatisfy(opportunity ->
                assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("协同跟进商机-" + suffix));
        assertThat(listResponse.getBody().path("data")).noneSatisfy(opportunity ->
                assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("暂停商机-" + suffix));
        assertThat(listResponse.getBody().path("data")).noneSatisfy(opportunity ->
                assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("不可见商机-" + suffix));
    }

    @Test
    void updatesOpportunityStageAndStatusAndRecordsAuditLog() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("opportunity-update-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "opportunity_update_" + suffix,
                departmentId,
                List.of("account.create", "opportunity.create", "opportunity.read", "opportunity.update"),
                List.of("global"));
        String token = login("opportunity_update_" + suffix);
        Long accountId = createAccount(token, "待更新商机客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(
                token,
                accountId,
                "待更新商机-" + suffix,
                "lead",
                "following",
                departmentId,
                userId,
                List.of(),
                List.of());

        HttpJsonResponse updateResponse = patchJson(
                "/api/opportunities/" + opportunityId,
                Map.of(
                        "stage", "validation",
                        "status", "paused",
                        "risk_status", "attention",
                        "current_progress", "已完成需求确认"),
                authHeaders(token, "opportunity-update-trace-001"));
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'opportunity.update' and object_id = ?",
                Integer.class,
                opportunityId);

        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode updated = updateResponse.body().path("data");
        assertThat(updated.path("stage").asText()).isEqualTo("validation");
        assertThat(updated.path("status").asText()).isEqualTo("paused");
        assertThat(updated.path("risk_status").asText()).isEqualTo("attention");
        assertThat(updated.path("current_progress").asText()).isEqualTo("已完成需求确认");
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void closeRequiresReason() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("opportunity-close-rule-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "opportunity_close_rule_" + suffix,
                departmentId,
                List.of("account.create", "opportunity.create", "opportunity.close"),
                List.of("global"));
        String token = login("opportunity_close_rule_" + suffix);
        Long accountId = createAccount(token, "缺少关闭原因客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(
                token,
                accountId,
                "缺少关闭原因商机-" + suffix,
                "lead",
                "following",
                departmentId,
                userId,
                List.of(),
                List.of());

        HttpJsonResponse closeResponse = postJson(
                "/api/opportunities/" + opportunityId + "/close",
                Map.of(
                        "close_type", "cancelled",
                        "close_reason", " ",
                        "close_description", "客户明确暂停预算"),
                authHeaders(token, "opportunity-close-rule-trace-001"));

        assertThat(closeResponse.status()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(closeResponse.body().path("code").asText()).isEqualTo("BUSINESS_RULE_FAILED");
    }

    @Test
    void closesAndCancelsOpportunityAndDefaultFollowingListExcludesThem() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("opportunity-close-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "opportunity_close_" + suffix,
                departmentId,
                List.of("account.create", "opportunity.create", "opportunity.read", "opportunity.close"),
                List.of("global"));
        String token = login("opportunity_close_" + suffix);
        Long accountId = createAccount(token, "关闭商机客户-" + suffix, departmentId, userId);
        Long wonOpportunityId = createOpportunity(
                token,
                accountId,
                "已赢单商机-" + suffix,
                "proposal",
                "following",
                departmentId,
                userId,
                List.of(),
                List.of());
        Long cancelledOpportunityId = createOpportunity(
                token,
                accountId,
                "取消跟进商机-" + suffix,
                "validation",
                "following",
                departmentId,
                userId,
                List.of(),
                List.of());
        createOpportunity(
                token,
                accountId,
                "仍在跟进商机-" + suffix,
                "lead",
                "following",
                departmentId,
                userId,
                List.of(),
                List.of());

        HttpJsonResponse wonCloseResponse = postJson(
                "/api/opportunities/" + wonOpportunityId + "/close",
                Map.of(
                        "close_type", "won",
                        "close_reason", "客户已确认签约",
                        "close_description", "合同进入用印流程"),
                authHeaders(token, "opportunity-close-won-trace-001"));
        HttpJsonResponse cancelledCloseResponse = postJson(
                "/api/opportunities/" + cancelledOpportunityId + "/close",
                Map.of(
                        "close_type", "cancelled",
                        "close_reason", "客户预算取消",
                        "close_description", "下一财年重新评估"),
                authHeaders(token, "opportunity-close-cancelled-trace-001"));
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/opportunities?default_following=true",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "opportunity-close-list-trace-001")),
                JsonNode.class);
        String wonStatus = jdbcTemplate.queryForObject(
                "select status from crm_opportunities where id = ?",
                String.class,
                wonOpportunityId);
        String cancelledStatus = jdbcTemplate.queryForObject(
                "select status from crm_opportunities where id = ?",
                String.class,
                cancelledOpportunityId);

        assertThat(wonCloseResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(cancelledCloseResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(wonStatus).isEqualTo("closed");
        assertThat(cancelledStatus).isEqualTo("cancelled");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).noneSatisfy(opportunity ->
                assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("已赢单商机-" + suffix));
        assertThat(listResponse.getBody().path("data")).noneSatisfy(opportunity ->
                assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("取消跟进商机-" + suffix));
        assertThat(listResponse.getBody().path("data")).anySatisfy(opportunity ->
                assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("仍在跟进商机-" + suffix));
    }

    @Test
    void reopensClosedOpportunityByRuleAndRecordsAuditLog() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("opportunity-reopen-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "opportunity_reopen_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "opportunity.close",
                        "opportunity.reopen"),
                List.of("global"));
        String token = login("opportunity_reopen_" + suffix);
        Long accountId = createAccount(token, "重启商机客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(
                token,
                accountId,
                "待重启商机-" + suffix,
                "proposal",
                "following",
                departmentId,
                userId,
                List.of(),
                List.of());
        postJson(
                "/api/opportunities/" + opportunityId + "/close",
                Map.of(
                        "close_type", "lost",
                        "close_reason", "价格未达成一致",
                        "close_description", "客户要求三个月后重新评估"),
                authHeaders(token, "opportunity-reopen-close-trace-001"));

        HttpJsonResponse reopenResponse = postJson(
                "/api/opportunities/" + opportunityId + "/reopen",
                Map.of("reopen_reason", "客户预算恢复"),
                authHeaders(token, "opportunity-reopen-trace-001"));
        Integer closeAuditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'opportunity.close' and object_id = ?",
                Integer.class,
                opportunityId);
        Integer reopenAuditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'opportunity.reopen' and object_id = ?",
                Integer.class,
                opportunityId);

        assertThat(reopenResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode reopened = reopenResponse.body().path("data");
        assertThat(reopened.path("status").asText()).isEqualTo("following");
        assertThat(reopened.path("can_reopen").asBoolean()).isFalse();
        assertThat(reopened.path("close_type").isNull()).isTrue();
        assertThat(closeAuditCount).isEqualTo(1);
        assertThat(reopenAuditCount).isEqualTo(1);
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
                new HttpEntity<>(request, authHeaders(accessToken, "opportunity-helper-account-trace-001")),
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
                new HttpEntity<>(request, authHeaders(accessToken, "opportunity-helper-contact-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createOpportunity(
            String accessToken,
            Long accountId,
            String opportunityName,
            String stage,
            String status,
            Long departmentId,
            Long ownerUserId,
            List<Map<String, Object>> collaborators,
            List<Map<String, Object>> contactRelations) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_name", opportunityName);
        request.put("stage", stage);
        request.put("status", status);
        request.put("level", "A");
        request.put("source", "customer");
        request.put("potential_point", "年度数字化项目");
        request.put("estimated_budget_amount", 1000000);
        request.put("estimated_contract_amount", 800000);
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("risk_status", "normal");
        request.put("collaborators", collaborators);
        request.put("contact_relations", contactRelations);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/opportunities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "opportunity-helper-create-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "商机测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "opportunity_role_" + username,
                "商机测试角色",
                "商机测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "商机测试用户",
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
                        "password", "S3cure!123"), traceHeaders("opportunity-login-trace-001")),
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

    private HttpJsonResponse postJson(String path, Map<String, Object> body, HttpHeaders headers) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + port + path))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
            headers.forEach((name, values) -> values.forEach(value -> builder.header(name, value)));
            HttpResponse<String> response = HttpClient.newHttpClient().send(
                    builder.build(),
                    HttpResponse.BodyHandlers.ofString());
            return new HttpJsonResponse(response.statusCode(), objectMapper.readTree(response.body()));
        } catch (Exception exception) {
            throw new IllegalStateException("POST request failed", exception);
        }
    }

    private record HttpJsonResponse(int status, JsonNode body) {
    }
}
