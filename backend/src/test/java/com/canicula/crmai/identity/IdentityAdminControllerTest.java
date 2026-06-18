package com.canicula.crmai.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
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
class IdentityAdminControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void listsUsersForSystemUserManagers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String token = createAndLoginUser("user_mgr_" + suffix, List.of("system.user.manage"));
        Long salesRoleId = identityService.createRole(new RoleCreateRequest(
                "sales_reader_" + suffix,
                "销售查看角色",
                "用于用户列表展示"));
        Long userId = createLoginReadyUser("sales_user_" + suffix, List.of("account.read"), salesRoleId);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/system/users",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "identity-users-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().path("data")).anySatisfy(user -> {
            assertThat(user.path("id").asLong()).isEqualTo(userId);
            assertThat(user.path("email").asText()).isEqualTo("sales_user_" + suffix + "@example.com");
            assertThat(user.path("status").asText()).isEqualTo("active");
            assertThat(user.path("roles")).anySatisfy(role ->
                    assertThat(role.path("code").asText()).isEqualTo("sales_reader_" + suffix));
        });
    }

    @Test
    void listsPermissionsAndReplacesRolePermissionsForSystemRoleManagers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String token = createAndLoginUser("role_mgr_" + suffix, List.of("system.role.manage"));
        Long managedRoleId = identityService.createRole(new RoleCreateRequest(
                "managed_role_" + suffix,
                "待授权角色",
                "用于角色授权测试"));
        identityService.grantPermission(managedRoleId, identityService.findPermissionIdByCode("account.read"));

        ResponseEntity<JsonNode> permissionsResponse = restTemplate.exchange(
                "/api/system/permissions",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "identity-permissions-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> updateResponse = restTemplate.exchange(
                "/api/system/roles/" + managedRoleId + "/permissions",
                HttpMethod.PUT,
                new HttpEntity<>(Map.of(
                        "permission_codes", List.of("account.create", "system.audit.read")), authHeaders(token, "identity-role-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> rolesResponse = restTemplate.exchange(
                "/api/system/roles",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "identity-roles-trace-001")),
                JsonNode.class);

        assertThat(permissionsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(permissionsResponse.getBody().path("data")).anySatisfy(permission ->
                assertThat(permission.path("permission_code").asText()).isEqualTo("system.audit.read"));
        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResponse.getBody().path("data").path("permission_codes"))
                .anySatisfy(permission -> assertThat(permission.asText()).isEqualTo("account.create"))
                .anySatisfy(permission -> assertThat(permission.asText()).isEqualTo("system.audit.read"));
        assertThat(updateResponse.getBody().path("data").path("permission_codes"))
                .noneSatisfy(permission -> assertThat(permission.asText()).isEqualTo("account.read"));
        assertThat(rolesResponse.getBody().path("data")).anySatisfy(role -> {
            assertThat(role.path("id").asLong()).isEqualTo(managedRoleId);
            assertThat(role.path("permission_codes")).anySatisfy(permission ->
                    assertThat(permission.asText()).isEqualTo("system.audit.read"));
        });
    }

    @Test
    void requiresSystemManagementPermissions() {
        String token = createAndLoginUser(
                "identity_low_" + UUID.randomUUID().toString().substring(0, 8),
                List.of("account.read"));

        ResponseEntity<JsonNode> usersResponse = restTemplate.exchange(
                "/api/system/users",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "identity-low-users-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> rolesResponse = restTemplate.exchange(
                "/api/system/roles",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "identity-low-roles-trace-001")),
                JsonNode.class);

        assertThat(usersResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(rolesResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private String createAndLoginUser(String username, List<String> permissionCodes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "identity_role_" + username,
                "身份管理测试角色",
                "身份管理测试角色"));
        createLoginReadyUser(username, permissionCodes, roleId);

        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("identity-login-trace-001")),
                JsonNode.class);
        return loginResponse.getBody().path("data").path("access_token").asText();
    }

    private Long createLoginReadyUser(String username, List<String> permissionCodes, Long roleId) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "identity-" + username,
                "身份管理测试部",
                "CN-31",
                "active"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "身份管理用户",
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
        return userId;
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
