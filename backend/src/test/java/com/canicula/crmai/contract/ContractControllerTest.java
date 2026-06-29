package com.canicula.crmai.contract;

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
class ContractControllerTest {

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
    void createsListsUpdatesAndTerminatesContractWithAuditAndChangeLog() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("contract-flow-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "contract_flow_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "contract.update",
                        "contract.terminate"),
                List.of("global"));
        String token = login("contract_flow_" + suffix);
        Long accountId = createAccount(token, "合同客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "合同商机-" + suffix, departmentId, userId);

        Map<String, Object> createRequest = contractRequest(accountId, opportunityId, userId, suffix);
        HttpJsonResponse createResponse = postJson(
                "/api/contracts",
                createRequest,
                authHeaders(token, "contract-create-trace-001"));

        assertThat(createResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode created = createResponse.body().path("data");
        Long contractId = created.path("id").asLong();
        assertThat(created.path("contract_name").asText()).isEqualTo("CRM 项目合同-" + suffix);
        assertThat(created.path("contract_type").asText()).isEqualTo("project");
        assertThat(created.path("contract_status").asText()).isEqualTo("drafting");
        assertThat(created.path("contract_amount").asDouble()).isEqualTo(1200000.0);
        assertThat(created.path("net_amount").asDouble()).isEqualTo(1061946.90);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/contracts?account_id=" + accountId + "&contract_status=drafting",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "contract-list-trace-001")),
                JsonNode.class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(contract ->
                assertThat(contract.path("id").asLong()).isEqualTo(contractId));

        HttpJsonResponse updateResponse = patchJson(
                "/api/contracts/" + contractId,
                Map.of(
                        "contract_amount", 1360000,
                        "payment_terms", "30%预付款，50%上线，20%终验",
                        "invoice_terms", "按付款节点开具增值税专用发票",
                        "delivery_scope", "增加移动端管理驾驶舱交付",
                        "risk_level", "medium",
                        "change_reason", "客户增加移动端范围并调整付款节点"),
                authHeaders(token, "contract-update-trace-001"));
        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(updateResponse.body().path("data").path("contract_amount").asDouble()).isEqualTo(1360000.0);
        assertThat(updateResponse.body().path("data").path("payment_terms").asText())
                .isEqualTo("30%预付款，50%上线，20%终验");

        ResponseEntity<JsonNode> changesResponse = restTemplate.exchange(
                "/api/contracts/" + contractId + "/changes",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "contract-changes-trace-001")),
                JsonNode.class);
        assertThat(changesResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(changesResponse.getBody().path("data")).anySatisfy(change -> {
            assertThat(change.path("change_type").asText()).isEqualTo("amount");
            assertThat(change.path("change_reason").asText()).isEqualTo("客户增加移动端范围并调整付款节点");
        });

        HttpJsonResponse terminateResponse = postJson(
                "/api/contracts/" + contractId + "/terminate",
                Map.of("termination_reason", "客户预算调整，合同提前终止"),
                authHeaders(token, "contract-terminate-trace-001"));
        assertThat(terminateResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(terminateResponse.body().path("data").path("contract_status").asText()).isEqualTo("terminated");
        assertThat(terminateResponse.body().path("data").path("termination_reason").asText())
                .isEqualTo("客户预算调整，合同提前终止");

        assertAuditCount("contract.create", contractId, 1);
        assertAuditCount("contract.update", contractId, 1);
        assertAuditCount("contract.terminate", contractId, 1);
    }

    @Test
    void rejectsCriticalContractChangesWithoutReason() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("contract-rule-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "contract_rule_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "contract.update"),
                List.of("global"));
        String token = login("contract_rule_" + suffix);
        Long accountId = createAccount(token, "合同规则客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "合同规则商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix);

        HttpJsonResponse updateResponse = patchJson(
                "/api/contracts/" + contractId,
                Map.of(
                        "contract_amount", 1500000,
                        "payment_terms", "50%预付款，50%终验"),
                authHeaders(token, "contract-rule-update-trace-001"));

        assertThat(updateResponse.status()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(updateResponse.body().path("message").asText()).contains("变更原因");
    }

    @Test
    void createsListsAndUpdatesContractMilestonesWithAudit() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("contract-milestone-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "contract_milestone_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "contract.milestone.manage"),
                List.of("global"));
        String token = login("contract_milestone_" + suffix);
        Long accountId = createAccount(token, "合同节点客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "合同节点商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix);

        HttpJsonResponse createResponse = postJson(
                "/api/contracts/" + contractId + "/milestones",
                Map.of(
                        "milestone_name", "项目启动会",
                        "milestone_type", "kickoff",
                        "status", "pending",
                        "remark", "合同签署后 5 个工作日内启动"),
                authHeaders(token, "contract-milestone-create-trace-001"));
        assertThat(createResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode created = createResponse.body().path("data");
        Long milestoneId = created.path("id").asLong();
        assertThat(created.path("contract_id").asLong()).isEqualTo(contractId);
        assertThat(created.path("milestone_name").asText()).isEqualTo("项目启动会");
        assertThat(created.path("status").asText()).isEqualTo("pending");

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/contracts/" + contractId + "/milestones",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "contract-milestone-list-trace-001")),
                JsonNode.class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(milestone ->
                assertThat(milestone.path("id").asLong()).isEqualTo(milestoneId));

        HttpJsonResponse updateResponse = patchJson(
                "/api/contracts/" + contractId + "/milestones/" + milestoneId,
                Map.of(
                        "status", "completed",
                        "remark", "项目启动会已完成，交付计划已确认"),
                authHeaders(token, "contract-milestone-update-trace-001"));
        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(updateResponse.body().path("data").path("status").asText()).isEqualTo("completed");
        assertThat(updateResponse.body().path("data").path("remark").asText()).isEqualTo("项目启动会已完成，交付计划已确认");

        assertAuditCount("contract.milestone.create", milestoneId, 1);
        assertAuditCount("contract.milestone.update", milestoneId, 1);
    }

    @Test
    void listFiltersOutUnreadableContracts() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("contract-permission-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "contract_permission_creator_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read"),
                List.of("global"));
        createLoginReadyUser(
                "contract_permission_viewer_" + suffix,
                departmentId,
                List.of("contract.read"),
                List.of("own"));
        String creatorToken = login("contract_permission_creator_" + suffix);
        String viewerToken = login("contract_permission_viewer_" + suffix);
        Long accountId = createAccount(creatorToken, "不可见合同客户-" + suffix, departmentId, creatorUserId);
        Long opportunityId = createOpportunity(creatorToken, accountId, "不可见合同商机-" + suffix, departmentId, creatorUserId);
        Long contractId = createContract(creatorToken, accountId, opportunityId, creatorUserId, suffix);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/contracts",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "contract-permission-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/contracts/" + contractId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "contract-permission-detail-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).noneSatisfy(contract ->
                assertThat(contract.path("id").asLong()).isEqualTo(contractId));
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private Long createContract(
            String accessToken,
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String suffix) {
        HttpJsonResponse response = postJson(
                "/api/contracts",
                contractRequest(accountId, opportunityId, ownerUserId, suffix),
                authHeaders(accessToken, "contract-helper-create-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> contractRequest(Long accountId, Long opportunityId, Long ownerUserId, String suffix) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_id", opportunityId);
        request.put("contract_name", "CRM 项目合同-" + suffix);
        request.put("contract_no", "CRM-" + suffix);
        request.put("contract_type", "project");
        request.put("contract_status", "drafting");
        request.put("contract_amount", 1200000);
        request.put("tax_rate", 0.13);
        request.put("our_signing_entity", "上海智能科技有限公司");
        request.put("customer_signing_entity", "客户集团有限公司");
        request.put("owner_user_id", ownerUserId);
        request.put("business_owner_id", ownerUserId);
        request.put("payment_terms", "30%预付款，40%上线，30%终验");
        request.put("invoice_terms", "按回款节点开票");
        request.put("delivery_scope", "CRM V2 销售到财务闭环");
        request.put("acceptance_criteria", "UAT 通过并完成上线交付");
        request.put("risk_level", "low");
        request.put("risk_description", "客户侧流程待最终确认");
        request.put("remark", "合同 API 测试");
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
                new HttpEntity<>(request, authHeaders(accessToken, "contract-helper-account-trace-001")),
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
                new HttpEntity<>(request, authHeaders(accessToken, "contract-helper-opportunity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "合同测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "contract_role_" + username,
                "合同测试角色",
                "合同测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "合同测试用户",
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
            grantDataScope(roleId, "opportunity", scope);
            grantDataScope(roleId, "contract", scope);
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
                        "password", "S3cure!123"), traceHeaders("contract-login-trace-001")),
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
