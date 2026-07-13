package com.canicula.crmai.solution;

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
class SolutionDocumentControllerTest {

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
    void createsListsUpdatesAndVoidsSolutionDocumentWithAudit() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("solution-flow-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "solution_flow_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "solution.create",
                        "solution.read",
                        "solution.update",
                        "solution.void"),
                List.of("global"));
        String token = login("solution_flow_" + suffix);
        Long accountId = createAccount(token, "方案客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "方案商机-" + suffix, departmentId, userId);

        Map<String, Object> createRequest = new LinkedHashMap<>();
        createRequest.put("account_id", accountId);
        createRequest.put("opportunity_id", opportunityId);
        createRequest.put("document_name", "数字化建设技术方案-" + suffix);
        createRequest.put("document_type", "technical_solution");
        createRequest.put("version_no", "V1.0");
        createRequest.put("status", "drafting");
        createRequest.put("owner_user_id", userId);
        createRequest.put("customer_requirement_summary", "客户关注业务闭环与数据权限");
        createRequest.put("technical_solution_summary", "采用CRM业务链路与权限分层");
        createRequest.put("quotation_amount", 880000);
        createRequest.put("cost_amount", 620000);
        createRequest.put("estimated_gross_margin_rate", 0.2955);
        createRequest.put("bid_self_check_result", "risk");
        createRequest.put("bid_risk_description", "资质材料待补齐");

        HttpJsonResponse createResponse = postJson(
                "/api/solutions",
                createRequest,
                authHeaders(token, "solution-create-trace-001"));

        assertThat(createResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode created = createResponse.body().path("data");
        Long solutionId = created.path("id").asLong();
        assertThat(created.path("document_name").asText()).isEqualTo("数字化建设技术方案-" + suffix);
        assertThat(created.path("document_type").asText()).isEqualTo("technical_solution");
        assertThat(created.path("status").asText()).isEqualTo("drafting");
        assertThat(created.path("bid_self_check_result").asText()).isEqualTo("risk");

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/solutions?opportunity_id=" + opportunityId + "&status=drafting",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "solution-list-trace-001")),
                JsonNode.class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(solution ->
                assertThat(solution.path("id").asLong()).isEqualTo(solutionId));

        HttpJsonResponse updateResponse = patchJson(
                "/api/solutions/" + solutionId,
                Map.of(
                        "status", "submitted",
                        "customer_feedback", "客户要求补充实施计划",
                        "technical_solution_summary", "补充项目组织与交付里程碑"),
                authHeaders(token, "solution-update-trace-001"));
        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(updateResponse.body().path("data").path("status").asText()).isEqualTo("submitted");
        assertThat(updateResponse.body().path("data").path("customer_feedback").asText())
                .isEqualTo("客户要求补充实施计划");

        HttpJsonResponse voidResponse = postJson(
                "/api/solutions/" + solutionId + "/void",
                Map.of("void_reason", "客户需求版本升级，旧方案停止使用"),
                authHeaders(token, "solution-void-trace-001"));
        assertThat(voidResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(voidResponse.body().path("data").path("status").asText()).isEqualTo("voided");
        assertThat(voidResponse.body().path("data").path("void_reason").asText())
                .isEqualTo("客户需求版本升级，旧方案停止使用");

        assertAuditCount("solution.create", solutionId, 1);
        assertAuditCount("solution.update", solutionId, 1);
        assertAuditCount("solution.void", solutionId, 1);
    }

    @Test
    void listFiltersOutUnreadableSolutionDocuments() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("solution-permission-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "solution_permission_creator_" + suffix,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "solution.create",
                        "solution.read"),
                List.of("global"));
        Long viewerUserId = createLoginReadyUser(
                "solution_permission_viewer_" + suffix,
                departmentId,
                List.of("solution.read"),
                List.of("own"));
        String creatorToken = login("solution_permission_creator_" + suffix);
        String viewerToken = login("solution_permission_viewer_" + suffix);
        Long accountId = createAccount(creatorToken, "不可见方案客户-" + suffix, departmentId, creatorUserId);
        Long opportunityId = createOpportunity(creatorToken, accountId, "不可见方案商机-" + suffix, departmentId, creatorUserId);
        Long solutionId = createSolutionDocument(
                creatorToken,
                accountId,
                opportunityId,
                creatorUserId,
                "不可见方案-" + suffix);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/solutions",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "solution-permission-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/solutions/" + solutionId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "solution-permission-detail-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).noneSatisfy(solution ->
                assertThat(solution.path("id").asLong()).isEqualTo(solutionId));
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void submitsQuotationAndBidDocumentsAndLocksApprovalCriticalFields() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "solution_approval_" + suffix;
        Long departmentId = createDepartment("solution-approval-dept-" + suffix);
        Long userId = createLoginReadyUser(
                username,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "solution.create",
                        "solution.read",
                        "solution.update",
                        "approval.submit"),
                List.of("global"));
        createDefaultWorkflow("quotation", username, userId);
        createDefaultWorkflow("bid", username, userId);
        String token = login(username);
        Long accountId = createAccount(token, "审批方案客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "审批方案商机-" + suffix, departmentId, userId);

        Long quotationId = createApprovalDocument(
                token, accountId, opportunityId, userId, "quotation", "审批报价-" + suffix);
        Long bidId = createApprovalDocument(
                token, accountId, opportunityId, userId, "bid", "审批投标-bid-" + suffix);
        Long bidDocumentId = createApprovalDocument(
                token, accountId, opportunityId, userId, "bid_document", "审批投标-bid-document-" + suffix);

        assertSubmission(token, quotationId, "quotation");
        assertSubmission(token, bidId, "bid");
        assertSubmission(token, bidDocumentId, "bid");

        HttpJsonResponse criticalUpdate = patchJson(
                "/api/solutions/" + quotationId,
                Map.of(
                        "document_type", "bid_document",
                        "version_no", "V2.0",
                        "status", "approved",
                        "quotation_amount", 990000,
                        "cost_amount", 700000,
                        "estimated_gross_margin_rate", 0.29,
                        "bid_self_check_result", "pass",
                        "bid_risk_description", "风险已消除"),
                authHeaders(token, "solution-approval-critical-update"));
        assertThat(criticalUpdate.status()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(criticalUpdate.body().path("message").asText()).contains("审批中");

        HttpJsonResponse remarkUpdate = patchJson(
                "/api/solutions/" + quotationId,
                Map.of("remark", "审批中补充说明"),
                authHeaders(token, "solution-approval-remark-update"));
        assertThat(remarkUpdate.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(remarkUpdate.body().path("data").path("status").asText()).isEqualTo("approving");
        assertThat(remarkUpdate.body().path("data").path("remark").asText()).isEqualTo("审批中补充说明");
        assertAuditCount("solution.submit-approval", quotationId, 1);
    }

    @Test
    void requiresBothSolutionUpdateAndApprovalSubmitAndPreservesDataScope() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("solution-approval-permission-" + suffix);
        String ownerUsername = "solution_approval_owner_" + suffix;
        Long ownerId = createLoginReadyUser(
                ownerUsername,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "solution.create",
                        "solution.read",
                        "solution.update",
                        "approval.submit"),
                List.of("global"));
        createDefaultWorkflow("quotation", ownerUsername, ownerId);
        String ownerToken = login(ownerUsername);
        Long accountId = createAccount(ownerToken, "审批权限客户-" + suffix, departmentId, ownerId);
        Long opportunityId = createOpportunity(ownerToken, accountId, "审批权限商机-" + suffix, departmentId, ownerId);
        Long solutionId = createApprovalDocument(
                ownerToken, accountId, opportunityId, ownerId, "quotation", "审批权限报价-" + suffix);

        createLoginReadyUser(
                "solution_no_approval_" + suffix,
                departmentId,
                List.of("solution.update"),
                List.of("global"));
        createLoginReadyUser(
                "solution_no_update_" + suffix,
                departmentId,
                List.of("approval.submit"),
                List.of("global"));
        createLoginReadyUser(
                "solution_out_scope_" + suffix,
                departmentId,
                List.of("solution.update", "approval.submit"),
                List.of("own"));

        assertForbiddenSubmission(login("solution_no_approval_" + suffix), solutionId);
        assertForbiddenSubmission(login("solution_no_update_" + suffix), solutionId);
        assertForbiddenSubmission(login("solution_out_scope_" + suffix), solutionId);
        assertThat(jdbcTemplate.queryForObject(
                "select status from crm_solution_documents where id = ?",
                String.class,
                solutionId)).isEqualTo("drafting");
    }

    private Long createSolutionDocument(
            String accessToken,
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String documentName) {
        HttpJsonResponse response = postJson(
                "/api/solutions",
                Map.of(
                        "account_id", accountId,
                        "opportunity_id", opportunityId,
                        "document_name", documentName,
                        "document_type", "technical_solution",
                        "version_no", "V1.0",
                        "status", "drafting",
                        "owner_user_id", ownerUserId),
                authHeaders(accessToken, "solution-helper-create-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Long createApprovalDocument(
            String accessToken,
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String documentType,
            String documentName) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_id", opportunityId);
        request.put("document_name", documentName);
        request.put("document_type", documentType);
        request.put("version_no", "V1.0");
        request.put("status", "drafting");
        request.put("owner_user_id", ownerUserId);
        request.put("quotation_amount", 880000);
        request.put("cost_amount", 620000);
        request.put("estimated_gross_margin_rate", 0.2955);
        request.put("bid_self_check_result", "risk");
        request.put("bid_risk_description", "资质材料待补齐");
        HttpJsonResponse response = postJson(
                "/api/solutions",
                request,
                authHeaders(accessToken, "solution-approval-helper-create"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private void assertSubmission(String accessToken, Long solutionId, String expectedObjectType) {
        HttpJsonResponse response = postJson(
                "/api/solutions/" + solutionId + "/submit-approval",
                Map.of(),
                authHeaders(accessToken, "solution-submit-approval-" + solutionId));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(response.body().path("data").path("status").asText()).isEqualTo("approving");
        assertThat(jdbcTemplate.queryForObject(
                "select object_type from approval_instances where object_id = ? order by id desc limit 1",
                String.class,
                solutionId)).isEqualTo(expectedObjectType);
    }

    private void assertForbiddenSubmission(String accessToken, Long solutionId) {
        HttpJsonResponse response = postJson(
                "/api/solutions/" + solutionId + "/submit-approval",
                Map.of(),
                authHeaders(accessToken, "solution-forbidden-submit-" + UUID.randomUUID()));
        assertThat(response.status()).isEqualTo(HttpStatus.FORBIDDEN.value());
    }

    private void createDefaultWorkflow(String objectType, String approverUsername, Long createdBy) {
        Long roleId = jdbcTemplate.queryForObject(
                "select id from sys_roles where code = ?",
                Long.class,
                "solution_role_" + approverUsername);
        jdbcTemplate.update(
                "update approval_templates set is_default = false where tenant_id = 1 and object_type = ?",
                objectType);
        String templateName = "方案快捷审批-" + objectType + "-" + UUID.randomUUID();
        jdbcTemplate.update(
                """
                insert into approval_templates (
                    tenant_id, object_type, template_name, status, is_default, created_by
                ) values (1, ?, ?, 'active', true, ?)
                """,
                objectType,
                templateName,
                createdBy);
        Long templateId = jdbcTemplate.queryForObject(
                "select id from approval_templates where template_name = ? and created_by = ?",
                Long.class,
                templateName,
                createdBy);
        jdbcTemplate.update(
                """
                insert into approval_template_nodes (
                    template_id, step_order, node_name, approver_role_id, status
                ) values (?, 1, '业务负责人审批', ?, 'active')
                """,
                templateId,
                roleId);
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
                new HttpEntity<>(request, authHeaders(accessToken, "solution-helper-account-trace-001")),
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
        request.put("stage", "proposal");
        request.put("status", "following");
        request.put("level", "A");
        request.put("source", "customer");
        request.put("potential_point", "年度数字化项目");
        request.put("estimated_budget_amount", 1000000);
        request.put("estimated_contract_amount", 800000);
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("risk_status", "normal");
        request.put("collaborators", List.of());
        request.put("contact_relations", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/opportunities",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "solution-helper-opportunity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "方案测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "solution_role_" + username,
                "方案测试角色",
                "方案测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "方案测试用户",
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
            grantDataScope(roleId, "solution", scope);
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
                        "password", "S3cure!123"), traceHeaders("solution-login-trace-001")),
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
