package com.canicula.crmai.system;

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
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DictionaryControllerTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @LocalServerPort
    private int port;

    @Test
    void returnsActiveDictionaryItemsByCode() {
        HttpHeaders headers = traceHeaders("dict-query-trace-001");
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/system/dicts?dict_code=account_type",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getFirst("X-Trace-Id")).isEqualTo("dict-query-trace-001");
        JsonNode body = response.getBody();
        assertThat(body.path("code").asText()).isEqualTo("OK");
        assertThat(body.path("trace_id").asText()).isEqualTo("dict-query-trace-001");
        JsonNode accountType = body.path("data").path(0);
        assertThat(accountType.path("dict_code").asText()).isEqualTo("account_type");
        assertThat(accountType.path("items")).anySatisfy(item ->
                assertThat(item.path("item_code").asText()).isEqualTo("enterprise"));
    }

    @Test
    void createsAndDisablesDictionaryItems() throws Exception {
        String token = createAndLoginUser(
                "dict_manage_" + UUID.randomUUID().toString().substring(0, 8),
                "system.dict.manage");
        HttpHeaders headers = authHeaders(token, "dict-manage-trace-001");
        ResponseEntity<JsonNode> typeResponse = restTemplate.exchange(
                "/api/system/dicts/types",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "dict_code", "sales_channel",
                        "dict_name", "销售渠道",
                        "description", "测试字典"), headers),
                JsonNode.class);
        Long dictTypeId = typeResponse.getBody().path("data").path("id").asLong();

        ResponseEntity<JsonNode> itemResponse = restTemplate.exchange(
                "/api/system/dicts/types/" + dictTypeId + "/items",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "item_code", "partner",
                        "item_name", "合作伙伴",
                        "sort_order", 10), headers),
                JsonNode.class);
        Long itemId = itemResponse.getBody().path("data").path("id").asLong();

        HttpResponse<String> disabledResponse = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + port + "/api/system/dicts/items/" + itemId))
                        .header("Content-Type", "application/json")
                        .header("X-Trace-Id", "dict-manage-trace-001")
                        .header("Authorization", "Bearer " + token)
                        .method("PATCH", HttpRequest.BodyPublishers.ofString(
                                objectMapper.writeValueAsString(Map.of("is_active", false))))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        ResponseEntity<JsonNode> activeOnlyResponse = restTemplate.exchange(
                "/api/system/dicts?dict_code=sales_channel",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class);
        ResponseEntity<JsonNode> includeInactiveResponse = restTemplate.exchange(
                "/api/system/dicts?dict_code=sales_channel&include_inactive=true",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class);

        assertThat(typeResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(itemResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(disabledResponse.statusCode()).isEqualTo(HttpStatus.OK.value());
        assertThat(activeOnlyResponse.getBody().path("data").path(0).path("items")).isEmpty();
        assertThat(includeInactiveResponse.getBody().path("data").path(0).path("items"))
                .anySatisfy(item -> {
                    assertThat(item.path("item_code").asText()).isEqualTo("partner");
                    assertThat(item.path("is_active").asBoolean()).isFalse();
                });
        assertThat(auditCount("system.dict.type.create", "dict_type", dictTypeId)).isEqualTo(1);
        assertThat(auditCount("system.dict.item.create", "dict_item", itemId)).isEqualTo(1);
        assertThat(auditCount("system.dict.item.update", "dict_item", itemId)).isEqualTo(1);
    }

    @Test
    void requiresSystemDictManagePermissionForDictionaryManagement() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        HttpJsonResponse anonymousResponse = postJson(
                "/api/system/dicts/types",
                Map.of(
                        "dict_code", "anonymous_dict_" + suffix,
                        "dict_name", "匿名字典"),
                traceHeaders("dict-anonymous-trace-001"));

        String lowPrivilegeToken = createAndLoginUser("dict_low_" + suffix, "account.create");
        HttpJsonResponse lowPrivilegeResponse = postJson(
                "/api/system/dicts/types",
                Map.of(
                        "dict_code", "low_privilege_dict_" + suffix,
                        "dict_name", "低权限字典"),
                authHeaders(lowPrivilegeToken, "dict-low-privilege-trace-001"));

        String managerToken = createAndLoginUser("dict_manager_" + suffix, "system.dict.manage");
        ResponseEntity<JsonNode> managerResponse = restTemplate.exchange(
                "/api/system/dicts/types",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "dict_code", "manager_dict_" + suffix,
                        "dict_name", "管理员字典"), authHeaders(managerToken, "dict-manager-trace-001")),
                JsonNode.class);

        assertThat(anonymousResponse.status()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(anonymousResponse.body().path("code").asText()).isEqualTo("UNAUTHORIZED");
        assertThat(lowPrivilegeResponse.status()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(lowPrivilegeResponse.body().path("code").asText()).isEqualTo("FORBIDDEN");
        assertThat(managerResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(managerResponse.getBody().path("data").path("dict_code").asText())
                .isEqualTo("manager_dict_" + suffix);
    }

    private String createAndLoginUser(String username, String permissionCode) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "dict-" + username,
                "字典权限测试部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "dict_role_" + username,
                "字典权限角色",
                "字典权限角色"));
        Long permissionId = identityService.findPermissionIdByCode(permissionCode);
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "字典权限用户",
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
                        "password", "S3cure!123"), traceHeaders("dict-login-trace-001")),
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

    private HttpJsonResponse postJson(String path, Map<String, String> body, HttpHeaders headers) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + port + path))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
            headers.forEach((name, values) -> values.forEach(value -> builder.header(name, value)));
            HttpResponse<String> response = HttpClient.newHttpClient().send(
                    builder.build(),
                    HttpResponse.BodyHandlers.ofString());
            return new HttpJsonResponse(response.statusCode(), objectMapper.readTree(response.body()));
        } catch (Exception exception) {
            throw new IllegalStateException("JSON request failed", exception);
        }
    }

    private Integer auditCount(String actionCode, String objectType, Long objectId) {
        return jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_audit_logs
                where action_code = ?
                  and object_type = ?
                  and object_id = ?
                """,
                Integer.class,
                actionCode,
                objectType,
                objectId);
    }

    private record HttpJsonResponse(int status, JsonNode body) {
    }
}
