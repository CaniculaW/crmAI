package com.canicula.crmai.system;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "crm.seed.v1-demo.enabled=true")
class V1DemoDataSeederTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private V1DemoDataSeeder seeder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void seedsDemoAdminWithPermissionsAndGlobalDataScope() {
        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", "demo_admin",
                        "password", "S3cure!123"), traceHeaders("demo-admin-login-trace")),
                JsonNode.class);

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode user = loginResponse.getBody().path("data").path("user");
        assertThat(user.path("permissions")).anySatisfy(permission ->
                assertThat(permission.asText()).isEqualTo("system.user.manage"));
        assertThat(user.path("permissions")).anySatisfy(permission ->
                assertThat(permission.asText()).isEqualTo("account.read"));

        String accessToken = loginResponse.getBody().path("data").path("access_token").asText();
        ResponseEntity<JsonNode> usersResponse = restTemplate.exchange(
                "/api/system/users",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "demo-admin-users-trace")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountsResponse = restTemplate.exchange(
                "/api/accounts",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "demo-admin-accounts-trace")),
                JsonNode.class);
        ResponseEntity<JsonNode> bootstrapResponse = restTemplate.exchange(
                "/api/bootstrap",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "demo-admin-bootstrap-trace")),
                JsonNode.class);

        assertThat(usersResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(usersResponse.getBody().path("data")).anySatisfy(seedUser ->
                assertThat(seedUser.path("email").asText()).isEqualTo("demo_admin@example.com"));
        assertThat(accountsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(bootstrapResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode bootstrap = bootstrapResponse.getBody().path("data");
        assertThat(bootstrap.path("user").path("email").asText()).isEqualTo("demo_admin@example.com");
        assertThat(bootstrap.path("permissions_count").asInt()).isGreaterThanOrEqualTo(25);
        assertThat(bootstrap.path("v1_counts").path("departments").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(bootstrap.path("v1_counts").path("users").asInt()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void bootstrapRequiresSystemUserManagePermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "bootstrap_limited_" + suffix;
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "bootstrap-limited-dept-" + suffix,
                "Bootstrap受限用户部门",
                "CN-31",
                "active"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "Bootstrap受限用户",
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
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");
        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("bootstrap-limited-login-trace")),
                JsonNode.class);

        String accessToken = loginResponse.getBody().path("data").path("access_token").asText();
        ResponseEntity<JsonNode> bootstrapResponse = restTemplate.exchange(
                "/api/bootstrap",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(accessToken, "bootstrap-limited-trace")),
                JsonNode.class);

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(bootstrapResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void refusesToRunWhenProdProfileIsActive() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        V1DemoDataSeeder prodSeeder = new V1DemoDataSeeder(null, null, environment);

        assertThatThrownBy(() -> prodSeeder.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("must not run with prod profile");
    }

    @Test
    @DirtiesContext(methodMode = DirtiesContext.MethodMode.AFTER_METHOD)
    void failsFastWhenDemoLoginBelongsToAnotherUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "demo-conflict-dept-" + suffix,
                "Demo冲突用户部门",
                "CN-31",
                "active"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "Demo冲突用户",
                null,
                "demo-conflict-" + suffix + "@example.com",
                "sales_rep",
                "active"));
        jdbcTemplate.update(
                """
                update sys_login_accounts
                set user_id = ?,
                    status = 'active',
                    updated_at = current_timestamp
                where login_type = 'username'
                  and login_identifier = ?
                """,
                userId,
                V1DemoDataSeeder.DEMO_ADMIN_USERNAME);

        assertThatThrownBy(() -> seeder.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("belongs to a different user");
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
