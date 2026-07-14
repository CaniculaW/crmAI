package com.canicula.crmai.approval;

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
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.web.resources.add-mappings=false")
class ApprovalTemplateControllerTest {

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
    void createsListsAndPartiallyUpdatesApprovalTemplates() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_mgr_" + suffix, "approval.config.manage");

        ResponseEntity<JsonNode> createResponse = exchange(
                "/api/approval-templates",
                HttpMethod.POST,
                Map.of(
                        "object_type", "quotation",
                        "template_name", "Quotation " + suffix,
                        "is_default", false),
                manager.token(),
                "approval-template-create");

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode created = createResponse.getBody().path("data");
        long templateId = created.path("id").asLong();
        assertThat(created.path("object_type").asText()).isEqualTo("quotation");
        assertThat(created.path("template_name").asText()).isEqualTo("Quotation " + suffix);
        assertThat(created.path("is_default").asBoolean()).isFalse();
        assertThat(created.path("status").asText()).isEqualTo("active");

        ResponseEntity<JsonNode> updateResponse = exchange(
                "/api/approval-templates/" + templateId,
                HttpMethod.PATCH,
                Map.of(
                        "template_name", "Quotation Updated " + suffix,
                        "status", "inactive",
                        "is_default", true),
                manager.token(),
                "approval-template-update");

        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode updated = updateResponse.getBody().path("data");
        assertThat(updated.path("template_name").asText()).isEqualTo("Quotation Updated " + suffix);
        assertThat(updated.path("status").asText()).isEqualTo("inactive");
        assertThat(updated.path("is_default").asBoolean()).isTrue();

        ResponseEntity<JsonNode> listResponse = exchange(
                "/api/approval-templates",
                HttpMethod.GET,
                null,
                manager.token(),
                "approval-template-list");

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(findById(listResponse.getBody().path("data"), templateId).path("template_name").asText())
                .isEqualTo("Quotation Updated " + suffix);
        assertThat(auditCount(
                "approval.template.create", "approval_template", templateId, manager.userId())).isEqualTo(1);
        assertThat(auditCount(
                "approval.template.update", "approval_template", templateId, manager.userId())).isEqualTo(1);
    }

    @Test
    void switchesDefaultTemplateWithinTheSameObjectType() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_default_" + suffix, "approval.config.manage");

        long firstId = createTemplate(manager.token(), "contract", "A Contract " + suffix, true);
        long secondId = createTemplate(manager.token(), "contract", "B Contract " + suffix, true);

        assertThat(jdbcTemplate.queryForObject(
                "select is_default from approval_templates where id = ?", Boolean.class, firstId)).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                "select is_default from approval_templates where id = ?", Boolean.class, secondId)).isTrue();
        assertThat(auditCount(
                "approval.template.create", "approval_template", secondId, manager.userId())).isEqualTo(1);
        assertThat(auditCount(
                "approval.template.update", "approval_template", firstId, manager.userId())).isEqualTo(1);

        JsonNode before = auditSnapshot(firstId, manager.userId(), "before_data");
        JsonNode after = auditSnapshot(firstId, manager.userId(), "after_data");
        assertThat(before.path("id").asLong()).isEqualTo(firstId);
        assertThat(before.path("is_default").asBoolean()).isTrue();
        assertThat(after.path("id").asLong()).isEqualTo(firstId);
        assertThat(after.path("is_default").asBoolean()).isFalse();

        long thirdId = createTemplate(manager.token(), "contract", "C Contract " + suffix, false);
        ResponseEntity<JsonNode> updateResponse = exchange(
                "/api/approval-templates/" + thirdId,
                HttpMethod.PATCH,
                Map.of("is_default", true),
                manager.token(),
                "approval-switch-default-by-update");

        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(jdbcTemplate.queryForObject(
                "select is_default from approval_templates where id = ?", Boolean.class, secondId)).isFalse();
        assertThat(jdbcTemplate.queryForObject(
                "select is_default from approval_templates where id = ?", Boolean.class, thirdId)).isTrue();
        assertThat(auditCount(
                "approval.template.update", "approval_template", secondId, manager.userId())).isEqualTo(1);
        assertThat(auditCount(
                "approval.template.update", "approval_template", thirdId, manager.userId())).isEqualTo(1);

        JsonNode updateBefore = auditSnapshot(secondId, manager.userId(), "before_data");
        JsonNode updateAfter = auditSnapshot(secondId, manager.userId(), "after_data");
        assertThat(updateBefore.path("is_default").asBoolean()).isTrue();
        assertThat(updateAfter.path("is_default").asBoolean()).isFalse();
    }

    @Test
    void createsListsAndPartiallyUpdatesSequentialNodes() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_node_" + suffix, "approval.config.manage");
        long templateId = createTemplate(manager.token(), "bid", "Bid " + suffix, false);
        long firstRoleId = createRole("approval_first_" + suffix);
        long secondRoleId = createRole("approval_second_" + suffix);

        ResponseEntity<JsonNode> createResponse = exchange(
                "/api/approval-templates/" + templateId + "/nodes",
                HttpMethod.POST,
                Map.of(
                        "step_order", 2,
                        "node_name", "Commercial Review",
                        "approver_role_id", firstRoleId),
                manager.token(),
                "approval-node-create");

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode created = createResponse.getBody().path("data");
        long nodeId = created.path("id").asLong();
        assertThat(created.path("template_id").asLong()).isEqualTo(templateId);
        assertThat(created.path("step_order").asInt()).isEqualTo(2);
        assertThat(created.path("node_name").asText()).isEqualTo("Commercial Review");
        assertThat(created.path("approver_role_id").asLong()).isEqualTo(firstRoleId);
        assertThat(created.path("status").asText()).isEqualTo("active");

        createNode(manager.token(), templateId, 1, "Sales Review", secondRoleId);

        ResponseEntity<JsonNode> listResponse = exchange(
                "/api/approval-templates/" + templateId + "/nodes",
                HttpMethod.GET,
                null,
                manager.token(),
                "approval-node-list");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data").get(0).path("step_order").asInt()).isEqualTo(1);
        assertThat(listResponse.getBody().path("data").get(1).path("step_order").asInt()).isEqualTo(2);

        ResponseEntity<JsonNode> updateResponse = exchange(
                "/api/approval-templates/" + templateId + "/nodes/" + nodeId,
                HttpMethod.PATCH,
                Map.of(
                        "node_name", "Legal Review",
                        "approver_role_id", secondRoleId,
                        "status", "inactive"),
                manager.token(),
                "approval-node-update");

        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode updated = updateResponse.getBody().path("data");
        assertThat(updated.path("step_order").asInt()).isEqualTo(2);
        assertThat(updated.path("node_name").asText()).isEqualTo("Legal Review");
        assertThat(updated.path("approver_role_id").asLong()).isEqualTo(secondRoleId);
        assertThat(updated.path("status").asText()).isEqualTo("inactive");
        assertThat(auditCount(
                "approval.template-node.create", "approval_template_node", nodeId, manager.userId())).isEqualTo(1);
        assertThat(auditCount(
                "approval.template-node.update", "approval_template_node", nodeId, manager.userId())).isEqualTo(1);
    }

    @Test
    void rejectsUnsupportedObjectTypeAndInvalidStatusesOrStepOrder() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_invalid_" + suffix, "approval.config.manage");

        assertConflict(exchange(
                "/api/approval-templates",
                HttpMethod.POST,
                Map.of("object_type", "invoice", "template_name", "Invalid " + suffix),
                manager.token(),
                "approval-invalid-object"));

        long templateId = createTemplate(manager.token(), "quotation", "Valid " + suffix, false);
        assertValidationBadRequest(exchange(
                "/api/approval-templates/" + templateId,
                HttpMethod.PATCH,
                Map.of("status", "archived"),
                manager.token(),
                "approval-invalid-template-status"));

        long roleId = createRole("approval_invalid_role_" + suffix);
        assertValidationBadRequest(exchange(
                "/api/approval-templates/" + templateId + "/nodes",
                HttpMethod.POST,
                Map.of("step_order", 0, "node_name", "Invalid", "approver_role_id", roleId),
                manager.token(),
                "approval-invalid-step"));
    }

    @Test
    void rejectsEmptyOrBlankTemplatePatchesWithBeanValidation() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_template_patch_" + suffix, "approval.config.manage");
        long templateId = createTemplate(manager.token(), "quotation", "Patch " + suffix, false);

        assertValidationBadRequest(exchange(
                "/api/approval-templates/" + templateId,
                HttpMethod.PATCH,
                Map.of(),
                manager.token(),
                "approval-empty-template-patch"));
        assertValidationBadRequest(exchange(
                "/api/approval-templates/" + templateId,
                HttpMethod.PATCH,
                Map.of("template_name", ""),
                manager.token(),
                "approval-empty-template-name"));
        assertValidationBadRequest(exchange(
                "/api/approval-templates/" + templateId,
                HttpMethod.PATCH,
                Map.of("template_name", "   "),
                manager.token(),
                "approval-blank-template-name"));
    }

    @Test
    void rejectsEmptyOrBlankNodePatchesWithBeanValidation() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_node_patch_" + suffix, "approval.config.manage");
        long templateId = createTemplate(manager.token(), "bid", "Node Patch " + suffix, false);
        long roleId = createRole("approval_node_patch_role_" + suffix);
        long nodeId = createNode(manager.token(), templateId, 1, "Review", roleId);

        assertValidationBadRequest(exchange(
                "/api/approval-templates/" + templateId + "/nodes/" + nodeId,
                HttpMethod.PATCH,
                Map.of(),
                manager.token(),
                "approval-empty-node-patch"));
        assertValidationBadRequest(exchange(
                "/api/approval-templates/" + templateId + "/nodes/" + nodeId,
                HttpMethod.PATCH,
                Map.of("node_name", ""),
                manager.token(),
                "approval-empty-node-name"));
        assertValidationBadRequest(exchange(
                "/api/approval-templates/" + templateId + "/nodes/" + nodeId,
                HttpMethod.PATCH,
                Map.of("node_name", "   "),
                manager.token(),
                "approval-blank-node-name"));
    }

    @Test
    void rejectsDuplicateStepOrderAcrossActiveAndInactiveNodes() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_duplicate_" + suffix, "approval.config.manage");
        long templateId = createTemplate(manager.token(), "quotation", "Duplicate " + suffix, false);
        long roleId = createRole("approval_duplicate_role_" + suffix);
        long nodeId = createNode(manager.token(), templateId, 1, "First", roleId);
        exchange(
                "/api/approval-templates/" + templateId + "/nodes/" + nodeId,
                HttpMethod.PATCH,
                Map.of("status", "inactive"),
                manager.token(),
                "approval-inactivate-node");

        assertConflict(exchange(
                "/api/approval-templates/" + templateId + "/nodes",
                HttpMethod.POST,
                Map.of("step_order", 1, "node_name", "Duplicate", "approver_role_id", roleId),
                manager.token(),
                "approval-duplicate-step"));
    }

    @Test
    void rejectsMissingOrDeletedApproverRole() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_role_check_" + suffix, "approval.config.manage");
        long templateId = createTemplate(manager.token(), "quotation", "Role Check " + suffix, false);

        assertConflict(exchange(
                "/api/approval-templates/" + templateId + "/nodes",
                HttpMethod.POST,
                Map.of("step_order", 1, "node_name", "Missing Role", "approver_role_id", Long.MAX_VALUE),
                manager.token(),
                "approval-missing-role"));

        long deletedRoleId = createRole("approval_deleted_role_" + suffix);
        jdbcTemplate.update("update sys_roles set deleted_at = current_timestamp where id = ?", deletedRoleId);
        assertConflict(exchange(
                "/api/approval-templates/" + templateId + "/nodes",
                HttpMethod.POST,
                Map.of("step_order", 2, "node_name", "Deleted Role", "approver_role_id", deletedRoleId),
                manager.token(),
                "approval-deleted-role"));
    }

    @Test
    void excludesDeletedTemplatesAndUsesStableListOrdering() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_order_" + suffix, "approval.config.manage");
        long deletedId = createTemplate(manager.token(), "quotation", "Deleted " + suffix, false);
        jdbcTemplate.update("update approval_templates set deleted_at = current_timestamp where id = ?", deletedId);
        long bidId = createTemplate(manager.token(), "bid", "Zulu " + suffix, false);
        long contractId = createTemplate(manager.token(), "contract", "Alpha " + suffix, false);

        ResponseEntity<JsonNode> response = exchange(
                "/api/approval-templates",
                HttpMethod.GET,
                null,
                manager.token(),
                "approval-order-list");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(containsId(data, deletedId)).isFalse();
        assertThat(indexOf(data, bidId)).isLessThan(indexOf(data, contractId));
    }

    @Test
    void listsOnlyRolesWithAnActiveUserWhoCanApprove() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_roles_" + suffix, "approval.config.manage");
        TestUser approver = createAndLoginUser("approval_role_actor_" + suffix, "approval.approve");
        String assignableCode = "approval_assignable_" + suffix;
        long assignableRoleId = createRole(assignableCode);
        identityService.assignRole(approver.userId(), assignableRoleId);
        long unstaffedRoleId = createRole("approval_unstaffed_" + suffix);
        long deletedRoleId = createRole("approval_unassignable_" + suffix);
        jdbcTemplate.update("update sys_roles set deleted_at = current_timestamp where id = ?", deletedRoleId);

        ResponseEntity<JsonNode> response = exchange(
                "/api/approval-templates/approver-roles",
                HttpMethod.GET,
                null,
                manager.token(),
                "approval-approver-role-list");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        JsonNode role = findById(data, assignableRoleId);
        assertThat(role.size()).isEqualTo(3);
        assertThat(role.path("id").asLong()).isEqualTo(assignableRoleId);
        assertThat(role.path("code").asText()).isEqualTo(assignableCode);
        assertThat(role.path("name").asText()).isEqualTo("Approval Test Role");
        assertThat(containsId(data, unstaffedRoleId)).isFalse();
        assertThat(containsId(data, deletedRoleId)).isFalse();
    }

    @Test
    void excludesApproverRolesWhenTheApprovePermissionIsInactive() {
        String suffix = suffix();
        TestUser manager = createAndLoginUser("approval_inactive_permission_mgr_" + suffix, "approval.config.manage");
        TestUser approver = createAndLoginUser("approval_inactive_permission_actor_" + suffix, "approval.approve");
        long approverRoleId = createRole("approval_inactive_permission_role_" + suffix);
        identityService.assignRole(approver.userId(), approverRoleId);

        jdbcTemplate.update("update sys_permissions set is_active = false where permission_code = 'approval.approve'");
        try {
            ResponseEntity<JsonNode> response = exchange(
                    "/api/approval-templates/approver-roles",
                    HttpMethod.GET,
                    null,
                    manager.token(),
                    "approval-inactive-permission-role-list");

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(containsId(response.getBody().path("data"), approverRoleId)).isFalse();
        } finally {
            jdbcTemplate.update("update sys_permissions set is_active = true where permission_code = 'approval.approve'");
        }
    }

    @Test
    void requiresApprovalConfigManagePermissionForTemplateAndNodeEndpoints() {
        String suffix = suffix();
        TestUser lowUser = createAndLoginUser("approval_low_" + suffix, "account.read");

        ResponseEntity<JsonNode> templateResponse = exchange(
                "/api/approval-templates",
                HttpMethod.GET,
                null,
                lowUser.token(),
                "approval-low-template");
        ResponseEntity<JsonNode> nodeResponse = exchange(
                "/api/approval-templates/1/nodes",
                HttpMethod.GET,
                null,
                lowUser.token(),
                "approval-low-node");
        ResponseEntity<JsonNode> roleResponse = exchange(
                "/api/approval-templates/approver-roles",
                HttpMethod.GET,
                null,
                lowUser.token(),
                "approval-low-approver-role");

        assertThat(templateResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(templateResponse.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
        assertThat(nodeResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(nodeResponse.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
        assertThat(roleResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(roleResponse.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
    }

    private long createTemplate(String token, String objectType, String templateName, boolean isDefault) {
        ResponseEntity<JsonNode> response = exchange(
                "/api/approval-templates",
                HttpMethod.POST,
                Map.of(
                        "object_type", objectType,
                        "template_name", templateName,
                        "is_default", isDefault),
                token,
                "approval-create-template-helper");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private long createNode(String token, long templateId, int stepOrder, String nodeName, long roleId) {
        ResponseEntity<JsonNode> response = exchange(
                "/api/approval-templates/" + templateId + "/nodes",
                HttpMethod.POST,
                Map.of(
                        "step_order", stepOrder,
                        "node_name", nodeName,
                        "approver_role_id", roleId),
                token,
                "approval-create-node-helper");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private ResponseEntity<JsonNode> exchange(
            String path,
            HttpMethod method,
            Map<String, ?> body,
            String token,
            String traceId) {
        if (method == HttpMethod.PATCH) {
            return patch(path, body, authHeaders(token, traceId));
        }
        HttpEntity<?> entity = body == null
                ? new HttpEntity<>(authHeaders(token, traceId))
                : new HttpEntity<>(body, authHeaders(token, traceId));
        return restTemplate.exchange(path, method, entity, JsonNode.class);
    }

    private ResponseEntity<JsonNode> patch(String path, Map<String, ?> body, HttpHeaders headers) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + port + path))
                    .header("Content-Type", "application/json")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
            headers.forEach((name, values) -> values.forEach(value -> builder.header(name, value)));
            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return ResponseEntity.status(response.statusCode()).body(objectMapper.readTree(response.body()));
        } catch (Exception exception) {
            throw new IllegalStateException("PATCH request failed", exception);
        }
    }

    private TestUser createAndLoginUser(String username, String permissionCode) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "approval-" + username,
                "Approval Test Department",
                "CN-31",
                "active"));
        Long roleId = createRole("approval_manager_" + username);
        Long permissionId = identityService.findPermissionIdByCode(permissionCode);
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
        identityService.grantPermission(roleId, permissionId);
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");

        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("approval-login")),
                JsonNode.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        return new TestUser(userId, loginResponse.getBody().path("data").path("access_token").asText());
    }

    private long createRole(String roleCode) {
        return identityService.createRole(new RoleCreateRequest(
                roleCode,
                "Approval Test Role",
                "Approval Test Role"));
    }

    private Integer auditCount(String actionCode, String objectType, long objectId, long actorUserId) {
        return jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_audit_logs
                where action_code = ?
                  and object_type = ?
                  and object_id = ?
                  and actor_user_id = ?
                """,
                Integer.class,
                actionCode,
                objectType,
                objectId,
                actorUserId);
    }

    private JsonNode auditSnapshot(long objectId, long actorUserId, String columnName) {
        String snapshot = jdbcTemplate.queryForObject(
                """
                select cast(%s as varchar)
                from sys_audit_logs
                where action_code = 'approval.template.update'
                  and object_type = 'approval_template'
                  and object_id = ?
                  and actor_user_id = ?
                order by id desc
                limit 1
                """.formatted(columnName),
                String.class,
                objectId,
                actorUserId);
        try {
            JsonNode parsed = objectMapper.readTree(snapshot);
            return parsed.isTextual() ? objectMapper.readTree(parsed.asText()) : parsed;
        } catch (Exception exception) {
            throw new IllegalStateException("Audit snapshot is not valid JSON", exception);
        }
    }

    private static void assertValidationBadRequest(ResponseEntity<JsonNode> response) {
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().path("code").asText()).isEqualTo("VALIDATION_ERROR");
    }

    private static void assertConflict(ResponseEntity<JsonNode> response) {
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().path("code").asText()).isEqualTo("BUSINESS_RULE_FAILED");
    }

    private static JsonNode findById(JsonNode array, long id) {
        for (JsonNode item : array) {
            if (item.path("id").asLong() == id) {
                return item;
            }
        }
        throw new AssertionError("Item not found: " + id);
    }

    private static boolean containsId(JsonNode array, long id) {
        for (JsonNode item : array) {
            if (item.path("id").asLong() == id) {
                return true;
            }
        }
        return false;
    }

    private static int indexOf(JsonNode array, long id) {
        for (int index = 0; index < array.size(); index++) {
            if (array.get(index).path("id").asLong() == id) {
                return index;
            }
        }
        throw new AssertionError("Item not found: " + id);
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

    private record TestUser(Long userId, String token) {
    }
}
