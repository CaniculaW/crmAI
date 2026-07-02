package com.canicula.crmai.receivable;

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
class ReceivablePlanControllerTest {

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
    void createsListsUpdatesTerminatesAndFollowsUpReceivablePlan() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("receivable-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "receivable_user_" + suffix,
                departmentId,
                allReceivablePermissions(),
                List.of("global"));
        String token = login("receivable_user_" + suffix);
        Long accountId = createAccount(token, "回款客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "回款商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 1200000);

        HttpJsonResponse createResponse = postJson(
                "/api/receivable-plans",
                receivablePlanRequest(contractId, userId, suffix, 360000),
                authHeaders(token, "receivable-create-trace-001"));

        assertThat(createResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode created = createResponse.body().path("data");
        Long planId = created.path("id").asLong();
        assertThat(created.path("account_id").asLong()).isEqualTo(accountId);
        assertThat(created.path("opportunity_id").asLong()).isEqualTo(opportunityId);
        assertThat(created.path("contract_id").asLong()).isEqualTo(contractId);
        assertThat(created.path("plan_name").asText()).isEqualTo("V2 首付款回款-" + suffix);
        assertThat(created.path("receivable_status").asText()).isEqualTo("planned");
        assertThat(created.path("planned_amount").asDouble()).isEqualTo(360000.0);
        assertThat(created.path("confirmed_received_amount").asDouble()).isEqualTo(0.0);
        assertThat(created.path("unreceived_amount").asDouble()).isEqualTo(360000.0);
        assertThat(created.path("contract_amount").asDouble()).isEqualTo(1200000.0);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/receivable-plans?contract_id=" + contractId + "&receivable_status=planned",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "receivable-list-trace-001")),
                JsonNode.class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(plan ->
                assertThat(plan.path("id").asLong()).isEqualTo(planId));

        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/receivable-plans/" + planId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "receivable-detail-trace-001")),
                JsonNode.class);
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(detailResponse.getBody().path("data").path("id").asLong()).isEqualTo(planId);

        HttpJsonResponse updateResponse = patchJson(
                "/api/receivable-plans/" + planId,
                Map.of(
                        "planned_amount", 380000,
                        "overdue_reason", "customer_process",
                        "remark", "客户付款流程更新"),
                authHeaders(token, "receivable-update-trace-001"));
        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(updateResponse.body().path("data").path("planned_amount").asDouble()).isEqualTo(380000.0);
        assertThat(updateResponse.body().path("data").path("overdue_reason").asText()).isEqualTo("customer_process");

        HttpJsonResponse followUpResponse = postJson(
                "/api/receivable-plans/" + planId + "/follow-ups",
                Map.of(
                        "follow_up_at", "2026-07-21T10:00:00+08:00",
                        "follow_up_content", "客户财务流程已提交",
                        "customer_feedback", "预计三日内付款",
                        "next_action", "跟进客户付款审批"),
                authHeaders(token, "receivable-follow-up-trace-001"));
        assertThat(followUpResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(followUpResponse.body().path("data").path("follow_up_content").asText())
                .isEqualTo("客户财务流程已提交");

        ResponseEntity<JsonNode> followUpsResponse = restTemplate.exchange(
                "/api/receivable-plans/" + planId + "/follow-ups",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "receivable-follow-ups-list-trace-001")),
                JsonNode.class);
        assertThat(followUpsResponse.getBody().path("data")).anySatisfy(followUp ->
                assertThat(followUp.path("follow_up_content").asText()).isEqualTo("客户财务流程已提交"));

        HttpJsonResponse terminateResponse = postJson(
                "/api/receivable-plans/" + planId + "/terminate",
                Map.of("termination_reason", "客户付款条件重签"),
                authHeaders(token, "receivable-terminate-trace-001"));
        assertThat(terminateResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(terminateResponse.body().path("data").path("receivable_status").asText()).isEqualTo("terminated");

        assertAuditCount("receivable.create", planId, 1);
        assertAuditCount("receivable.update", planId, 1);
        assertAuditCount("receivable.follow_up", planId, 1);
        assertAuditCount("receivable.terminate", planId, 1);
    }

    @Test
    void listFiltersOutUnreadableReceivablePlans() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("receivable-permission-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "receivable_permission_creator_" + suffix,
                departmentId,
                allReceivablePermissions(),
                List.of("global"));
        createLoginReadyUser(
                "receivable_permission_viewer_" + suffix,
                departmentId,
                List.of("receivable.read", "contract.read"),
                List.of("own"));
        String creatorToken = login("receivable_permission_creator_" + suffix);
        String viewerToken = login("receivable_permission_viewer_" + suffix);
        Long accountId = createAccount(creatorToken, "不可见回款客户-" + suffix, departmentId, creatorUserId);
        Long opportunityId = createOpportunity(creatorToken, accountId, "不可见回款商机-" + suffix, departmentId, creatorUserId);
        Long contractId = createContract(creatorToken, accountId, opportunityId, creatorUserId, suffix, 1200000);
        Long planId = createReceivablePlan(creatorToken, contractId, creatorUserId, suffix, 360000);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/receivable-plans",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "receivable-permission-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/receivable-plans/" + planId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "receivable-permission-detail-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).noneSatisfy(plan ->
                assertThat(plan.path("id").asLong()).isEqualTo(planId));
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private Long createReceivablePlan(
            String accessToken,
            Long contractId,
            Long ownerUserId,
            String suffix,
            int plannedAmount) {
        HttpJsonResponse response = postJson(
                "/api/receivable-plans",
                receivablePlanRequest(contractId, ownerUserId, suffix, plannedAmount),
                authHeaders(accessToken, "receivable-helper-create-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> receivablePlanRequest(
            Long contractId,
            Long ownerUserId,
            String suffix,
            int plannedAmount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("contract_id", contractId);
        request.put("plan_name", "V2 首付款回款-" + suffix);
        request.put("plan_stage", "首付款");
        request.put("planned_receivable_date", "2026-07-20T10:00:00+08:00");
        request.put("planned_amount", plannedAmount);
        request.put("owner_user_id", ownerUserId);
        request.put("payment_terms_snapshot", "30%预付款");
        request.put("remark", "回款 API 测试");
        return request;
    }

    private Long createContract(
            String accessToken,
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String suffix,
            int contractAmount) {
        HttpJsonResponse response = postJson(
                "/api/contracts",
                contractRequest(accountId, opportunityId, ownerUserId, suffix, contractAmount),
                authHeaders(accessToken, "receivable-helper-contract-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> contractRequest(
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String suffix,
            int contractAmount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_id", opportunityId);
        request.put("contract_name", "回款来源合同-" + suffix);
        request.put("contract_no", "REC-CONTRACT-" + suffix);
        request.put("contract_type", "project");
        request.put("contract_status", "performing");
        request.put("contract_amount", contractAmount);
        request.put("tax_rate", 0.13);
        request.put("owner_user_id", ownerUserId);
        request.put("business_owner_id", ownerUserId);
        request.put("payment_terms", "30%预付款，40%上线，30%终验");
        request.put("invoice_terms", "按项目节点开票");
        request.put("delivery_scope", "CRM V2 回款管理链路");
        request.put("acceptance_criteria", "UAT 通过");
        request.put("risk_level", "low");
        request.put("remark", "回款测试合同");
        return request;
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
                new HttpEntity<>(request, authHeaders(accessToken, "receivable-helper-account-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createOpportunity(
            String accessToken,
            Long accountId,
            String opportunityName,
            Long departmentId,
            Long ownerUserId) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_name", opportunityName);
        request.put("stage", "won");
        request.put("status", "won");
        request.put("level", "A");
        request.put("source", "customer");
        request.put("potential_point", "年度数字化项目");
        request.put("estimated_budget_amount", 1500000);
        request.put("estimated_contract_amount", 1200000);
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("risk_status", "normal");
        request.put("collaborators", List.of());
        request.put("contact_relations", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/opportunities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "receivable-helper-opportunity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "回款测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "receivable_role_" + username,
                "回款测试角色",
                "回款测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "回款测试用户",
                null,
                username + "@example.com",
                "finance",
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
            grantDataScope(roleId, "opportunity", scope);
            grantDataScope(roleId, "contract", scope);
        });
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");
        return userId;
    }

    private List<String> allReceivablePermissions() {
        return List.of(
                "account.create",
                "opportunity.create",
                "opportunity.read",
                "contract.create",
                "contract.read",
                "receivable.create",
                "receivable.read",
                "receivable.update",
                "receivable.terminate",
                "receivable.follow_up");
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
                        "password", "S3cure!123"), traceHeaders("receivable-login-trace-001")),
                JsonNode.class);
        return loginResponse.getBody().path("data").path("access_token").asText();
    }

    private HttpHeaders authHeaders(String accessToken, String traceId) {
        HttpHeaders headers = traceHeaders(traceId);
        headers.setBearerAuth(accessToken);
        return headers;
    }

    private HttpHeaders traceHeaders(String traceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Type", "application/json");
        headers.add("X-Trace-Id", traceId);
        return headers;
    }

    private HttpJsonResponse postJson(String path, Object body, HttpHeaders headers) {
        return sendJson("POST", path, body, headers);
    }

    private HttpJsonResponse patchJson(String path, Object body, HttpHeaders headers) {
        return sendJson("PATCH", path, body, headers);
    }

    private HttpJsonResponse sendJson(String method, String path, Object body, HttpHeaders headers) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + port + path))
                    .method(method, HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
            headers.forEach((name, values) -> values.forEach(value -> builder.header(name, value)));
            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new HttpJsonResponse(response.statusCode(), objectMapper.readTree(response.body()));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private void assertAuditCount(String actionCode, Long objectId, int expectedCount) {
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = ? and object_id = ?",
                Integer.class,
                actionCode,
                objectId);
        assertThat(auditCount).isEqualTo(expectedCount);
    }

    private record HttpJsonResponse(int status, JsonNode body) {
    }
}
