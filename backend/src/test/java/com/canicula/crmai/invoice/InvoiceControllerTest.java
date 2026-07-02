package com.canicula.crmai.invoice;

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
class InvoiceControllerTest {

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
    void createsListsDetailsAndUpdatesInvoicePlanWithContractScope() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("invoice-flow-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "invoice_flow_" + suffix,
                departmentId,
                allInvoicePermissions(),
                List.of("global"));
        String token = login("invoice_flow_" + suffix);
        Long accountId = createAccount(token, "开票客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "开票商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 1200000);

        HttpJsonResponse createResponse = postJson(
                "/api/invoices",
                invoicePlanRequest(contractId, userId, suffix, 300000),
                authHeaders(token, "invoice-create-trace-001"));

        assertThat(createResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode created = createResponse.body().path("data");
        Long invoiceId = created.path("id").asLong();
        assertThat(created.path("account_id").asLong()).isEqualTo(accountId);
        assertThat(created.path("opportunity_id").asLong()).isEqualTo(opportunityId);
        assertThat(created.path("contract_id").asLong()).isEqualTo(contractId);
        assertThat(created.path("plan_name").asText()).isEqualTo("V2 首期开票-" + suffix);
        assertThat(created.path("invoice_status").asText()).isEqualTo("planned");
        assertThat(created.path("planned_amount").asDouble()).isEqualTo(300000.0);
        assertThat(created.path("net_amount").asDouble()).isEqualTo(265486.73);
        assertThat(created.path("tax_amount").asDouble()).isEqualTo(34513.27);
        assertThat(created.path("contract_amount").asDouble()).isEqualTo(1200000.0);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/invoices?contract_id=" + contractId + "&invoice_status=planned",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "invoice-list-trace-001")),
                JsonNode.class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(invoice ->
                assertThat(invoice.path("id").asLong()).isEqualTo(invoiceId));

        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/invoices/" + invoiceId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "invoice-detail-trace-001")),
                JsonNode.class);
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(detailResponse.getBody().path("data").path("id").asLong()).isEqualTo(invoiceId);

        HttpJsonResponse updateResponse = patchJson(
                "/api/invoices/" + invoiceId,
                Map.of(
                        "plan_name", "V2 首期开票调整-" + suffix,
                        "planned_amount", 360000,
                        "invoice_type", "vat_special",
                        "tax_rate", 0.13,
                        "remark", "按客户确认后的实施节点调整"),
                authHeaders(token, "invoice-update-trace-001"));
        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(updateResponse.body().path("data").path("plan_name").asText())
                .isEqualTo("V2 首期开票调整-" + suffix);
        assertThat(updateResponse.body().path("data").path("planned_amount").asDouble()).isEqualTo(360000.0);

        assertAuditCount("invoice.create", invoiceId, 1);
        assertAuditCount("invoice.update", invoiceId, 1);
    }

    @Test
    void appliesIssuesSignsRegistersExceptionAndVoidsInvoiceWithAudit() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("invoice-action-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "invoice_action_" + suffix,
                departmentId,
                allInvoicePermissions(),
                List.of("global"));
        String token = login("invoice_action_" + suffix);
        Long accountId = createAccount(token, "开票动作客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "开票动作商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 1200000);
        Long invoiceId = createInvoicePlan(token, contractId, userId, suffix, 200000);

        HttpJsonResponse applyResponse = postJson(
                "/api/invoices/" + invoiceId + "/apply",
                Map.of("applied_amount", 200000, "application_note", "按首期节点申请开票"),
                authHeaders(token, "invoice-apply-trace-001"));
        assertThat(applyResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(applyResponse.body().path("data").path("invoice_status").asText()).isEqualTo("applied");

        HttpJsonResponse issueResponse = postJson(
                "/api/invoices/" + invoiceId + "/issue",
                Map.of(
                        "invoice_code", "INV-CODE-" + suffix,
                        "invoice_no", "INV-NO-" + suffix,
                        "invoice_date", "2026-06-30T10:00:00+08:00",
                        "tax_rate", 0.13,
                        "actual_invoice_amount", 200000),
                authHeaders(token, "invoice-issue-trace-001"));
        assertThat(issueResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(issueResponse.body().path("data").path("invoice_status").asText()).isEqualTo("invoiced");
        assertThat(issueResponse.body().path("data").path("effective_invoiced_amount").asDouble()).isEqualTo(200000.0);

        HttpJsonResponse signResponse = postJson(
                "/api/invoices/" + invoiceId + "/sign",
                Map.of(
                        "signed_by_name", "客户财务张经理",
                        "sign_note", "客户确认收到发票"),
                authHeaders(token, "invoice-sign-trace-001"));
        assertThat(signResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(signResponse.body().path("data").path("invoice_status").asText()).isEqualTo("signed");

        Long exceptionInvoiceId = createInvoicePlan(token, contractId, userId, suffix + "-ex", 100000);
        applyInvoice(token, exceptionInvoiceId, 100000);
        issueInvoice(token, exceptionInvoiceId, "EX-" + suffix, 100000);
        HttpJsonResponse exceptionResponse = postJson(
                "/api/invoices/" + exceptionInvoiceId + "/exception",
                Map.of(
                        "exception_type", "customer_info_error",
                        "exception_reason", "客户税号信息错误",
                        "exception_resolution", "等待客户提供新税号"),
                authHeaders(token, "invoice-exception-trace-001"));
        assertThat(exceptionResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(exceptionResponse.body().path("data").path("invoice_status").asText()).isEqualTo("exception");

        Long voidInvoiceId = createInvoicePlan(token, contractId, userId, suffix + "-void", 100000);
        applyInvoice(token, voidInvoiceId, 100000);
        issueInvoice(token, voidInvoiceId, "VOID-" + suffix, 100000);
        HttpJsonResponse voidResponse = postJson(
                "/api/invoices/" + voidInvoiceId + "/void",
                Map.of("void_reason", "客户要求重开发票"),
                authHeaders(token, "invoice-void-trace-001"));
        assertThat(voidResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(voidResponse.body().path("data").path("invoice_status").asText()).isEqualTo("voided");

        assertAuditCount("invoice.apply", invoiceId, 1);
        assertAuditCount("invoice.issue", invoiceId, 1);
        assertAuditCount("invoice.sign", invoiceId, 1);
        assertAuditCount("invoice.exception", exceptionInvoiceId, 1);
        assertAuditCount("invoice.void", voidInvoiceId, 1);
    }

    @Test
    void rejectsEffectiveInvoiceAmountAboveContractAmountAndReleasesAmountAfterVoid() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("invoice-amount-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "invoice_amount_" + suffix,
                departmentId,
                allInvoicePermissions(),
                List.of("global"));
        String token = login("invoice_amount_" + suffix);
        Long accountId = createAccount(token, "开票金额客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "开票金额商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 100000);

        Long firstInvoiceId = createInvoicePlan(token, contractId, userId, suffix + "-first", 80000);
        applyInvoice(token, firstInvoiceId, 80000);
        issueInvoice(token, firstInvoiceId, "FIRST-" + suffix, 80000);

        Long secondInvoiceId = createInvoicePlan(token, contractId, userId, suffix + "-second", 30000);
        applyInvoice(token, secondInvoiceId, 30000);
        HttpJsonResponse overLimitResponse = postJson(
                "/api/invoices/" + secondInvoiceId + "/issue",
                issueRequest("SECOND-" + suffix, 30000),
                authHeaders(token, "invoice-over-limit-trace-001"));
        assertThat(overLimitResponse.status()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(overLimitResponse.body().path("message").asText()).contains("合同金额");

        HttpJsonResponse voidFirstResponse = postJson(
                "/api/invoices/" + firstInvoiceId + "/void",
                Map.of("void_reason", "释放额度用于后续重开"),
                authHeaders(token, "invoice-release-void-trace-001"));
        assertThat(voidFirstResponse.status()).isEqualTo(HttpStatus.OK.value());

        HttpJsonResponse reissueSecondResponse = postJson(
                "/api/invoices/" + secondInvoiceId + "/issue",
                issueRequest("SECOND-REISSUE-" + suffix, 30000),
                authHeaders(token, "invoice-reissue-trace-001"));
        assertThat(reissueSecondResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(reissueSecondResponse.body().path("data").path("invoice_status").asText()).isEqualTo("invoiced");
        assertThat(reissueSecondResponse.body().path("data").path("remaining_invoice_amount").asDouble()).isEqualTo(70000.0);
    }

    @Test
    void listFiltersOutUnreadableInvoices() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("invoice-permission-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "invoice_permission_creator_" + suffix,
                departmentId,
                allInvoicePermissions(),
                List.of("global"));
        createLoginReadyUser(
                "invoice_permission_viewer_" + suffix,
                departmentId,
                List.of("invoice.read", "contract.read"),
                List.of("own"));
        String creatorToken = login("invoice_permission_creator_" + suffix);
        String viewerToken = login("invoice_permission_viewer_" + suffix);
        Long accountId = createAccount(creatorToken, "不可见开票客户-" + suffix, departmentId, creatorUserId);
        Long opportunityId = createOpportunity(creatorToken, accountId, "不可见开票商机-" + suffix, departmentId, creatorUserId);
        Long contractId = createContract(creatorToken, accountId, opportunityId, creatorUserId, suffix, 1200000);
        Long invoiceId = createInvoicePlan(creatorToken, contractId, creatorUserId, suffix, 100000);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/invoices",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "invoice-permission-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/invoices/" + invoiceId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "invoice-permission-detail-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).noneSatisfy(invoice ->
                assertThat(invoice.path("id").asLong()).isEqualTo(invoiceId));
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private Long createInvoicePlan(
            String accessToken,
            Long contractId,
            Long ownerUserId,
            String suffix,
            int plannedAmount) {
        HttpJsonResponse response = postJson(
                "/api/invoices",
                invoicePlanRequest(contractId, ownerUserId, suffix, plannedAmount),
                authHeaders(accessToken, "invoice-helper-create-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> invoicePlanRequest(
            Long contractId,
            Long ownerUserId,
            String suffix,
            int plannedAmount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("contract_id", contractId);
        request.put("plan_name", "V2 首期开票-" + suffix);
        request.put("planned_invoice_date", "2026-07-15T10:00:00+08:00");
        request.put("planned_amount", plannedAmount);
        request.put("invoice_type", "vat_special");
        request.put("tax_rate", 0.13);
        request.put("owner_user_id", ownerUserId);
        request.put("invoice_terms_snapshot", "按合同首付款节点开票");
        request.put("remark", "开票 API 测试");
        return request;
    }

    private void applyInvoice(String accessToken, Long invoiceId, int appliedAmount) {
        HttpJsonResponse response = postJson(
                "/api/invoices/" + invoiceId + "/apply",
                Map.of("applied_amount", appliedAmount, "application_note", "测试申请开票"),
                authHeaders(accessToken, "invoice-helper-apply-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
    }

    private void issueInvoice(String accessToken, Long invoiceId, String invoiceNoPrefix, int actualAmount) {
        HttpJsonResponse response = postJson(
                "/api/invoices/" + invoiceId + "/issue",
                issueRequest(invoiceNoPrefix, actualAmount),
                authHeaders(accessToken, "invoice-helper-issue-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
    }

    private Map<String, Object> issueRequest(String invoiceNoPrefix, int actualAmount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("invoice_code", "CODE-" + invoiceNoPrefix);
        request.put("invoice_no", "NO-" + invoiceNoPrefix);
        request.put("invoice_date", "2026-06-30T10:00:00+08:00");
        request.put("tax_rate", 0.13);
        request.put("actual_invoice_amount", actualAmount);
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
                authHeaders(accessToken, "invoice-helper-contract-trace-001"));
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
        request.put("contract_name", "开票来源合同-" + suffix);
        request.put("contract_no", "INV-CONTRACT-" + suffix);
        request.put("contract_type", "project");
        request.put("contract_status", "performing");
        request.put("contract_amount", contractAmount);
        request.put("tax_rate", 0.13);
        request.put("owner_user_id", ownerUserId);
        request.put("business_owner_id", ownerUserId);
        request.put("payment_terms", "30%预付款，40%上线，30%终验");
        request.put("invoice_terms", "按项目节点开票");
        request.put("delivery_scope", "CRM V2 开票管理链路");
        request.put("acceptance_criteria", "UAT 通过");
        request.put("risk_level", "low");
        request.put("remark", "开票测试合同");
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
                new HttpEntity<>(request, authHeaders(accessToken, "invoice-helper-account-trace-001")),
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
                new HttpEntity<>(request, authHeaders(accessToken, "invoice-helper-opportunity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "开票测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "invoice_role_" + username,
                "开票测试角色",
                "开票测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "开票测试用户",
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

    private List<String> allInvoicePermissions() {
        return List.of(
                "account.create",
                "opportunity.create",
                "opportunity.read",
                "contract.create",
                "contract.read",
                "invoice.create",
                "invoice.read",
                "invoice.update",
                "invoice.apply",
                "invoice.issue",
                "invoice.sign",
                "invoice.exception",
                "invoice.void");
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
                        "password", "S3cure!123"), traceHeaders("invoice-login-trace-001")),
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
