package com.canicula.crmai.reconciliation;

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
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
class ReconciliationControllerTest {

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
    void createsListsDetailsAndVoidsReconciliationWithAmountUpdates() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("recon-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "recon_user_" + suffix,
                departmentId,
                allReconciliationPermissions(),
                List.of("global"));
        String token = login("recon_user_" + suffix);
        Long accountId = createAccount(token, "核销客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "核销商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 500000);
        Long invoiceId = createIssuedInvoice(token, contractId, userId, suffix, 200000);
        Long planId = createReceivablePlan(token, contractId, userId, suffix, 200000);
        Long paymentId = createConfirmedPayment(token, contractId, planId, userId, suffix, 120000);

        HttpJsonResponse createResponse = postJson(
                "/api/reconciliations",
                Map.of(
                        "invoice_id", invoiceId,
                        "payment_id", paymentId,
                        "reconciled_amount", 100000,
                        "reconciled_at", "2026-07-25T10:00:00+08:00",
                        "reconcile_note", "首付款部分核销"),
                authHeaders(token, "recon-create-trace-001"));

        assertThat(createResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode created = createResponse.body().path("data");
        Long reconciliationId = created.path("id").asLong();
        assertThat(created.path("reconciliation_status").asText()).isEqualTo("active");
        assertThat(created.path("reconciled_amount").asDouble()).isEqualTo(100000.0);
        assertThat(created.path("invoice_unreconciled_amount").asDouble()).isEqualTo(100000.0);
        assertThat(created.path("payment_unreconciled_amount").asDouble()).isEqualTo(20000.0);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/reconciliations?contract_id=" + contractId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "recon-list-trace-001")),
                JsonNode.class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(reconciliation ->
                assertThat(reconciliation.path("id").asLong()).isEqualTo(reconciliationId));

        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/reconciliations/" + reconciliationId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "recon-detail-trace-001")),
                JsonNode.class);
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(detailResponse.getBody().path("data").path("id").asLong()).isEqualTo(reconciliationId);

        assertInvoiceAmounts(token, invoiceId, 100000.0, 100000.0);
        assertPaymentAmounts(token, paymentId, "partially_reconciled", 100000.0, 20000.0);

        HttpJsonResponse voidResponse = postJson(
                "/api/reconciliations/" + reconciliationId + "/void",
                Map.of("void_reason", "客户要求调整核销分配"),
                authHeaders(token, "recon-void-trace-001"));

        assertThat(voidResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(voidResponse.body().path("data").path("reconciliation_status").asText()).isEqualTo("voided");
        assertThat(voidResponse.body().path("data").path("invoice_unreconciled_amount").asDouble()).isEqualTo(200000.0);
        assertThat(voidResponse.body().path("data").path("payment_unreconciled_amount").asDouble()).isEqualTo(120000.0);
        assertInvoiceAmounts(token, invoiceId, 0.0, 200000.0);
        assertPaymentAmounts(token, paymentId, "confirmed", 0.0, 120000.0);
        assertAuditCount("reconciliation.create", reconciliationId, 1);
        assertAuditCount("reconciliation.void", reconciliationId, 1);
    }

    @Test
    void workbenchReturnsPendingInvoicesPaymentsAndSummary() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("recon-workbench-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "recon_workbench_" + suffix,
                departmentId,
                allReconciliationPermissions(),
                List.of("global"));
        String token = login("recon_workbench_" + suffix);
        Long accountId = createAccount(token, "核销工作台客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "核销工作台商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 500000);
        Long invoiceId = createIssuedInvoice(token, contractId, userId, suffix, 200000);
        Long planId = createReceivablePlan(token, contractId, userId, suffix, 200000);
        Long paymentId = createConfirmedPayment(token, contractId, planId, userId, suffix, 120000);

        ResponseEntity<JsonNode> workbenchResponse = restTemplate.exchange(
                "/api/reconciliations/workbench?contract_id=" + contractId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "recon-workbench-trace-001")),
                JsonNode.class);

        assertThat(workbenchResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = workbenchResponse.getBody().path("data");
        assertThat(data.path("summary").path("effective_invoice_amount").asDouble()).isEqualTo(200000.0);
        assertThat(data.path("summary").path("confirmed_payment_amount").asDouble()).isEqualTo(120000.0);
        assertThat(data.path("summary").path("reconciled_amount").asDouble()).isEqualTo(0.0);
        assertThat(data.path("summary").path("unreconciled_invoice_amount").asDouble()).isEqualTo(200000.0);
        assertThat(data.path("summary").path("unallocated_payment_amount").asDouble()).isEqualTo(120000.0);
        assertThat(data.path("pending_invoices")).anySatisfy(invoice ->
                assertThat(invoice.path("id").asLong()).isEqualTo(invoiceId));
        assertThat(data.path("pending_payments")).anySatisfy(payment ->
                assertThat(payment.path("id").asLong()).isEqualTo(paymentId));
    }

    @Test
    void rejectsAmountGreaterThanInvoiceOrPaymentUnreconciledAmount() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("recon-amount-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "recon_amount_" + suffix,
                departmentId,
                allReconciliationPermissions(),
                List.of("global"));
        String token = login("recon_amount_" + suffix);
        Long accountId = createAccount(token, "核销金额客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "核销金额商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 500000);
        Long invoiceId = createIssuedInvoice(token, contractId, userId, suffix, 100000);
        Long planId = createReceivablePlan(token, contractId, userId, suffix, 100000);
        Long paymentId = createConfirmedPayment(token, contractId, planId, userId, suffix, 80000);

        HttpJsonResponse response = postJson(
                "/api/reconciliations",
                Map.of(
                        "invoice_id", invoiceId,
                        "payment_id", paymentId,
                        "reconciled_amount", 90000,
                        "reconciled_at", "2026-07-25T10:00:00+08:00"),
                authHeaders(token, "recon-over-amount-trace-001"));

        assertThat(response.status()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(response.body().path("message").asText()).contains("剩余");
    }

    @Test
    void rejectsDifferentContractInvoiceAndPayment() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("recon-contract-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "recon_contract_" + suffix,
                departmentId,
                allReconciliationPermissions(),
                List.of("global"));
        String token = login("recon_contract_" + suffix);
        Long firstAccountId = createAccount(token, "核销合同客户A-" + suffix, departmentId, userId);
        Long firstOpportunityId = createOpportunity(token, firstAccountId, "核销合同商机A-" + suffix, departmentId, userId);
        Long firstContractId = createContract(token, firstAccountId, firstOpportunityId, userId, suffix + "-a", 500000);
        Long secondAccountId = createAccount(token, "核销合同客户B-" + suffix, departmentId, userId);
        Long secondOpportunityId = createOpportunity(token, secondAccountId, "核销合同商机B-" + suffix, departmentId, userId);
        Long secondContractId = createContract(token, secondAccountId, secondOpportunityId, userId, suffix + "-b", 500000);
        Long invoiceId = createIssuedInvoice(token, firstContractId, userId, suffix, 100000);
        Long planId = createReceivablePlan(token, secondContractId, userId, suffix, 100000);
        Long paymentId = createConfirmedPayment(token, secondContractId, planId, userId, suffix, 80000);

        HttpJsonResponse response = postJson(
                "/api/reconciliations",
                Map.of(
                        "invoice_id", invoiceId,
                        "payment_id", paymentId,
                        "reconciled_amount", 50000,
                        "reconciled_at", "2026-07-25T10:00:00+08:00"),
                authHeaders(token, "recon-different-contract-trace-001"));

        assertThat(response.status()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(response.body().path("message").asText()).contains("同一合同");
    }

    @Test
    void preventsConcurrentReconciliationOverAllocation() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("recon-concurrent-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "recon_concurrent_" + suffix,
                departmentId,
                allReconciliationPermissions(),
                List.of("global"));
        String token = login("recon_concurrent_" + suffix);
        Long accountId = createAccount(token, "核销并发客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "核销并发商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix, 300000);
        Long invoiceId = createIssuedInvoice(token, contractId, userId, suffix, 100000);
        Long planId = createReceivablePlan(token, contractId, userId, suffix, 100000);
        Long paymentId = createConfirmedPayment(token, contractId, planId, userId, suffix, 100000);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Callable<HttpJsonResponse> task = () -> {
            ready.countDown();
            assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
            return postJson(
                    "/api/reconciliations",
                    Map.of(
                            "invoice_id", invoiceId,
                            "payment_id", paymentId,
                            "reconciled_amount", 80000,
                            "reconciled_at", "2026-07-25T10:00:00+08:00",
                            "reconcile_note", "并发核销防超额"),
                    authHeaders(token, "recon-concurrent-create-trace-001"));
        };

        try {
            Future<HttpJsonResponse> first = executor.submit(task);
            Future<HttpJsonResponse> second = executor.submit(task);
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            List<Integer> statuses = List.of(first.get().status(), second.get().status());

            assertThat(statuses).contains(HttpStatus.OK.value(), HttpStatus.CONFLICT.value());
            assertInvoiceAmounts(token, invoiceId, 80000.0, 20000.0);
            assertPaymentAmounts(token, paymentId, "partially_reconciled", 80000.0, 20000.0);
        } finally {
            executor.shutdownNow();
        }
    }

    private Long createIssuedInvoice(String accessToken, Long contractId, Long ownerUserId, String suffix, int amount) {
        Long invoiceId = createInvoicePlan(accessToken, contractId, ownerUserId, suffix, amount);
        postJson(
                "/api/invoices/" + invoiceId + "/apply",
                Map.of("applied_amount", amount, "application_note", "核销测试申请开票"),
                authHeaders(accessToken, "recon-helper-apply-trace-001"));
        HttpJsonResponse issueResponse = postJson(
                "/api/invoices/" + invoiceId + "/issue",
                Map.of(
                        "invoice_code", "RECON-CODE-" + suffix,
                        "invoice_no", "RECON-NO-" + suffix,
                        "invoice_date", "2026-07-21T10:00:00+08:00",
                        "tax_rate", 0.13,
                        "actual_invoice_amount", amount),
                authHeaders(accessToken, "recon-helper-issue-trace-001"));
        assertThat(issueResponse.status()).isEqualTo(HttpStatus.OK.value());
        return invoiceId;
    }

    private Long createConfirmedPayment(String accessToken, Long contractId, Long planId, Long ownerUserId, String suffix, int amount) {
        Long paymentId = createPayment(accessToken, contractId, planId, ownerUserId, suffix, amount);
        HttpJsonResponse confirmResponse = postJson(
                "/api/payments/" + paymentId + "/confirm",
                Map.of("confirmed_amount", amount, "confirmed_at", "2026-07-22T10:00:00+08:00"),
                authHeaders(accessToken, "recon-helper-confirm-trace-001"));
        assertThat(confirmResponse.status()).isEqualTo(HttpStatus.OK.value());
        return paymentId;
    }

    private Long createInvoicePlan(String accessToken, Long contractId, Long ownerUserId, String suffix, int plannedAmount) {
        HttpJsonResponse response = postJson(
                "/api/invoices",
                invoicePlanRequest(contractId, ownerUserId, suffix, plannedAmount),
                authHeaders(accessToken, "recon-helper-invoice-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> invoicePlanRequest(Long contractId, Long ownerUserId, String suffix, int plannedAmount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("contract_id", contractId);
        request.put("plan_name", "核销开票-" + suffix);
        request.put("planned_invoice_date", "2026-07-15T10:00:00+08:00");
        request.put("planned_amount", plannedAmount);
        request.put("invoice_type", "vat_special");
        request.put("tax_rate", 0.13);
        request.put("owner_user_id", ownerUserId);
        return request;
    }

    private Long createPayment(String accessToken, Long contractId, Long planId, Long ownerUserId, String suffix, int amount) {
        HttpJsonResponse response = postJson(
                "/api/payments",
                paymentRequest(contractId, planId, ownerUserId, suffix, amount),
                authHeaders(accessToken, "recon-helper-payment-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> paymentRequest(Long contractId, Long planId, Long ownerUserId, String suffix, int amount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("contract_id", contractId);
        request.put("receivable_plan_id", planId);
        request.put("payment_name", "核销到账-" + suffix);
        request.put("received_at", "2026-07-22T10:00:00+08:00");
        request.put("received_amount", amount);
        request.put("payment_method", "bank_transfer");
        request.put("payer_name", "核销测试付款主体");
        request.put("bank_flow_no", "RECON-FLOW-" + suffix);
        request.put("owner_user_id", ownerUserId);
        return request;
    }

    private Long createReceivablePlan(String accessToken, Long contractId, Long ownerUserId, String suffix, int amount) {
        HttpJsonResponse response = postJson(
                "/api/receivable-plans",
                receivablePlanRequest(contractId, ownerUserId, suffix, amount),
                authHeaders(accessToken, "recon-helper-receivable-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> receivablePlanRequest(Long contractId, Long ownerUserId, String suffix, int amount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("contract_id", contractId);
        request.put("plan_name", "核销回款-" + suffix);
        request.put("plan_stage", "首付款");
        request.put("planned_receivable_date", "2026-07-20T10:00:00+08:00");
        request.put("planned_amount", amount);
        request.put("owner_user_id", ownerUserId);
        return request;
    }

    private void assertInvoiceAmounts(String accessToken, Long invoiceId, double reconciledAmount, double unreconciledAmount) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/invoices/" + invoiceId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "recon-invoice-amount-trace-001")),
                JsonNode.class);
        assertThat(response.getBody().path("data").path("reconciled_amount").asDouble()).isEqualTo(reconciledAmount);
        assertThat(response.getBody().path("data").path("unreconciled_amount").asDouble()).isEqualTo(unreconciledAmount);
    }

    private void assertPaymentAmounts(
            String accessToken,
            Long paymentId,
            String expectedStatus,
            double reconciledAmount,
            double unreconciledAmount) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/payments/" + paymentId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "recon-payment-amount-trace-001")),
                JsonNode.class);
        assertThat(response.getBody().path("data").path("payment_status").asText()).isEqualTo(expectedStatus);
        assertThat(response.getBody().path("data").path("reconciled_amount").asDouble()).isEqualTo(reconciledAmount);
        assertThat(response.getBody().path("data").path("unreconciled_amount").asDouble()).isEqualTo(unreconciledAmount);
    }

    private Long createContract(
            String accessToken,
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String suffix,
            int amount) {
        HttpJsonResponse response = postJson(
                "/api/contracts",
                contractRequest(accountId, opportunityId, ownerUserId, suffix, amount),
                authHeaders(accessToken, "recon-helper-contract-trace-001"));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        return response.body().path("data").path("id").asLong();
    }

    private Map<String, Object> contractRequest(
            Long accountId,
            Long opportunityId,
            Long ownerUserId,
            String suffix,
            int amount) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("opportunity_id", opportunityId);
        request.put("contract_name", "核销来源合同-" + suffix);
        request.put("contract_no", "RECON-CONTRACT-" + suffix);
        request.put("contract_type", "project");
        request.put("contract_status", "performing");
        request.put("contract_amount", amount);
        request.put("tax_rate", 0.13);
        request.put("owner_user_id", ownerUserId);
        request.put("business_owner_id", ownerUserId);
        request.put("payment_terms", "30%预付款，40%上线，30%终验");
        request.put("invoice_terms", "按项目节点开票");
        request.put("delivery_scope", "CRM V2 核销链路");
        request.put("acceptance_criteria", "UAT 通过");
        request.put("risk_level", "low");
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
                new HttpEntity<>(request, authHeaders(accessToken, "recon-helper-account-trace-001")),
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
                new HttpEntity<>(request, authHeaders(accessToken, "recon-helper-opportunity-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "核销测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "recon_role_" + username,
                "核销测试角色",
                "核销测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "核销测试用户",
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

    private List<String> allReconciliationPermissions() {
        return List.of(
                "account.create",
                "opportunity.create",
                "opportunity.read",
                "contract.create",
                "contract.read",
                "invoice.create",
                "invoice.read",
                "invoice.apply",
                "invoice.issue",
                "receivable.create",
                "receivable.read",
                "payment.create",
                "payment.read",
                "payment.confirm",
                "reconciliation.read",
                "reconciliation.create",
                "reconciliation.void");
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
                        "password", "S3cure!123"), traceHeaders("recon-login-trace-001")),
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
