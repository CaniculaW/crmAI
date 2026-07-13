package com.canicula.crmai.approval;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import java.sql.PreparedStatement;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.StreamSupport;
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
import org.springframework.jdbc.support.GeneratedKeyHolder;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.web.resources.add-mappings=false")
class ApprovalControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void submitsApprovalCopiesActiveNodesAndRejectsDuplicatePendingInstance() {
        String suffix = suffix();
        TestUser submitter = createAndLoginUser(
                "approval_submit_" + suffix,
                "approval.read",
                "approval.submit");
        TestUser firstApprover = createAndLoginUser(
                "approval_first_" + suffix,
                "approval.read",
                "approval.approve");
        TestUser secondApprover = createAndLoginUser(
                "approval_second_" + suffix,
                "approval.read",
                "approval.approve");
        long firstRoleId = createRole("approval_first_role_" + suffix);
        long secondRoleId = createRole("approval_second_role_" + suffix);
        identityService.assignRole(firstApprover.userId(), firstRoleId);
        identityService.assignRole(secondApprover.userId(), secondRoleId);
        long templateId = createWorkflow(
                "quotation",
                submitter.userId(),
                new NodeSpec(1, "Sales Review", firstRoleId, "active"),
                new NodeSpec(2, "Finance Review", secondRoleId, "active"),
                new NodeSpec(3, "Ignored Review", secondRoleId, "inactive"));
        long quotationId = createSolutionDocument(submitter, "quotation", "draft", true, suffix);

        ResponseEntity<JsonNode> response = submit(
                submitter.token(), "quotation", quotationId, "Quotation " + suffix);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode instance = response.getBody().path("data");
        long instanceId = instance.path("id").asLong();
        assertThat(instance.path("template_id").asLong()).isEqualTo(templateId);
        assertThat(instance.path("status").asText()).isEqualTo("pending");
        assertThat(instance.path("current_step_order").asInt()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForList(
                        "select status from approval_instance_nodes where instance_id = ? order by step_order",
                        String.class,
                        instanceId))
                .containsExactly("pending", "waiting");
        assertThat(jdbcTemplate.queryForObject(
                "select status from crm_solution_documents where id = ?",
                String.class,
                quotationId)).isEqualTo("approving");
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from approval_actions where instance_id = ? and action = 'submit' and node_id is null",
                Integer.class,
                instanceId)).isEqualTo(1);
        assertThat(auditCount("approval.submit", instanceId, submitter.userId())).isEqualTo(1);

        assertConflict(submit(
                submitter.token(), "quotation", quotationId, "Quotation duplicate " + suffix));
    }

    @Test
    void rejectsSubmissionWithoutDefaultTemplateActiveNodesOrEligibleApprovers() {
        String suffix = suffix();
        TestUser submitter = createAndLoginUser(
                "approval_invalid_submit_" + suffix,
                "approval.submit");
        long quotationId = createSolutionDocument(submitter, "quotation", "draft", true, suffix + "-missing");
        disableDefaults("quotation");

        assertConflict(submit(
                submitter.token(), "quotation", quotationId, "Missing template " + suffix));

        long unusedRoleId = createRole("approval_unused_role_" + suffix);
        createWorkflow(
                "bid",
                submitter.userId(),
                new NodeSpec(1, "Inactive Review", unusedRoleId, "inactive"));
        long bidId = createSolutionDocument(submitter, "bid_document", "draft", false, suffix + "-nodes");
        assertConflict(submit(submitter.token(), "bid", bidId, "No active nodes " + suffix));

        long emptyRoleId = createRole("approval_empty_role_" + suffix);
        createWorkflow(
                "contract",
                submitter.userId(),
                new NodeSpec(1, "Unstaffed Review", emptyRoleId, "active"));
        long contractId = createContract(submitter, suffix);
        assertConflict(submit(submitter.token(), "contract", contractId, "No approver " + suffix));
    }

    @Test
    void pendingTasksAreRoleScopedAndFirstApprovalAdvancesTheWorkflow() {
        String suffix = suffix();
        TestUser submitter = createAndLoginUser(
                "approval_task_submit_" + suffix,
                "approval.submit");
        TestUser firstApprover = createAndLoginUser(
                "approval_task_first_" + suffix,
                "approval.read",
                "approval.approve");
        TestUser secondApprover = createAndLoginUser(
                "approval_task_second_" + suffix,
                "approval.read",
                "approval.approve");
        TestUser wrongRole = createAndLoginUser(
                "approval_task_wrong_" + suffix,
                "approval.read",
                "approval.approve");
        long firstRoleId = createRole("approval_task_first_role_" + suffix);
        long secondRoleId = createRole("approval_task_second_role_" + suffix);
        identityService.assignRole(firstApprover.userId(), firstRoleId);
        identityService.assignRole(secondApprover.userId(), secondRoleId);
        createWorkflow(
                "quotation",
                submitter.userId(),
                new NodeSpec(1, "First", firstRoleId, "active"),
                new NodeSpec(2, "Second", secondRoleId, "active"));
        long quotationId = createSolutionDocument(submitter, "quotation", "draft", true, suffix);
        long instanceId = submit(submitter.token(), "quotation", quotationId, "Task " + suffix)
                .getBody().path("data").path("id").asLong();

        assertThat(taskIds(firstApprover.token(), "pending")).contains(instanceId);
        assertThat(taskIds(secondApprover.token(), "pending")).doesNotContain(instanceId);
        assertThat(taskIds(wrongRole.token(), "pending")).doesNotContain(instanceId);
        assertForbidden(decide(wrongRole.token(), instanceId, "approve", Map.of("comment", "wrong role")));
        assertForbidden(decide(wrongRole.token(), instanceId, "reject", Map.of("comment", "wrong role")));
        assertThat(jdbcTemplate.queryForObject(
                "select status from approval_instances where id = ?",
                String.class,
                instanceId)).isEqualTo("pending");
        assertThat(jdbcTemplate.queryForList(
                        "select status from approval_instance_nodes where instance_id = ? order by step_order",
                        String.class,
                        instanceId))
                .containsExactly("pending", "waiting");
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from approval_actions where instance_id = ?",
                Integer.class,
                instanceId)).isEqualTo(1);

        ResponseEntity<JsonNode> approveResponse = decide(
                firstApprover.token(), instanceId, "approve", Map.of("comment", "looks good"));

        assertThat(approveResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode approved = approveResponse.getBody().path("data");
        assertThat(approved.path("status").asText()).isEqualTo("pending");
        assertThat(approved.path("current_step_order").asInt()).isEqualTo(2);
        assertThat(jdbcTemplate.queryForList(
                        "select status from approval_instance_nodes where instance_id = ? order by step_order",
                        String.class,
                        instanceId))
                .containsExactly("approved", "pending");
        assertThat(taskIds(firstApprover.token(), "pending")).doesNotContain(instanceId);
        assertThat(taskIds(secondApprover.token(), "pending")).contains(instanceId);
        assertThat(auditCount("approval.approve", instanceId, firstApprover.userId())).isEqualTo(1);

        ResponseEntity<JsonNode> detailResponse = exchange(
                "/api/approvals/instances/" + instanceId,
                HttpMethod.GET,
                null,
                firstApprover.token(),
                "approval-multi-node-detail");
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode nodes = detailResponse.getBody().path("data").path("nodes");
        assertThat(nodes).hasSize(2);
        assertThat(nodes.get(0).path("step_order").asInt()).isEqualTo(1);
        assertThat(nodes.get(1).path("step_order").asInt()).isEqualTo(2);
    }

    @Test
    void finalApprovalCompletesContractAndProcessedTasksAreDeduplicated() {
        String suffix = suffix();
        TestUser submitter = createAndLoginUser(
                "approval_final_submit_" + suffix,
                "approval.read",
                "approval.submit");
        TestUser approver = createAndLoginUser(
                "approval_final_actor_" + suffix,
                "approval.read",
                "approval.approve");
        long roleId = createRole("approval_final_role_" + suffix);
        identityService.assignRole(approver.userId(), roleId);
        createWorkflow(
                "contract",
                submitter.userId(),
                new NodeSpec(1, "Legal", roleId, "active"),
                new NodeSpec(2, "Executive", roleId, "active"));
        long contractId = createContract(submitter, suffix);
        long instanceId = submit(submitter.token(), "contract", contractId, "Contract " + suffix)
                .getBody().path("data").path("id").asLong();

        assertThat(taskIds(submitter.token(), "started")).contains(instanceId);
        decide(approver.token(), instanceId, "approve", Map.of());
        ResponseEntity<JsonNode> response = decide(
                approver.token(), instanceId, "approve", Map.of("comment", "approved"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode instance = response.getBody().path("data");
        assertThat(instance.path("status").asText()).isEqualTo("approved");
        assertThat(instance.path("current_step_order").isNull()).isTrue();
        assertThat(instance.path("completed_at").asText()).isNotBlank();
        assertThat(jdbcTemplate.queryForObject(
                "select contract_status from crm_contracts where id = ?",
                String.class,
                contractId)).isEqualTo("pending_signature");
        assertThat(taskIds(submitter.token(), "started")).doesNotContain(instanceId);
        assertThat(taskIds(approver.token(), "processed").stream()
                .filter(id -> id == instanceId)
                .count()).isEqualTo(1);
        assertThat(auditCount("approval.approve", instanceId, approver.userId())).isEqualTo(2);
    }

    @Test
    void rejectionRequiresCommentRestoresDraftAndExposesDetailAndObjectHistory() {
        String suffix = suffix();
        TestUser submitter = createAndLoginUser(
                "approval_reject_submit_" + suffix,
                "approval.read",
                "approval.submit");
        TestUser otherSubmitter = createAndLoginUser(
                "approval_reject_other_" + suffix,
                "approval.read");
        TestUser approver = createAndLoginUser(
                "approval_reject_actor_" + suffix,
                "approval.read",
                "approval.approve");
        long roleId = createRole("approval_reject_role_" + suffix);
        identityService.assignRole(approver.userId(), roleId);
        createWorkflow(
                "quotation",
                submitter.userId(),
                new NodeSpec(1, "Risk", roleId, "active"));
        long quotationId = createSolutionDocument(submitter, "quotation", "draft", true, suffix);
        long instanceId = submit(submitter.token(), "quotation", quotationId, "Reject " + suffix)
                .getBody().path("data").path("id").asLong();

        assertThat(taskIds(submitter.token(), "started")).contains(instanceId);
        assertThat(taskIds(otherSubmitter.token(), "started")).doesNotContain(instanceId);
        assertConflict(decide(approver.token(), instanceId, "reject", Map.of("comment", "   ")));

        ResponseEntity<JsonNode> rejectResponse = decide(
                approver.token(), instanceId, "reject", Map.of("comment", "Needs revision"));

        assertThat(rejectResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode rejected = rejectResponse.getBody().path("data");
        assertThat(rejected.path("status").asText()).isEqualTo("rejected");
        assertThat(rejected.path("current_step_order").isNull()).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "select status from approval_instance_nodes where instance_id = ?",
                String.class,
                instanceId)).isEqualTo("rejected");
        assertThat(jdbcTemplate.queryForObject(
                "select status from crm_solution_documents where id = ?",
                String.class,
                quotationId)).isEqualTo("draft");
        assertThat(taskIds(submitter.token(), "started")).doesNotContain(instanceId);
        assertThat(taskIds(approver.token(), "processed")).contains(instanceId);
        assertThat(auditCount("approval.reject", instanceId, approver.userId())).isEqualTo(1);

        ResponseEntity<JsonNode> detailResponse = exchange(
                "/api/approvals/instances/" + instanceId,
                HttpMethod.GET,
                null,
                submitter.token(),
                "approval-detail");
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode detail = detailResponse.getBody().path("data");
        assertThat(detail.path("nodes")).hasSize(1);
        assertThat(detail.path("actions")).hasSize(2);
        assertThat(detail.path("actions").get(0).path("action").asText()).isEqualTo("submit");
        assertThat(detail.path("actions").get(1).path("action").asText()).isEqualTo("reject");

        long latestId = submit(submitter.token(), "quotation", quotationId, "Resubmit " + suffix)
                .getBody().path("data").path("id").asLong();
        decide(approver.token(), latestId, "approve", Map.of());
        assertThat(jdbcTemplate.queryForObject(
                "select status from crm_solution_documents where id = ?",
                String.class,
                quotationId)).isEqualTo("approved");
        ResponseEntity<JsonNode> objectResponse = exchange(
                "/api/approvals/object/quotation/" + quotationId,
                HttpMethod.GET,
                null,
                submitter.token(),
                "approval-object-history");
        assertThat(objectResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode objectStatus = objectResponse.getBody().path("data");
        assertThat(objectStatus.path("instance").path("instance").path("id").asLong()).isEqualTo(latestId);
        JsonNode history = objectStatus.path("history");
        assertThat(history).hasSize(2);
        assertThat(history.get(0).path("instance").path("id").asLong()).isEqualTo(latestId);
        assertThat(history.get(1).path("instance").path("id").asLong()).isEqualTo(instanceId);
        OffsetDateTime latestSubmittedAt = OffsetDateTime.parse(
                history.get(0).path("instance").path("submitted_at").asText());
        OffsetDateTime firstSubmittedAt = OffsetDateTime.parse(
                history.get(1).path("instance").path("submitted_at").asText());
        assertThat(latestId).isGreaterThan(instanceId);
        assertThat(latestSubmittedAt).isAfterOrEqualTo(firstSubmittedAt);

        createWorkflow(
                "contract",
                submitter.userId(),
                new NodeSpec(1, "Contract Risk", roleId, "active"));
        long contractId = createContract(submitter, suffix + "-reject");
        long contractInstanceId = submit(
                        submitter.token(), "contract", contractId, "Reject contract " + suffix)
                .getBody().path("data").path("id").asLong();
        decide(approver.token(), contractInstanceId, "reject", Map.of("comment", "Revise terms"));
        assertThat(jdbcTemplate.queryForObject(
                "select contract_status from crm_contracts where id = ?",
                String.class,
                contractId)).isEqualTo("drafting");
    }

    @Test
    void bidApprovalTransitionsThroughApprovingApprovedAndDraft() {
        String suffix = suffix();
        TestUser submitter = createAndLoginUser(
                "approval_bid_submit_" + suffix,
                "approval.submit");
        TestUser approver = createAndLoginUser(
                "approval_bid_actor_" + suffix,
                "approval.approve");
        long roleId = createRole("approval_bid_role_" + suffix);
        identityService.assignRole(approver.userId(), roleId);
        createWorkflow(
                "bid",
                submitter.userId(),
                new NodeSpec(1, "Bid Review", roleId, "active"));
        long approvedBidId = createSolutionDocument(
                submitter, "bid_document", "draft", false, suffix + "-approve");

        long approvedInstanceId = submit(
                        submitter.token(), "bid", approvedBidId, "Approve bid " + suffix)
                .getBody().path("data").path("id").asLong();
        assertThat(jdbcTemplate.queryForObject(
                "select status from crm_solution_documents where id = ?",
                String.class,
                approvedBidId)).isEqualTo("approving");
        ResponseEntity<JsonNode> approveResponse = decide(
                approver.token(), approvedInstanceId, "approve", Map.of());
        assertThat(approveResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(approveResponse.getBody().path("data").path("status").asText()).isEqualTo("approved");
        assertThat(jdbcTemplate.queryForObject(
                "select status from crm_solution_documents where id = ?",
                String.class,
                approvedBidId)).isEqualTo("approved");

        long rejectedBidId = createSolutionDocument(
                submitter, "bid", "draft", false, suffix + "-reject");
        long rejectedInstanceId = submit(
                        submitter.token(), "bid", rejectedBidId, "Reject bid " + suffix)
                .getBody().path("data").path("id").asLong();
        assertThat(jdbcTemplate.queryForObject(
                "select status from crm_solution_documents where id = ?",
                String.class,
                rejectedBidId)).isEqualTo("approving");
        ResponseEntity<JsonNode> rejectResponse = decide(
                approver.token(), rejectedInstanceId, "reject", Map.of("comment", "Revise bid"));
        assertThat(rejectResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rejectResponse.getBody().path("data").path("status").asText()).isEqualTo("rejected");
        assertThat(jdbcTemplate.queryForObject(
                "select status from crm_solution_documents where id = ?",
                String.class,
                rejectedBidId)).isEqualTo("draft");
    }

    @Test
    void enforcesReadSubmitAndApprovePermissionsIndependently() {
        String suffix = suffix();
        TestUser noRead = createAndLoginUser(
                "approval_no_read_" + suffix,
                "approval.submit");
        TestUser noSubmit = createAndLoginUser(
                "approval_no_submit_" + suffix,
                "approval.read");
        TestUser noApprove = createAndLoginUser(
                "approval_no_approve_" + suffix,
                "approval.read");

        assertForbidden(exchange(
                "/api/approvals/tasks?bucket=pending",
                HttpMethod.GET,
                null,
                noRead.token(),
                "approval-no-read"));
        assertForbidden(submit(noSubmit.token(), "quotation", Long.MAX_VALUE, "Forbidden"));
        assertForbidden(decide(noApprove.token(), Long.MAX_VALUE, "approve", Map.of()));
    }

    @Test
    void returnsClearEmptyObjectHistoryContract() {
        String suffix = suffix();
        TestUser reader = createAndLoginUser(
                "approval_empty_history_" + suffix,
                "approval.read");
        long quotationId = createSolutionDocument(reader, "quotation", "draft", true, suffix);

        ResponseEntity<JsonNode> response = exchange(
                "/api/approvals/object/quotation/" + quotationId,
                HttpMethod.GET,
                null,
                reader.token(),
                "approval-empty-history");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("instance").isNull()).isTrue();
        assertThat(data.path("history")).isEmpty();
    }

    private ResponseEntity<JsonNode> submit(String token, String objectType, long objectId, String objectName) {
        return exchange(
                "/api/approvals/instances",
                HttpMethod.POST,
                Map.of(
                        "object_type", objectType,
                        "object_id", objectId,
                        "object_name", objectName),
                token,
                "approval-submit");
    }

    private ResponseEntity<JsonNode> decide(
            String token,
            long instanceId,
            String decision,
            Map<String, ?> body) {
        return exchange(
                "/api/approvals/instances/" + instanceId + "/" + decision,
                HttpMethod.POST,
                body,
                token,
                "approval-" + decision);
    }

    private List<Long> taskIds(String token, String bucket) {
        ResponseEntity<JsonNode> response = exchange(
                "/api/approvals/tasks?bucket=" + bucket,
                HttpMethod.GET,
                null,
                token,
                "approval-tasks-" + bucket);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return StreamSupport.stream(response.getBody().path("data").spliterator(), false)
                .map(task -> task.path("instance").path("id").asLong())
                .toList();
    }

    private ResponseEntity<JsonNode> exchange(
            String path,
            HttpMethod method,
            Map<String, ?> body,
            String token,
            String traceId) {
        HttpEntity<?> entity = body == null
                ? new HttpEntity<>(authHeaders(token, traceId))
                : new HttpEntity<>(body, authHeaders(token, traceId));
        return restTemplate.exchange(path, method, entity, JsonNode.class);
    }

    private TestUser createAndLoginUser(String username, String... permissionCodes) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "approval-" + username,
                "Approval Test Department",
                "CN-31",
                "active"));
        Long roleId = createRole("approval_user_role_" + username);
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "Approval Test User",
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
        Arrays.stream(permissionCodes)
                .map(identityService::findPermissionIdByCode)
                .forEach(permissionId -> identityService.grantPermission(roleId, permissionId));
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");

        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("approval-login")),
                JsonNode.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        return new TestUser(
                userId,
                departmentId,
                loginResponse.getBody().path("data").path("access_token").asText());
    }

    private long createRole(String roleCode) {
        return identityService.createRole(new RoleCreateRequest(
                roleCode,
                "Approval Test Role",
                "Approval Test Role"));
    }

    private long createWorkflow(String objectType, long createdBy, NodeSpec... nodes) {
        disableDefaults(objectType);
        long templateId = insertAndReturnId(
                """
                insert into approval_templates (
                    tenant_id, object_type, template_name, status, is_default, created_by
                )
                values (1, ?, ?, 'active', true, ?)
                """,
                objectType,
                "Workflow " + suffix(),
                createdBy);
        for (NodeSpec node : nodes) {
            insertAndReturnId(
                    """
                    insert into approval_template_nodes (
                        template_id, step_order, node_name, approver_role_id, status
                    )
                    values (?, ?, ?, ?, ?)
                    """,
                    templateId,
                    node.stepOrder(),
                    node.nodeName(),
                    node.roleId(),
                    node.status());
        }
        return templateId;
    }

    private void disableDefaults(String objectType) {
        jdbcTemplate.update(
                "update approval_templates set is_default = false where tenant_id = 1 and object_type = ?",
                objectType);
    }

    private long createSolutionDocument(
            TestUser owner,
            String documentType,
            String status,
            boolean withQuotationAmount,
            String suffix) {
        long accountId = createAccount(owner, suffix);
        long opportunityId = createOpportunity(owner, accountId, suffix);
        return insertAndReturnId(
                """
                insert into crm_solution_documents (
                    account_id, opportunity_id, document_name, document_type, status,
                    owner_user_id, quotation_amount, created_by, updated_by
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                accountId,
                opportunityId,
                "Approval document " + suffix,
                documentType,
                status,
                owner.userId(),
                withQuotationAmount ? 100000 : null,
                owner.userId(),
                owner.userId());
    }

    private long createContract(TestUser owner, String suffix) {
        long accountId = createAccount(owner, suffix);
        long opportunityId = createOpportunity(owner, accountId, suffix);
        return insertAndReturnId(
                """
                insert into crm_contracts (
                    account_id, opportunity_id, contract_name, contract_no, contract_type,
                    contract_status, contract_amount, owner_user_id, created_by, updated_by
                )
                values (?, ?, ?, ?, 'project', 'drafting', 100000, ?, ?, ?)
                """,
                accountId,
                opportunityId,
                "Approval contract " + suffix,
                "APPROVAL-" + suffix,
                owner.userId(),
                owner.userId(),
                owner.userId());
    }

    private long createAccount(TestUser owner, String suffix) {
        return insertAndReturnId(
                """
                insert into crm_accounts (
                    account_name, account_type, account_status, owner_department_id,
                    owner_user_id, created_by, updated_by
                )
                values (?, 'enterprise', 'following', ?, ?, ?, ?)
                """,
                "Approval account " + suffix,
                owner.departmentId(),
                owner.userId(),
                owner.userId(),
                owner.userId());
    }

    private long createOpportunity(TestUser owner, long accountId, String suffix) {
        return insertAndReturnId(
                """
                insert into crm_opportunities (
                    account_id, opportunity_name, stage, status, owner_department_id,
                    owner_user_id, created_by, updated_by
                )
                values (?, ?, 'proposal', 'open', ?, ?, ?, ?)
                """,
                accountId,
                "Approval opportunity " + suffix,
                owner.departmentId(),
                owner.userId(),
                owner.userId(),
                owner.userId());
    }

    private long insertAndReturnId(String sql, Object... arguments) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql, new String[] {"id"});
            for (int index = 0; index < arguments.length; index++) {
                statement.setObject(index + 1, arguments[index]);
            }
            return statement;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Test data insert did not return an id");
        }
        return key.longValue();
    }

    private Integer auditCount(String actionCode, long instanceId, long actorUserId) {
        return jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_audit_logs
                where module_code = 'approval'
                  and action_code = ?
                  and object_type = 'approval_instance'
                  and object_id = ?
                  and actor_user_id = ?
                """,
                Integer.class,
                actionCode,
                instanceId,
                actorUserId);
    }

    private static void assertConflict(ResponseEntity<JsonNode> response) {
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().path("code").asText()).isEqualTo("BUSINESS_RULE_FAILED");
    }

    private static void assertForbidden(ResponseEntity<JsonNode> response) {
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
    }

    private static HttpHeaders traceHeaders(String traceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Trace-Id", traceId + "-" + UUID.randomUUID());
        return headers;
    }

    private static HttpHeaders authHeaders(String token, String traceId) {
        HttpHeaders headers = traceHeaders(traceId);
        headers.setBearerAuth(token);
        return headers;
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private record TestUser(Long userId, Long departmentId, String token) {
    }

    private record NodeSpec(Integer stepOrder, String nodeName, Long roleId, String status) {
    }
}
