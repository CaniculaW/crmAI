package com.canicula.crmai.audit;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuditLogControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void listsAuditLogsWithSystemAuditReadPermission() {
        LoginSubject subject = createAndLoginUser("audit_reader_", List.of("account.create", "system.audit.read"));
        HttpHeaders headers = authHeaders(subject.accessToken(), "audit-read-trace-001");
        ResponseEntity<JsonNode> accountResponse = restTemplate.exchange(
                "/api/accounts",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "account_name", "审计客户",
                        "account_type", "enterprise",
                        "account_status", "following",
                        "owner_department_id", subject.departmentId(),
                        "owner_user_id", subject.userId(),
                        "collaborators", List.of()), headers),
                JsonNode.class);
        Long accountId = accountResponse.getBody().path("data").path("id").asLong();

        ResponseEntity<JsonNode> auditResponse = restTemplate.exchange(
                "/api/system/audit-logs?module_code=account&action_code=account.create&limit=5",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class);

        assertThat(accountResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(auditResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(auditResponse.getBody().path("data")).anySatisfy(item -> {
            assertThat(item.path("object_id").asLong()).isEqualTo(accountId);
            assertThat(item.path("module_code").asText()).isEqualTo("account");
            assertThat(item.path("action_code").asText()).isEqualTo("account.create");
            assertThat(item.path("after_data").path("account_name").asText()).isEqualTo("审计客户");
        });
    }

    @Test
    void requiresSystemAuditReadPermission() {
        LoginSubject subject = createAndLoginUser("audit_low_", List.of("account.create"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/system/audit-logs",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(subject.accessToken(), "audit-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
    }

    private LoginSubject createAndLoginUser(String prefix, List<String> permissionCodes) {
        String username = prefix + UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "dept-" + username,
                "审计测试部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "role_" + username,
                "审计测试角色",
                "审计测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "审计测试用户",
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
        permissionCodes.forEach(permissionCode ->
                identityService.grantPermission(roleId, identityService.findPermissionIdByCode(permissionCode)));
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");

        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("audit-login-trace-001")),
                JsonNode.class);
        return new LoginSubject(
                userId,
                departmentId,
                loginResponse.getBody().path("data").path("access_token").asText());
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

    private record LoginSubject(Long userId, Long departmentId, String accessToken) {
    }
}
