package com.canicula.crmai.auth;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PasswordManagementControllerTest {

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
    void changesOwnPasswordAndInvalidatesOldPassword() {
        String username = "change_pwd_" + UUID.randomUUID().toString().substring(0, 8);
        Long userId = createLoginReadyUser(username);
        passwordCredentialService.createPasswordCredential(userId, "OldPass!123");
        String token = login(username, "OldPass!123");

        ResponseEntity<JsonNode> changeResponse = restTemplate.exchange(
                "/api/auth/change-password",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "old_password", "OldPass!123",
                        "new_password", "NewPass!123"), authHeaders(token, "password-change-trace-001")),
                JsonNode.class);
        HttpJsonResponse oldPasswordResponse = loginResponse(username, "OldPass!123");
        HttpJsonResponse newPasswordResponse = loginResponse(username, "NewPass!123");

        assertThat(changeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(oldPasswordResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(newPasswordResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void resetsPasswordAndMarksForcePasswordChange() {
        String username = "reset_pwd_" + UUID.randomUUID().toString().substring(0, 8);
        Long userId = createLoginReadyUser(username);
        passwordCredentialService.createPasswordCredential(userId, "OldPass!123");
        String managerToken = createAndLoginUserWithPermission(
                "reset_manager_" + UUID.randomUUID().toString().substring(0, 8),
                "system.user.manage");

        ResponseEntity<JsonNode> resetResponse = restTemplate.exchange(
                "/api/auth/reset-password",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "user_id", userId,
                        "new_password", "ResetPass!123"), authHeaders(managerToken, "password-reset-trace-001")),
                JsonNode.class);
        HttpJsonResponse loginResponse = loginResponse(username, "ResetPass!123");

        Boolean forcePasswordChange = jdbcTemplate.queryForObject(
                "select force_password_change from sys_users where id = ?",
                Boolean.class,
                userId);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'auth.password.reset' and object_id = ?",
                Integer.class,
                userId);

        assertThat(resetResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(forcePasswordChange).isTrue();
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void rejectsPasswordResetWithoutUserManagePermission() {
        String targetUsername = "reset_denied_target_" + UUID.randomUUID().toString().substring(0, 8);
        Long targetUserId = createLoginReadyUser(targetUsername);
        passwordCredentialService.createPasswordCredential(targetUserId, "OldPass!123");
        String lowPrivilegeToken = createAndLoginUserWithPermission(
                "reset_denied_actor_" + UUID.randomUUID().toString().substring(0, 8),
                "account.create");

        ResponseEntity<JsonNode> resetResponse = restTemplate.exchange(
                "/api/auth/reset-password",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "user_id", targetUserId,
                        "new_password", "ResetPass!123"), authHeaders(lowPrivilegeToken, "password-reset-denied-trace-001")),
                JsonNode.class);

        assertThat(resetResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(resetResponse.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
    }

    private Long createLoginReadyUser(String username) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "pwd-" + username,
                "密码测试部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "pwd_role_" + username,
                "密码测试角色",
                "密码测试角色"));
        Long permissionId = identityService.findPermissionIdByCode("account.create");
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "密码用户",
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
        return userId;
    }

    private String createAndLoginUserWithPermission(String username, String permissionCode) {
        Long userId = createLoginReadyUser(username, permissionCode);
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");
        return login(username, "S3cure!123");
    }

    private Long createLoginReadyUser(String username, String permissionCode) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "pwd-" + username,
                "密码测试部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "pwd_role_" + username,
                "密码测试角色",
                "密码测试角色"));
        Long permissionId = identityService.findPermissionIdByCode(permissionCode);
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "密码用户",
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
        return userId;
    }

    private String login(String username, String password) {
        return loginResponse(username, password).getBody().path("data").path("access_token").asText();
    }

    private HttpJsonResponse loginResponse(String username, String password) {
        try {
            HttpResponse<String> response = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder()
                            .uri(URI.create("http://localhost:" + port + "/api/auth/login"))
                            .header("Content-Type", "application/json")
                            .header("X-Trace-Id", "password-login-trace-001")
                            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(Map.of(
                                    "username", username,
                                    "password", password))))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            return new HttpJsonResponse(response.statusCode(), objectMapper.readTree(response.body()));
        } catch (Exception exception) {
            throw new IllegalStateException("Login request failed", exception);
        }
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

    private record HttpJsonResponse(int status, JsonNode body) {

        HttpStatus getStatusCode() {
            return HttpStatus.valueOf(status);
        }

        JsonNode getBody() {
            return body;
        }
    }
}
