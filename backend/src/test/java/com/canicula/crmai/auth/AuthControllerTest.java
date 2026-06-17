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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @LocalServerPort
    private int port;

    @Test
    void logsInReadsCurrentUserAndLogsOut() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long userId = createLoginReadyUser("auth_user_" + suffix, "auth_" + suffix + "@example.com");
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");

        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", "auth_user_" + suffix,
                        "password", "S3cure!123"), traceHeaders("auth-login-trace-001")),
                JsonNode.class);

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode loginData = loginResponse.getBody().path("data");
        String accessToken = loginData.path("access_token").asText();
        assertThat(accessToken).isNotBlank();
        assertThat(loginData.path("token_type").asText()).isEqualTo("Bearer");
        assertThat(loginData.path("user").path("name").asText()).isEqualTo("认证用户");

        ResponseEntity<JsonNode> meResponse = restTemplate.exchange(
                "/api/auth/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "auth-me-trace-001")),
                JsonNode.class);

        assertThat(meResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode meData = meResponse.getBody().path("data");
        assertThat(meData.path("id").asLong()).isEqualTo(userId);
        assertThat(meData.path("roles")).anySatisfy(role ->
                assertThat(role.path("code").asText()).startsWith("sales_rep_auth_user_"));
        assertThat(meData.path("permissions")).anySatisfy(permission ->
                assertThat(permission.asText()).isEqualTo("account.create"));

        ResponseEntity<JsonNode> logoutResponse = restTemplate.exchange(
                "/api/auth/logout",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(), authHeaders(accessToken, "auth-logout-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> revokedMeResponse = restTemplate.exchange(
                "/api/auth/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "auth-me-revoked-trace-001")),
                JsonNode.class);

        assertThat(logoutResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(revokedMeResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(revokedMeResponse.getBody().path("code").asText()).isEqualTo("UNAUTHORIZED");
    }

    @Test
    void rejectsBadPasswordAndInactiveLoginAccount() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long userId = createLoginReadyUser("inactive_user_" + suffix, "inactive_" + suffix + "@example.com");
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");

        HttpJsonResponse badPasswordResponse = postJson(
                "/api/auth/login",
                Map.of(
                        "username", "inactive_user_" + suffix,
                        "password", "wrong"),
                "auth-bad-password-trace-001");
        identityService.updateLoginAccountStatus("username", "inactive_user_" + suffix, "disabled");
        HttpJsonResponse inactiveResponse = postJson(
                "/api/auth/login",
                Map.of(
                        "username", "inactive_user_" + suffix,
                        "password", "S3cure!123"),
                "auth-inactive-trace-001");

        assertThat(badPasswordResponse.status()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(badPasswordResponse.body().path("code").asText()).isEqualTo("UNAUTHORIZED");
        assertThat(inactiveResponse.status()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(inactiveResponse.body().path("code").asText()).isEqualTo("UNAUTHORIZED");
    }

    private Long createLoginReadyUser(String username, String email) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "auth-" + username,
                "认证测试部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "sales_rep_" + username,
                "销售个人",
                "认证测试角色"));
        Long permissionId = identityService.findPermissionIdByCode("account.create");
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "认证用户",
                null,
                email,
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

    private HttpJsonResponse postJson(String path, Map<String, String> body, String traceId) throws Exception {
        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + port + path))
                        .header("Content-Type", "application/json")
                        .header("X-Trace-Id", traceId)
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        return new HttpJsonResponse(response.statusCode(), objectMapper.readTree(response.body()));
    }

    private record HttpJsonResponse(int status, JsonNode body) {
    }
}
