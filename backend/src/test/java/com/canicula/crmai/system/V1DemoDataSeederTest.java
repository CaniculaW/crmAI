package com.canicula.crmai.system;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
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
