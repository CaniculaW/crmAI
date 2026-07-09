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
    void listsAndCreatesDepartmentsForSystemUserManagers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String token = createAndLoginUser("dept_mgr_" + suffix, List.of("system.user.manage"));

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/system/departments",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "code", "dept_api_" + suffix,
                        "name", "系统管理创建部门",
                        "region_code", "CN-31",
                        "status", "active"), authHeaders(token, "identity-dept-create-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/system/departments",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "identity-dept-list-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        Long departmentId = createResponse.getBody().path("data").path("id").asLong();
        assertThat(createResponse.getBody().path("data").path("name").asText()).isEqualTo("系统管理创建部门");
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(department ->
                assertThat(department.path("id").asLong()).isEqualTo(departmentId));
    }

    @Test
    void createsAndUpdatesUsersForSystemUserManagers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String token = createAndLoginUser("user_admin_" + suffix, List.of("system.user.manage"));
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "user-admin-dept-" + suffix,
                "用户管理测试部",
                "CN-31",
                "active"));
        Long childDepartmentId = identityService.createDepartment(new DepartmentCreateRequest(
                departmentId,
                "user-admin-child-" + suffix,
                "用户管理二级组织",
                "CN-31",
                "active"));
        Long firstRoleId = identityService.createRole(new RoleCreateRequest(
                "created_user_role_" + suffix,
                "新用户角色",
                "创建用户时分配"));
        identityService.grantPermission(firstRoleId, identityService.findPermissionIdByCode("account.read"));
        Long secondRoleId = identityService.createRole(new RoleCreateRequest(
                "updated_user_role_" + suffix,
                "更新用户角色",
                "更新用户时替换"));

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/system/users",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "department_id", childDepartmentId,
                        "name", "新建系统用户",
                        "mobile", "138" + suffix.substring(0, 8),
                        "email", "created_" + suffix + "@example.com",
                        "role_code", "sales_rep",
                        "status", "active",
                        "login_username", "created_user_" + suffix,
                        "initial_password", "S3cure!123",
                        "role_ids", List.of(firstRoleId)), authHeaders(token, "identity-user-create-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        Long userId = createResponse.getBody().path("data").path("id").asLong();
        assertThat(createResponse.getBody().path("data").path("department_id").asLong()).isEqualTo(childDepartmentId);
        assertThat(createResponse.getBody().path("data").path("roles")).anySatisfy(role ->
                assertThat(role.path("id").asLong()).isEqualTo(firstRoleId));

        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", "created_user_" + suffix,
                        "password", "S3cure!123"), traceHeaders("identity-created-login-trace-001")),
                JsonNode.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResponse.getBody().path("data").path("user").path("permissions"))
                .anySatisfy(permission -> assertThat(permission.asText()).isEqualTo("account.read"));

        ResponseEntity<JsonNode> updateResponse = restTemplate.exchange(
                "/api/system/users/" + userId,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of(
                        "name", "更新系统用户",
                        "status", "inactive",
                        "role_ids", List.of(secondRoleId)), authHeaders(token, "identity-user-update-trace-001")),
                JsonNode.class);

        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResponse.getBody().path("data").path("name").asText()).isEqualTo("更新系统用户");
        assertThat(updateResponse.getBody().path("data").path("status").asText()).isEqualTo("inactive");
        assertThat(updateResponse.getBody().path("data").path("roles")).anySatisfy(role ->
                assertThat(role.path("id").asLong()).isEqualTo(secondRoleId));
        assertThat(updateResponse.getBody().path("data").path("roles")).noneSatisfy(role ->
                assertThat(role.path("id").asLong()).isEqualTo(firstRoleId));
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
