package com.canicula.crmai.contact;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
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
class ContactControllerTest {

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
    void createsContactWithProjectRolesAndReadsFromAccount() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("contact-create-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "contact_create_" + suffix,
                departmentId,
                List.of("account.create", "account.read", "contact.create", "contact.read"),
                List.of("global"));
        String token = login("contact_create_" + suffix);
        Long accountId = createAccount(token, "联系人客户-" + suffix, departmentId, userId);

        Long contactId = createContact(
                token,
                accountId,
                "张联系人-" + suffix,
                "decision_maker",
                "supporter",
                List.of("technical_gatekeeper", "budget_promoter"));
        ResponseEntity<JsonNode> detailResponse = restTemplate.exchange(
                "/api/contacts/" + contactId,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "contact-detail-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountContactsResponse = restTemplate.exchange(
                "/api/accounts/" + accountId + "/contacts",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(token, "account-contacts-trace-001")),
                JsonNode.class);
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'contact.create' and object_id = ?",
                Integer.class,
                contactId);

        assertThat(detailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode detail = detailResponse.getBody().path("data");
        assertThat(detail.path("name").asText()).isEqualTo("张联系人-" + suffix);
        assertThat(detail.path("account_id").asLong()).isEqualTo(accountId);
        assertThat(detail.path("project_roles")).anySatisfy(role ->
                assertThat(role.asText()).isEqualTo("technical_gatekeeper"));
        assertThat(accountContactsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accountContactsResponse.getBody().path("data")).anySatisfy(contact ->
                assertThat(contact.path("id").asLong()).isEqualTo(contactId));
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void listsContactsByInheritedDataPermissionAndFilters() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("contact-list-dept-" + suffix);
        Long creatorUserId = createLoginReadyUser(
                "contact_list_creator_" + suffix,
                departmentId,
                List.of("account.create", "contact.create"),
                List.of("global"));
        Long viewerUserId = createLoginReadyUser(
                "contact_list_viewer_" + suffix,
                departmentId,
                List.of("contact.read"),
                List.of("own"));
        Long otherUserId = createLoginReadyUser(
                "contact_list_other_" + suffix,
                departmentId,
                List.of("contact.read"),
                List.of("own"));
        String creatorToken = login("contact_list_creator_" + suffix);
        String viewerToken = login("contact_list_viewer_" + suffix);
        Long visibleAccountId = createAccount(
                creatorToken,
                "可见联系人客户-" + suffix,
                departmentId,
                viewerUserId);
        Long otherAccountId = createAccount(
                creatorToken,
                "不可见联系人客户-" + suffix,
                departmentId,
                otherUserId);

        createContact(
                creatorToken,
                visibleAccountId,
                "筛选目标联系人-" + suffix,
                "decision_maker",
                "supporter",
                List.of("budget_promoter"));
        createContact(
                creatorToken,
                visibleAccountId,
                "筛选其他类型联系人-" + suffix,
                "technical",
                "supporter",
                List.of("technical_gatekeeper"));
        createContact(
                creatorToken,
                otherAccountId,
                "无权联系人-" + suffix,
                "decision_maker",
                "supporter",
                List.of("budget_promoter"));

        ResponseEntity<JsonNode> listResponse = restTemplate.exchange(
                "/api/contacts?account_id=" + visibleAccountId + "&contact_type=decision_maker&attitude=supporter",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(viewerToken, "contact-list-trace-001")),
                JsonNode.class);

        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listResponse.getBody().path("data")).anySatisfy(contact ->
                assertThat(contact.path("name").asText()).isEqualTo("筛选目标联系人-" + suffix));
        assertThat(listResponse.getBody().path("data")).noneSatisfy(contact ->
                assertThat(contact.path("name").asText()).isEqualTo("筛选其他类型联系人-" + suffix));
        assertThat(listResponse.getBody().path("data")).noneSatisfy(contact ->
                assertThat(contact.path("name").asText()).isEqualTo("无权联系人-" + suffix));
    }

    @Test
    void updatesContactRelationshipFieldsAndRecordsAuditLog() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("contact-update-dept-" + suffix);
        Long userId = createLoginReadyUser(
                "contact_update_" + suffix,
                departmentId,
                List.of("account.create", "contact.create", "contact.read", "contact.update"),
                List.of("global"));
        String token = login("contact_update_" + suffix);
        Long accountId = createAccount(token, "待更新联系人客户-" + suffix, departmentId, userId);
        Long contactId = createContact(
                token,
                accountId,
                "待更新联系人-" + suffix,
                "influencer",
                "neutral",
                List.of("technical_gatekeeper"));

        HttpJsonResponse updateResponse = patchJson(
                "/api/contacts/" + contactId,
                Map.of(
                        "decision_influence", "high",
                        "attitude", "supporter",
                        "relationship_heat", "key",
                        "importance_level", "core",
                        "project_roles", List.of("procurement_executor")),
                authHeaders(token, "contact-update-trace-001"));
        Integer auditCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_audit_logs where action_code = 'contact.update' and object_id = ?",
                Integer.class,
                contactId);

        assertThat(updateResponse.status()).isEqualTo(HttpStatus.OK.value());
        JsonNode updated = updateResponse.body().path("data");
        assertThat(updated.path("decision_influence").asText()).isEqualTo("high");
        assertThat(updated.path("attitude").asText()).isEqualTo("supporter");
        assertThat(updated.path("relationship_heat").asText()).isEqualTo("key");
        assertThat(updated.path("importance_level").asText()).isEqualTo("core");
        assertThat(updated.path("project_roles")).anySatisfy(role ->
                assertThat(role.asText()).isEqualTo("procurement_executor"));
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void mapsJdbcTimestampContactCommunicationTime() {
        Timestamp jdbcTimestamp = Timestamp.from(Instant.parse("2026-06-22T09:30:00Z"));

        assertThat(invokeNullableOffsetDateTime(jdbcTimestamp))
                .isNotNull()
                .satisfies(value -> assertThat(value.toInstant()).isEqualTo(jdbcTimestamp.toInstant()));
    }

    private static OffsetDateTime invokeNullableOffsetDateTime(Object value) {
        try {
            Method method = ContactService.class.getDeclaredMethod("nullableOffsetDateTime", Object.class);
            method.setAccessible(true);
            return (OffsetDateTime) method.invoke(null, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException("Contact timestamp mapper invocation failed", exception);
        }
    }

    private Long createAccount(String accessToken, String accountName, Long departmentId, Long ownerUserId) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_name", accountName);
        request.put("account_type", "enterprise");
        request.put("account_status", "following");
        request.put("owner_department_id", departmentId);
        request.put("owner_user_id", ownerUserId);
        request.put("collaborators", List.of());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/accounts",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "contact-helper-account-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createContact(
            String accessToken,
            Long accountId,
            String name,
            String contactType,
            String attitude,
            List<String> projectRoles) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("account_id", accountId);
        request.put("name", name);
        request.put("department", "信息化中心");
        request.put("title", "负责人");
        request.put("mobile", "138" + UUID.randomUUID().toString().replace("-", "").substring(0, 8));
        request.put("contact_type", contactType);
        request.put("decision_influence", "medium");
        request.put("attitude", attitude);
        request.put("relationship_heat", "familiar");
        request.put("importance_level", "important");
        request.put("project_roles", projectRoles);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/contacts",
                HttpMethod.POST,
                new HttpEntity<>(request, authHeaders(accessToken, "contact-helper-create-trace-001")),
                JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().path("data").path("id").asLong();
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "联系人测试部",
                "CN-31",
                "active"));
    }

    private Long createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "contact_role_" + username,
                "联系人测试角色",
                "联系人测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "联系人测试用户",
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
        dataScopes.forEach(scope -> {
            grantDataScope(roleId, "account", scope);
            grantDataScope(roleId, "contact", scope);
        });
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
                        "password", "S3cure!123"), traceHeaders("contact-login-trace-001")),
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

    private HttpJsonResponse patchJson(String path, Map<String, Object> body, HttpHeaders headers) {
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
