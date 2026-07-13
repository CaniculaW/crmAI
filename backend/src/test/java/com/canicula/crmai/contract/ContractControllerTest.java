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
import java.nio.file.Files;
import java.nio.file.Path;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

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

    @Autowired
    private PlatformTransactionManager transactionManager;

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
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void submitsApprovesAndRejectsContractsAndLocksApprovalCriticalFields() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "contract_approval_" + suffix;
        Long departmentId = createDepartment("contract-approval-dept-" + suffix);
        Long userId = createLoginReadyUser(
                username,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "contract.update",
                        "approval.submit",
                        "approval.approve"),
                List.of("global"));
        createDefaultWorkflow(username, userId);
        String token = login(username);
        Long accountId = createAccount(token, "审批合同客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "审批合同商机-" + suffix, departmentId, userId);

        Long approvedContractId = createContract(token, accountId, opportunityId, userId, suffix + "-approve");
        long approvedInstanceId = submitContract(token, approvedContractId);
        assertAuditCount("contract.submit-approval", approvedContractId, 1);
        assertAuditCount("approval.submit", approvedInstanceId, 1);
        assertAuditCount("approval.business-status.update", approvedContractId, 1);
        assertBusinessStatusAudit(approvedContractId, "drafting", "approving");

        HttpJsonResponse criticalUpdate = patchJson(
                "/api/contracts/" + approvedContractId,
                Map.of(
                        "contract_status", "pending_signature",
                        "contract_amount", 1300000,
                        "tax_rate", 0.09,
                        "payment_terms", "全额预付",
                        "invoice_terms", "预付款到账后开票",
                        "delivery_scope", "变更交付范围",
                        "acceptance_criteria", "变更验收标准",
                        "risk_level", "high",
                        "change_reason", "审批中不应允许变更"),
                authHeaders(token, "contract-approval-critical-update"));
        assertThat(criticalUpdate.status()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(criticalUpdate.body().path("message").asText()).contains("审批中");

        HttpJsonResponse remarkUpdate = patchJson(
                "/api/contracts/" + approvedContractId,
                Map.of("remark", "审批中补充合同说明"),
                authHeaders(token, "contract-approval-remark-update"));
        assertThat(remarkUpdate.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(remarkUpdate.body().path("data").path("contract_status").asText()).isEqualTo("approving");
        assertThat(remarkUpdate.body().path("data").path("remark").asText()).isEqualTo("审批中补充合同说明");

        HttpJsonResponse approveResponse = postJson(
                "/api/approvals/instances/" + approvedInstanceId + "/approve",
                Map.of("comment", "合同条款通过"),
                authHeaders(token, "contract-approval-approve"));
        assertThat(approveResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(jdbcTemplate.queryForObject(
                "select contract_status from crm_contracts where id = ?",
                String.class,
                approvedContractId)).isEqualTo("pending_signature");

        Long rejectedContractId = createContract(token, accountId, opportunityId, userId, suffix + "-reject");
        long rejectedInstanceId = submitContract(token, rejectedContractId);
        HttpJsonResponse rejectResponse = postJson(
                "/api/approvals/instances/" + rejectedInstanceId + "/reject",
                Map.of("comment", "付款条件需调整"),
                authHeaders(token, "contract-approval-reject"));
        assertThat(rejectResponse.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(jdbcTemplate.queryForObject(
                "select contract_status from crm_contracts where id = ?",
                String.class,
                rejectedContractId)).isEqualTo("drafting");
    }

    @Test
    void requiresBothContractUpdateAndApprovalSubmitAndPreservesDataScope() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("contract-approval-permission-" + suffix);
        String ownerUsername = "contract_approval_owner_" + suffix;
        Long ownerId = createLoginReadyUser(
                ownerUsername,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "contract.update",
                        "approval.submit"),
                List.of("global"));
        createDefaultWorkflow(ownerUsername, ownerId);
        String ownerToken = login(ownerUsername);
        Long accountId = createAccount(ownerToken, "合同审批权限客户-" + suffix, departmentId, ownerId);
        Long opportunityId = createOpportunity(ownerToken, accountId, "合同审批权限商机-" + suffix, departmentId, ownerId);
        Long contractId = createContract(ownerToken, accountId, opportunityId, ownerId, suffix);

        createLoginReadyUser(
                "contract_no_approval_" + suffix,
                departmentId,
                List.of("contract.update"),
                List.of("global"));
        createLoginReadyUser(
                "contract_no_update_" + suffix,
                departmentId,
                List.of("approval.submit"),
                List.of("global"));
        createLoginReadyUser(
                "contract_no_read_" + suffix,
                departmentId,
                List.of("contract.update", "approval.submit"),
                List.of("global"));
        createLoginReadyUser(
                "contract_out_scope_" + suffix,
                departmentId,
                List.of("contract.update", "approval.submit"),
                List.of("own"));

        assertForbiddenSubmission(login("contract_no_approval_" + suffix), contractId);
        assertForbiddenSubmission(login("contract_no_update_" + suffix), contractId);
        assertForbiddenSubmission(login("contract_no_read_" + suffix), contractId);
        assertForbiddenSubmission(login("contract_out_scope_" + suffix), contractId);
        assertThat(jdbcTemplate.queryForObject(
                "select contract_status from crm_contracts where id = ?",
                String.class,
                contractId)).isEqualTo("drafting");
    }

    @Test
    void guardsApprovalSensitiveWritesWithAtomicStatusConditions() throws Exception {
        String serviceSource = Files.readString(Path.of(
                "src/main/java/com/canicula/crmai/contract/ContractService.java"));
        String controllerSource = Files.readString(Path.of(
                "src/main/java/com/canicula/crmai/contract/ContractController.java"));

        assertThat(serviceSource).contains("and contract_status <> 'approving'");
        assertThat(serviceSource).contains("if (updatedCount != 1)");
        assertThat(controllerSource).contains("@Transactional\n    ContractResponse submitApproval");
    }

    @Test
    void submitApprovalUsesContractSnapshotAfterConcurrentUpdateCommits() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "contract_snapshot_" + suffix;
        Long departmentId = createDepartment("contract-snapshot-" + suffix);
        Long userId = createLoginReadyUser(
                username,
                departmentId,
                List.of(
                        "account.create",
                        "opportunity.create",
                        "opportunity.read",
                        "contract.create",
                        "contract.read",
                        "contract.update",
                        "approval.submit"),
                List.of("global"));
        createDefaultWorkflow(username, userId);
        String token = login(username);
        Long accountId = createAccount(token, "并发合同客户-" + suffix, departmentId, userId);
        Long opportunityId = createOpportunity(token, accountId, "并发合同商机-" + suffix, departmentId, userId);
        Long contractId = createContract(token, accountId, opportunityId, userId, suffix);
        String committedName = "并发合同新名称-" + suffix;

        CountDownLatch updateLocked = new CountDownLatch(1);
        CountDownLatch releaseUpdate = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        try {
            Future<?> updateFuture = executor.submit(() -> transactionTemplate.executeWithoutResult(status -> {
                jdbcTemplate.update(
                        "update crm_contracts set contract_name = ?, version = version + 1 where id = ?",
                        committedName,
                        contractId);
                updateLocked.countDown();
                awaitLatch(releaseUpdate);
            }));
            assertThat(updateLocked.await(5, TimeUnit.SECONDS)).isTrue();

            Future<HttpJsonResponse> submitFuture = executor.submit(() -> postJson(
                    "/api/contracts/" + contractId + "/submit-approval",
                    Map.of(),
                    authHeaders(token, "contract-concurrent-snapshot")));
            Thread.sleep(300);
            assertThat(submitFuture.isDone()).isFalse();

            releaseUpdate.countDown();
            updateFuture.get(5, TimeUnit.SECONDS);
            HttpJsonResponse response = submitFuture.get(5, TimeUnit.SECONDS);

            assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
            assertThat(jdbcTemplate.queryForObject(
                    "select object_name from approval_instances where object_type = 'contract' and object_id = ?",
                    String.class,
                    contractId)).isEqualTo(committedName);
        } finally {
            releaseUpdate.countDown();
            executor.shutdownNow();
            executor.awaitTermination(5, TimeUnit.SECONDS);
        }
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

    private long submitContract(String accessToken, Long contractId) {
        HttpJsonResponse response = postJson(
                "/api/contracts/" + contractId + "/submit-approval",
                Map.of(),
                authHeaders(accessToken, "contract-submit-approval-" + contractId));
        assertThat(response.status()).isEqualTo(HttpStatus.OK.value());
        assertThat(response.body().path("data").path("contract_status").asText()).isEqualTo("approving");
        return jdbcTemplate.queryForObject(
                "select id from approval_instances where object_type = 'contract' and object_id = ? order by id desc limit 1",
                Long.class,
                contractId);
    }

    private void assertForbiddenSubmission(String accessToken, Long contractId) {
        HttpJsonResponse response = postJson(
                "/api/contracts/" + contractId + "/submit-approval",
                Map.of(),
                authHeaders(accessToken, "contract-forbidden-submit-" + UUID.randomUUID()));
        assertThat(response.status()).isEqualTo(HttpStatus.FORBIDDEN.value());
    }

    private void createDefaultWorkflow(String approverUsername, Long createdBy) {
        Long roleId = jdbcTemplate.queryForObject(
                "select id from sys_roles where code = ?",
                Long.class,
                "contract_role_" + approverUsername);
        jdbcTemplate.update(
                "update approval_templates set is_default = false where tenant_id = 1 and object_type = 'contract'");
        String templateName = "合同快捷审批-" + UUID.randomUUID();
        jdbcTemplate.update(
                """
                insert into approval_templates (
                    tenant_id, object_type, template_name, status, is_default, created_by
                ) values (1, 'contract', ?, 'active', true, ?)
                """,
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
                ) values (?, 1, '合同负责人审批', ?, 'active')
                """,
                templateId,
                roleId);
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

    private void assertBusinessStatusAudit(Long objectId, String beforeStatus, String afterStatus) {
        Map<String, Object> audit = jdbcTemplate.queryForMap(
                """
                select cast(before_data as varchar) as before_data,
                       cast(after_data as varchar) as after_data
                from sys_audit_logs
                where action_code = 'approval.business-status.update'
                  and object_id = ?
                order by id desc
                limit 1
                """,
                objectId);
        assertThat(String.valueOf(audit.get("before_data"))).contains(beforeStatus);
        assertThat(String.valueOf(audit.get("after_data"))).contains(afterStatus);
    }

    private static void awaitLatch(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for concurrent test transaction");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private record HttpJsonResponse(int status, JsonNode body) {
    }
}
