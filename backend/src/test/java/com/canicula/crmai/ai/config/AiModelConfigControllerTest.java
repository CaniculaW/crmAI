package com.canicula.crmai.ai.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.AfterEach;
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
class AiModelConfigControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private HttpServer mockOpenAiServer;
    private volatile String capturedAuthorization;

    @AfterEach
    void stopMockOpenAiServer() {
        if (mockOpenAiServer != null) {
            mockOpenAiServer.stop(0);
        }
    }

    @Test
    void createsListsUpdatesAndMasksOpenAiModelConfigs() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String token = createAndLoginUser("ai_config_mgr_" + suffix, "system.ai-config.manage");

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/system/ai-model-configs",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "provider", "openai",
                        "base_url", "https://api.openai.com/v1",
                        "model_name", "gpt-4.1-mini",
                        "api_key", "sk-test-" + suffix + "-abcdef",
                        "enabled", true), authHeaders(token, "ai-config-create-trace-001")),
                JsonNode.class);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode created = createResponse.getBody().path("data");
        Long configId = created.path("id").asLong();
        assertThat(created.path("provider").asText()).isEqualTo("openai");
        assertThat(created.path("base_url").asText()).isEqualTo("https://api.openai.com/v1");
        assertThat(created.path("model_name").asText()).isEqualTo("gpt-4.1-mini");
        assertThat(created.path("api_key_masked").asText()).startsWith("sk-t").contains("...");
        assertThat(created.has("api_key")).isFalse();
        assertThat(created.path("enabled").asBoolean()).isTrue();

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/system/ai-model-configs",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "ai-config-list-trace-001")),
                JsonNode.class);
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(config ->
                assertThat(config.path("id").asLong()).isEqualTo(configId));

        ResponseEntity<JsonNode> updateResponse = restTemplate.exchange(
                "/api/system/ai-model-configs/" + configId,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of(
                        "provider", "openai",
                        "base_url", "https://api.openai.com/v1/",
                        "model_name", "gpt-4.1",
                        "enabled", false), authHeaders(token, "ai-config-update-trace-001")),
                JsonNode.class);
        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResponse.getBody().path("data").path("base_url").asText())
                .isEqualTo("https://api.openai.com/v1");
        assertThat(updateResponse.getBody().path("data").path("model_name").asText()).isEqualTo("gpt-4.1");
        assertThat(updateResponse.getBody().path("data").path("api_key_masked").asText())
                .isEqualTo(created.path("api_key_masked").asText());
        assertThat(updateResponse.getBody().path("data").path("enabled").asBoolean()).isFalse();

        assertThat(auditCount("system.ai_config.create", configId)).isEqualTo(1);
        assertThat(auditCount("system.ai_config.update", configId)).isEqualTo(1);
    }

    @Test
    void keepsOnlyOneEnabledOpenAiModelConfig() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String token = createAndLoginUser("ai_single_mgr_" + suffix, "system.ai-config.manage");

        Long firstId = createConfig(token, "ai-single-first-" + suffix, true);
        Long secondId = createConfig(token, "ai-single-second-" + suffix, true);

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/system/ai-model-configs",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "ai-config-single-list-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(enabledValue(listResponse.getBody(), firstId)).isFalse();
        assertThat(enabledValue(listResponse.getBody(), secondId)).isTrue();
    }

    @Test
    void testsConnectionWithoutReturningApiKey() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        startMockOpenAiServer("/v1/models/gpt-test-model", 200, "{\"id\":\"gpt-test-model\",\"object\":\"model\"}");
        String token = createAndLoginUser("ai_test_mgr_" + suffix, "system.ai-config.manage");
        Long configId = createConfigWithBaseUrl(
                token,
                "gpt-test-model",
                "secret-test-key-" + suffix,
                "http://127.0.0.1:" + mockOpenAiServer.getAddress().getPort() + "/v1",
                true);

        ResponseEntity<JsonNode> testResponse = restTemplate.exchange(
                "/api/system/ai-model-configs/" + configId + "/test",
                HttpMethod.POST,
                new HttpEntity<>(authHeaders(token, "ai-config-test-trace-001")),
                JsonNode.class);

        assertThat(testResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode tested = testResponse.getBody().path("data");
        assertThat(tested.path("last_test_status").asText()).isEqualTo("success");
        assertThat(tested.path("last_test_message").asText()).contains("gpt-test-model");
        assertThat(tested.has("api_key")).isFalse();
        assertThat(capturedAuthorization).isEqualTo("Bearer secret-test-key-" + suffix);
        assertThat(auditCount("system.ai_config.test", configId)).isEqualTo(1);
    }

    @Test
    void requiresAiConfigManagePermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String lowToken = createAndLoginUser("ai_config_low_" + suffix, "account.read");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/system/ai-model-configs",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(lowToken, "ai-config-low-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().path("code").asText()).isEqualTo("FORBIDDEN");
    }

    private Long createConfig(String token, String modelName, boolean enabled) {
        return createConfigWithBaseUrl(token, modelName, "sk-test-default-key", "https://api.openai.com/v1", enabled);
    }

    private Long createConfigWithBaseUrl(
            String token,
            String modelName,
            String apiKey,
            String baseUrl,
            boolean enabled) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/system/ai-model-configs",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "provider", "openai",
                        "base_url", baseUrl,
                        "model_name", modelName,
                        "api_key", apiKey,
                        "enabled", enabled), authHeaders(token, "ai-config-create-helper-trace")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private boolean enabledValue(JsonNode body, Long configId) {
        for (JsonNode config : body.path("data")) {
            if (config.path("id").asLong() == configId) {
                return config.path("enabled").asBoolean();
            }
        }
        throw new AssertionError("Config not found: " + configId);
    }

    private void startMockOpenAiServer(String expectedPath, int statusCode, String body) throws IOException {
        mockOpenAiServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        mockOpenAiServer.createContext(expectedPath, exchange -> {
            capturedAuthorization = exchange.getRequestHeaders().getFirst("Authorization");
            byte[] payload = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(statusCode, payload.length);
            exchange.getResponseBody().write(payload);
            exchange.close();
        });
        mockOpenAiServer.setExecutor(Executors.newSingleThreadExecutor());
        mockOpenAiServer.start();
    }

    private String createAndLoginUser(String username, String permissionCode) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "ai-config-" + username,
                "AI配置测试部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "ai_config_role_" + username,
                "AI配置角色",
                "AI配置角色"));
        Long permissionId = identityService.findPermissionIdByCode(permissionCode);
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "AI配置用户",
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
                        "password", "S3cure!123"), traceHeaders("ai-config-login-trace-001")),
                JsonNode.class);
        return loginResponse.getBody().path("data").path("access_token").asText();
    }

    private Integer auditCount(String actionCode, Long objectId) {
        return jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_audit_logs
                where action_code = ?
                  and object_type = 'sys_ai_model_config'
                  and object_id = ?
                """,
                Integer.class,
                actionCode,
                objectId);
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
