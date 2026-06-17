package com.canicula.crmai.account;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
class AccountControllerTest {

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
    void createsAccountWithCollaboratorsAndReadsDetail() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("account-owner-dept-" + suffix);
        Long ownerUserId = createLoginReadyUser(
                "account_owner_" + suffix,
                departmentId,
                List.of("account.create", "account.read"),
                List.of("global"));
        Long collaboratorUserId = createLoginReadyUser(
                "account_collab_" + suffix,
                departmentId,
                List.of("account.read"),
                List.of("collaborated"));
        String token = login("account_owner_" + suffix);
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_name", "测试客户-" + suffix);
        request.put("account_short_name", "客户-" + suffix);
        request.put("account_type", "enterprise");
        request.put("account_level", "A");
        request.put("account_status", "following");
        request.put("account_source", "self_developed");
        request.put("industry", "制造业");
        request.put("region_province", "上海");
        request.put("region_city", "上海");
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("background", "重点项目型客户");
        request.put("collaborators", List.of(Map.of(
                "user_id", collaboratorUserId,
                "collaborator_role", "presales")));

        ResponseEntity<JsonNode> createResponse = restTemplate.exchange(
                "/api/accounts",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(token, "account-create-trace-001")),
                JsonNode.class);
        Long accountId = createResponse.getBody().path("data").path("id").asLong();
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/accounts/" + accountId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "account-detail-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'account.create' and object_id = ?",
                Integer.class,
                accountId);

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode created = createResponse.getBody().path("data");
        assertThat(created.path("account_name").asText()).isEqualTo("测试客户-" + suffix);
        assertThat(created.path("owner_user_id").asLong()).isEqualTo(ownerUserId);
        assertThat(created.path("collaborators")).anySatisfy(collaborator -> {
            assertThat(collaborator.path("user_id").asLong()).isEqualTo(collaboratorUserId);
            assertThat(collaborator.path("collaborator_role").asText()).isEqualTo("presales");
        });
        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(detailResponse.getBody().path("data").path("id").asLong()).isEqualTo(accountId);
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void listsOnlyOwnAndCollaboratedAccountsByDataPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("account-list-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "account_list_creator_" + suffix,
                departmentId,
                List.of("account.create"),
                List.of("global"));
        Long viewerUserId = createLoginReadyUser(
                "account_list_viewer_" + suffix,
                departmentId,
                List.of("account.read"),
                List.of("own", "collaborated"));
        Long otherUserId = createLoginReadyUser(
                "account_list_other_" + suffix,
                departmentId,
                List.of("account.read"),
                List.of("own"));
        String creatorToken = login("account_list_creator_" + suffix);
        String viewerToken = login("account_list_viewer_" + suffix);

        createAccount(
                creatorToken,
                "本人客户-" + suffix,
                departmentId,
                viewerUserId,
                List.of());
        createAccount(
                creatorToken,
                "协同客户-" + suffix,
                departmentId,
                otherUserId,
                List.of(Map.of(
                        "user_id", viewerUserId,
                        "collaborator_role", "presales")));
        createAccount(
                creatorToken,
                "不可见客户-" + suffix,
                departmentId,
                otherUserId,
                List.of());

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/accounts",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "account-list-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(account ->
                assertThat(account.path("account_name").asText()).isEqualTo("本人客户-" + suffix));
        assertThat(listResponse.getBody().path("data")).anySatisfy(account ->
                assertThat(account.path("account_name").asText()).isEqualTo("协同客户-" + suffix));
        assertThat(listResponse.getBody().path("data")).noneSatisfy(account ->
                assertThat(account.path("account_name").asText()).isEqualTo("不可见客户-" + suffix));
    }

    @Test
    void updatesAccountAndRecordsAuditLog() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("account-update-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "account_update_" + suffix,
                departmentId,
                List.of("account.create", "account.read", "account.update"),
                List.of("global"));
        String token = login("account_update_" + suffix);
        Long accountId = createAccount(
                token,
                "待更新客户-" + suffix,
                departmentId,
                userId,
                List.of());

        HttpJsonResponse updateResponse = patchJson(
                "/api/accounts/" + accountId,
                Map.of(
                        "account_level", "B",
                        "account_status", "cooperating",
                        "remark", "已进入合作阶段"),
                authHeaders(token, "account-update-trace-001"));
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'account.update' and object_id = ?",
                Integer.class,
                accountId);

        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode updated = updateResponse.body().path("data");
        assertThat(updated.path("account_level").asText()).isEqualTo("B");
        assertThat(updated.path("account_status").asText()).isEqualTo("cooperating");
        assertThat(updated.path("remark").asText()).isEqualTo("已进入合作阶段");
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void filtersAccountsByKeywordAndStatus() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("account-filter-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "account_filter_" + suffix,
                departmentId,
                List.of("account.create", "account.read"),
                List.of("global"));
        String token = login("account_filter_" + suffix);
        createAccount(
                token,
                "筛选目标客户-" + suffix,
                "following",
                departmentId,
                userId,
                List.of());
        createAccount(
                token,
                "筛选其他客户-" + suffix,
                "paused",
                departmentId,
                userId,
                List.of());

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/accounts?keyword=目标&account_status=following",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "account-filter-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(account ->
                assertThat(account.path("account_name").asText()).isEqualTo("筛选目标客户-" + suffix));
        assertThat(listResponse.getBody().path("data")).noneSatisfy(account ->
                assertThat(account.path("account_name").asText()).isEqualTo("筛选其他客户-" + suffix));
    }

    private Long createAccount(
            String accessToken,
            String accountName,
            Long departmentId,
            Long ownerUserId,
            List<Map<String, Object>> collaborators) {
        return createAccount(accessToken, accountName, "following", departmentId, ownerUserId, collaborators);
    }

    private Long createAccount(
            String accessToken,
            String accountName,
            String accountStatus,
            Long departmentId,
            Long ownerUserId,
            List<Map<String, Object>> collaborators) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_name", accountName);
        request.put("account_type", "enterprise");
        request.put("account_status", accountStatus);
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("collaborators", collaborators);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/accounts",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "account-helper-create-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "客户测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "account_role_" + username,
                "客户测试角色",
                "客户测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "客户测试用户",
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
        dataScopes.forEach(scope -> grantDataScope(roleId, "account", scope));
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
                        "password", "S3cure!123"), traceHeaders("account-login-trace-001")),
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

    private HttpJsonResponse patchJson(String path, Map<String, String> body, HttpHeaders headers) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:" + port + path))
                    .header("Content-Type", "application/json")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
            headers.forEach((name, values) -> values.forEach(value -> builder.header(name, value)));
            HttpResponse<String> response = HttpClient.newHttpClient().send(
                    builder.build(),
                    HttpResponse.BodyHandlers.ofString());
            return new HttpJsonResponse(response.statusCode(), objectMapper.readTree(response.body()));
        } catch (Exception exception) {
            throw new IllegalStateException("PATCH request failed", exception);
        }
    }

    private record HttpJsonResponse(int status, JsonNode body) {
    }
}
