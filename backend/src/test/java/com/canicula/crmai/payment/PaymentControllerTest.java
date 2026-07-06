package com.canicula.crmai.payment;

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
class PaymentControllerTest {

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
    void registersConfirmsExceptionsAndRefundsPayment() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("payment-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "payment_user_" + suffix,
                departmentId,
                allPaymentPermissions(),
                List.of("global"));
        String token = login("payment_user_" + suffix);
        Long accountId = createAccount(token, "到账客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "到账商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 1200000);
        Long planId = createReceivablePlan(token, contractId, userId, suffix, 360000);

        HttpJsonResponse createResponse = postJson(
                "/api/payments",
                paymentRequest(contractId, planId, userId, suffix, 360000),
                authHeaders(token, "payment-create-trace-001"));
        assertThat(createResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode created = createResponse.body().path("data");
        Long paymentId = created.path("id").asLong();
        assertThat(created.path("account_id").asLong()).isEqualTo(accountId);
        assertThat(created.path("opportunity_id").asLong()).isEqualTo(opportunityId);
        assertThat(created.path("payment_status").asText()).isEqualTo("registered");
        assertThat(created.path("confirmed_amount").asDouble()).isEqualTo(0.0);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/payments?contract_id=" + contractId + "&payment_status=registered",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "payment-list-trace-001")),
                JsonNode.class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(payment ->
                assertThat(payment.path("id").asLong()).isEqualTo(paymentId));

        ResponseEntity<JsonNode> planPaymentsResponse = restTemplate.exchange(
                "/api/receivable-plans/" + planId + "/payments",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "payment-plan-payments-trace-001")),
                JsonNode.class);
        assertThat(planPaymentsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(planPaymentsResponse.getBody().path("data")).anySatisfy(payment ->
                assertThat(payment.path("id").asLong()).isEqualTo(paymentId));

        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/payments/" + paymentId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "payment-detail-trace-001")),
                JsonNode.class);
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(detailResponse.getBody().path("data").path("id").asLong()).isEqualTo(paymentId);

        HttpJsonResponse updateResponse = patchJson(
                "/api/payments/" + paymentId,
                Map.of(
                        "received_amount", 370000,
                        "payer_name", "测试客户付款主体更新",
                        "remark", "银行流水补充说明"),
                authHeaders(token, "payment-update-trace-001"));
        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(updateResponse.body().path("data").path("received_amount").asDouble()).isEqualTo(370000.0);

        HttpJsonResponse confirmResponse = postJson(
                "/api/payments/" + paymentId + "/confirm",
                Map.of(
                        "confirmed_amount", 360000,
                        "confirmed_at", "2026-07-22T11:00:00+08:00",
                        "confirm_note", "银行回单一致"),
                authHeaders(token, "payment-confirm-trace-001"));
        assertThat(confirmResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(confirmResponse.body().path("data").path("payment_status").asText()).isEqualTo("confirmed");
        assertThat(confirmResponse.body().path("data").path("unreconciled_amount").asDouble()).isEqualTo(360000.0);

        ResponseEntity<JsonNode> planResponse = restTemplate.exchange(
                "/api/receivable-plans/" + planId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "payment-plan-detail-trace-001")),
                JsonNode.class);
        assertThat(planResponse.getBody().path("data").path("confirmed_received_amount").asDouble()).isEqualTo(360000.0);
        assertThat(planResponse.getBody().path("data").path("unreceived_amount").asDouble()).isEqualTo(0.0);

        HttpJsonResponse exceptionResponse = postJson(
                "/api/payments/" + paymentId + "/exception",
                Map.of(
                        "exception_type", "amount_pending_review",
                        "exception_reason", "财务需复核到账主体",
                        "exception_resolution", "已转财务确认"),
                authHeaders(token, "payment-exception-trace-001"));
        assertThat(exceptionResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(exceptionResponse.body().path("data").path("payment_status").asText()).isEqualTo("exception");

        HttpJsonResponse refundResponse = postJson(
                "/api/payments/" + paymentId + "/refund",
                Map.of("refund_reason", "客户付款主体错误退回"),
                authHeaders(token, "payment-refund-trace-001"));
        assertThat(refundResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(refundResponse.body().path("data").path("payment_status").asText()).isEqualTo("refunded");
        assertThat(refundResponse.body().path("data").path("confirmed_amount").asDouble()).isEqualTo(0.0);

        assertAuditCount("payment.create", paymentId, 1);
        assertAuditCount("payment.update", paymentId, 1);
        assertAuditCount("payment.confirm", paymentId, 1);
        assertAuditCount("payment.exception", paymentId, 1);
        assertAuditCount("payment.refund", paymentId, 1);
    }

    @Test
    void refundedPaymentDoesNotCountAsEffectiveReceivedAmount() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("payment-refund-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "payment_refund_user_" + suffix,
                departmentId,
                allPaymentPermissions(),
                List.of("global"));
        String token = login("payment_refund_user_" + suffix);
        Long accountId = createAccount(token, "退款客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "退款商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 1200000);
        Long planId = createReceivablePlan(token, contractId, userId, suffix, 360000);
        Long paymentId = createPayment(token, contractId, planId, userId, suffix, 360000);

        postJson(
                "/api/payments/" + paymentId + "/confirm",
                Map.of("confirmed_amount", 360000, "confirmed_at", "2026-07-22T11:00:00+08:00"),
                authHeaders(token, "payment-refund-confirm-trace-001"));
        assertPlanAmounts(token, planId, 360000.0, 0.0);

        HttpJsonResponse refundResponse = postJson(
                "/api/payments/" + paymentId + "/refund",
                Map.of("refund_reason", "客户要求重新付款"),
                authHeaders(token, "payment-refund-action-trace-001"));
        assertThat(refundResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertPlanAmounts(token, planId, 0.0, 360000.0);
    }

    @Test
    void unreadablePaymentIsHiddenFromListAndForbiddenInDetail() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("payment-permission-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "payment_permission_creator_" + suffix,
                departmentId,
                allPaymentPermissions(),
                List.of("global"));
        createLoginReadyUser(
                "payment_permission_viewer_" + suffix,
                departmentId,
                List.of("payment.read", "contract.read"),
                List.of("own"));
        String creatorToken = login("payment_permission_creator_" + suffix);
        String viewerToken = login("payment_permission_viewer_" + suffix);
        Long accountId = createAccount(creatorToken, "不可见到账客户-" + suffix, departmentId, creatorUserId);
        Long opportunityId = createOpportunity(creatorToken, accountId, "不可见到账商机-" + suffix, departmentId, creatorUserId);
        Long contractId = createContract(creatorToken, accountId, opportunityId, creatorUserId, suffix, 1200000);
        Long planId = createReceivablePlan(creatorToken, contractId, creatorUserId, suffix, 360000);
        Long paymentId = createPayment(creatorToken, contractId, planId, creatorUserId, suffix, 360000);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/payments",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "payment-permission-list-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/payments/" + paymentId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "payment-permission-detail-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).noneSatisfy(payment ->
                assertThat(payment.path("id").asLong()).isEqualTo(paymentId));
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void confirmRejectsAmountGreaterThanReceivedAmount() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("payment-amount-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "payment_amount_user_" + suffix,
                departmentId,
                allPaymentPermissions(),
                List.of("global"));
        String token = login("payment_amount_user_" + suffix);
        Long accountId = createAccount(token, "超额到账客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "超额到账商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 1200000);
        Long planId = createReceivablePlan(token, contractId, userId, suffix, 360000);
        Long paymentId = createPayment(token, contractId, planId, userId, suffix, 360000);

        HttpJsonResponse confirmResponse = postJson(
                "/api/payments/" + paymentId + "/confirm",
                Map.of("confirmed_amount", 400000),
                authHeaders(token, "payment-amount-confirm-trace-001"));

        assertThat(confirmResponse.status()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(confirmResponse.body().path("message").asText()).contains("确认到账金额不能超过到账金额");
    }

    private Long createPayment(
            String accessToken,
            Long contractId,
            Long planId,
            Long ownerUserId,
            String suffix,
            int receivedAmount) {
        HttpJsonResponse response = postJson(
                "/api/payments",
                paymentRequest(contractId, planId, ownerUserId, suffix, receivedAmount),
                authHeaders(accessToken, "payment-helper-create-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> paymentRequest(
            Long contractId,
            Long planId,
            Long ownerUserId,
            String suffix,
            int receivedAmount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("contract_id", contractId);
        request.put("receivable_plan_id", planId);
        request.put("payment_name", "首付款到账-" + suffix);
        request.put("received_at", "2026-07-22T10:00:00+08:00");
        request.put("received_amount", receivedAmount);
        request.put("payment_method", "bank_transfer");
        request.put("payer_name", "测试客户付款主体");
        request.put("bank_flow_no", "FLOW-" + suffix);
        request.put("owner_user_id", ownerUserId);
        return request;
    }

    private void assertPlanAmounts(String accessToken, Long planId, double confirmedAmount, double unreceivedAmount) {
        ResponseEntity<JsonNode> planResponse = restTemplate.exchange(
                "/api/receivable-plans/" + planId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "payment-plan-amount-trace-001")),
                JsonNode.class);
        assertThat(planResponse.getBody().path("data").path("confirmed_received_amount").asDouble())
                .isEqualTo(confirmedAmount);
        assertThat(planResponse.getBody().path("data").path("unreceived_amount").asDouble())
                .isEqualTo(unreceivedAmount);
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
                authHeaders(accessToken, "payment-helper-receivable-trace-001"));
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
                authHeaders(accessToken, "payment-helper-contract-trace-001"));
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
        request.put("contract_name", "到账来源合同-" + suffix);
        request.put("contract_no", "PAY-CONTRACT-" + suffix);
        request.put("contract_type", "project");
        request.put("contract_status", "performing");
        request.put("contract_amount", contractAmount);
        request.put("tax_rate", 0.13);
        request.put("owner_user_id", ownerUserId);
        request.put("business_owner_id", ownerUserId);
        request.put("payment_terms", "30%预付款，40%上线，30%终验");
        request.put("invoice_terms", "按项目节点开票");
        request.put("delivery_scope", "CRM V2 到账管理链路");
        request.put("acceptance_criteria", "UAT 通过");
        request.put("risk_level", "low");
        request.put("remark", "到账测试合同");
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
                new HttpEntity<>(request, authHeaders(accessToken, "payment-helper-account-trace-001")),
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
                new HttpEntity<>(request, authHeaders(accessToken, "payment-helper-opportunity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "到账测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "payment_role_" + username,
                "到账测试角色",
                "到账测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "到账测试用户",
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

    private List<String> allPaymentPermissions() {
        return List.of(
                "account.create",
                "opportunity.create",
                "opportunity.read",
                "contract.create",
                "contract.read",
                "receivable.create",
                "receivable.read",
                "payment.create",
                "payment.read",
                "payment.update",
                "payment.confirm",
                "payment.exception",
                "payment.refund");
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
                        "password", "S3cure!123"), traceHeaders("payment-login-trace-001")),
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
