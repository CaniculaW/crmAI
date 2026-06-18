package com.canicula.crmai.attachment;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AttachmentControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void createsAndListsAttachmentMetadataByObject() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-create-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_create_" + suffix,
                departmentId,
                List.of("account.create", "attachment.create", "attachment.read"),
                List.of("global"));
        String token = login("attachment_create_" + suffix);
        Long accountId = createAccount(token, "附件客户-" + suffix, departmentId, userId);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "account",
                        "object_id", accountId,
                        "file_name", "组织架构图-" + suffix + ".pdf",
                        "file_url", "oss://crm/account/" + suffix + "/org.pdf",
                        "file_type", "organization_chart",
                        "file_size", 4096,
                        "remark", "客户组织资料"), authHeaders(token, "attachment-create-trace-001")),
                JsonNode.class);
        Long attachmentId = createResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=account&object_id=" + accountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-list-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'attachment.create' and object_id = ?",
                Integer.class,
                attachmentId);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode created = createResponse.getBody().path("data");
        assertThat(created.path("object_type").asText()).isEqualTo("account");
        assertThat(created.path("object_id").asLong()).isEqualTo(accountId);
        assertThat(created.path("file_name").asText()).isEqualTo("组织架构图-" + suffix + ".pdf");
        assertThat(created.path("file_url").asText()).isEqualTo("oss://crm/account/" + suffix + "/org.pdf");
        assertThat(created.path("file_size").asLong()).isEqualTo(4096);
        assertThat(created.path("uploaded_by").asLong()).isEqualTo(userId);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void rejectsAttachmentMetadataWhenObjectIsNotReadable() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-deny-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "attachment_deny_creator_" + suffix,
                departmentId,
                List.of("account.create"),
                List.of("global"));
        Long viewerUserId = createLoginReadyUser(
                "attachment_deny_viewer_" + suffix,
                departmentId,
                List.of("attachment.create", "attachment.read"),
                List.of("own"));
        String creatorToken = login("attachment_deny_creator_" + suffix);
        String viewerToken = login("attachment_deny_viewer_" + suffix);
        Long hiddenAccountId = createAccount(creatorToken, "不可挂附件客户-" + suffix, departmentId, creatorUserId);

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "account",
                        "object_id", hiddenAccountId,
                        "file_name", "越权资料.pdf",
                        "file_url", "oss://crm/account/hidden.pdf",
                        "file_type", "customer_material"), authHeaders(viewerToken, "attachment-deny-create-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=account&object_id=" + hiddenAccountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "attachment-deny-list-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(createResponse.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void deletesAttachmentMetadataWithAuditLog() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("attachment-delete-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "attachment_delete_" + suffix,
                departmentId,
                List.of("account.create", "attachment.create", "attachment.read", "attachment.delete"),
                List.of("global"));
        String token = login("attachment_delete_" + suffix);
        Long accountId = createAccount(token, "附件删除客户-" + suffix, departmentId, userId);
        Long attachmentId = createAttachment(token, accountId, "待删除附件-" + suffix + ".docx");

        ResponseEntity<JsonNode> deleteResponse = restTemplate.exchange(
                "/api/attachments/" + attachmentId,
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(token, "attachment-delete-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/attachments?object_type=account&object_id=" + accountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "attachment-delete-list-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'attachment.delete' and object_id = ?",
                Integer.class,
                attachmentId);

        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deleteResponse.getBody().path("data").path("deleted").asBoolean()).isTrue();
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).noneSatisfy(attachment ->
                assertThat(attachment.path("id").asLong()).isEqualTo(attachmentId));
        assertThat(auditCount).isEqualTo(1);
    }

    private Long createAttachment(String accessToken, Long accountId, String fileName) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/attachments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "object_type", "account",
                        "object_id", accountId,
                        "file_name", fileName,
                        "file_url", "oss://crm/account/" + fileName,
                        "file_type", "customer_material"), authHeaders(accessToken, "attachment-helper-create-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
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
                new HttpEntity<>(request, authHeaders(accessToken, "attachment-helper-account-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "附件测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "attachment_role_" + username,
                "附件测试角色",
                "附件测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "附件测试用户",
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
            grantDataScope(roleId, "activity", scope);
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
                        "password", "S3cure!123"), traceHeaders("attachment-login-trace-001")),
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
}
