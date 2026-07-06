package com.canicula.crmai.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
class V2RoleMatrixValidationTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void validatesV2RolePermissionMatrixAcrossSalesCommercialFinanceManagerAndLowPrivilegeUsers() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        MatrixUser sales = createAndLoginMatrixUser(
                "v2_sales_" + suffix,
                "V2销售角色",
                List.of(
                        "solution.read",
                        "solution.create",
                        "solution.update",
                        "contract.read",
                        "invoice.read",
                        "receivable.read",
                        "receivable.follow_up",
                        "payment.read",
                        "reconciliation.read"));
        MatrixUser commercial = createAndLoginMatrixUser(
                "v2_commercial_" + suffix,
                "V2商务法务角色",
                List.of(
                        "solution.read",
                        "solution.create",
                        "solution.update",
                        "solution.void",
                        "contract.read",
                        "contract.create",
                        "contract.update",
                        "contract.terminate",
                        "contract.milestone.manage",
                        "invoice.read",
                        "invoice.apply",
                        "receivable.read"));
        MatrixUser finance = createAndLoginMatrixUser(
                "v2_finance_" + suffix,
                "V2财务角色",
                List.of(
                        "contract.read",
                        "invoice.read",
                        "invoice.create",
                        "invoice.update",
                        "invoice.apply",
                        "invoice.issue",
                        "invoice.sign",
                        "invoice.exception",
                        "invoice.void",
                        "receivable.read",
                        "receivable.create",
                        "receivable.update",
                        "receivable.terminate",
                        "payment.read",
                        "payment.create",
                        "payment.update",
                        "payment.confirm",
                        "payment.exception",
                        "payment.refund",
                        "reconciliation.read",
                        "reconciliation.create",
                        "reconciliation.void"));
        MatrixUser manager = createAndLoginMatrixUser(
                "v2_manager_" + suffix,
                "V2管理层角色",
                List.of(
                        "solution.read",
                        "contract.read",
                        "invoice.read",
                        "receivable.read",
                        "payment.read",
                        "reconciliation.read",
                        "system.audit.read"));
        MatrixUser lowPrivilege = createAndLoginMatrixUser(
                "v2_low_" + suffix,
                "V2低权限角色",
                List.of("account.read"));

        assertCurrentUserContainsPermissions(sales, List.of("solution.create", "receivable.follow_up", "reconciliation.read"));
        assertCurrentUserContainsPermissions(commercial, List.of("contract.create", "contract.milestone.manage", "invoice.apply"));
        assertCurrentUserContainsPermissions(finance, List.of("invoice.issue", "payment.confirm", "reconciliation.create"));
        assertCurrentUserContainsPermissions(manager, List.of("system.audit.read", "reconciliation.read"));
        assertCurrentUserMissesPermissions(lowPrivilege, List.of("solution.read", "contract.read", "invoice.read", "reconciliation.read"));

        assertGetStatus(sales, "/api/solutions", HttpStatus.OK);
        assertGetStatus(sales, "/api/contracts", HttpStatus.OK);
        assertGetStatus(sales, "/api/invoices", HttpStatus.OK);
        assertGetStatus(sales, "/api/receivable-plans", HttpStatus.OK);
        assertGetStatus(sales, "/api/payments", HttpStatus.OK);
        assertGetStatus(sales, "/api/reconciliations", HttpStatus.OK);
        assertPostStatus(sales, "/api/reconciliations", Map.of(), HttpStatus.FORBIDDEN);

        assertGetStatus(commercial, "/api/contracts", HttpStatus.OK);
        assertGetStatus(commercial, "/api/invoices", HttpStatus.OK);
        assertPostStatus(commercial, "/api/payments", Map.of(), HttpStatus.FORBIDDEN);
        assertPostStatus(commercial, "/api/reconciliations", Map.of(), HttpStatus.FORBIDDEN);

        assertGetStatus(finance, "/api/invoices", HttpStatus.OK);
        assertGetStatus(finance, "/api/payments", HttpStatus.OK);
        assertGetStatus(finance, "/api/reconciliations", HttpStatus.OK);
        assertPostStatus(finance, "/api/reconciliations", Map.of(), HttpStatus.CONFLICT);

        assertGetStatus(manager, "/api/solutions", HttpStatus.OK);
        assertGetStatus(manager, "/api/reconciliations", HttpStatus.OK);
        assertGetStatus(manager, "/api/system/audit-logs?module_code=reconciliation", HttpStatus.OK);
        assertPostStatus(manager, "/api/reconciliations", Map.of(), HttpStatus.FORBIDDEN);

        List<String> protectedReadEndpoints = List.of(
                "/api/solutions",
                "/api/contracts",
                "/api/invoices",
                "/api/receivable-plans",
                "/api/payments",
                "/api/reconciliations");
        for (String endpoint : protectedReadEndpoints) {
            assertGetStatus(lowPrivilege, endpoint, HttpStatus.FORBIDDEN);
        }
    }

    private MatrixUser createAndLoginMatrixUser(String username, String roleName, List<String> permissionCodes) {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "matrix-dept-" + username,
                roleName + "部门",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "matrix_role_" + username,
                roleName,
                "V2角色矩阵验收"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                roleName + "用户",
                null,
                username + "@example.com",
                "matrix",
                "active"));
        identityService.createLoginAccount(new LoginAccountCreateRequest(
                userId,
                "username",
                username,
                true,
                "active"));
        identityService.assignRole(userId, roleId);
        new LinkedHashSet<>(permissionCodes).forEach(permissionCode ->
                identityService.grantPermission(roleId, identityService.findPermissionIdByCode(permissionCode)));
        passwordCredentialService.createPasswordCredential(userId, "S3cure!123");

        ResponseEntity<JsonNode> loginResponse = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "username", username,
                        "password", "S3cure!123"), traceHeaders("v2-role-matrix-login-" + username)),
                JsonNode.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        return new MatrixUser(username, loginResponse.getBody().path("data").path("access_token").asText());
    }

    private void assertCurrentUserContainsPermissions(MatrixUser user, List<String> expectedPermissions) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/auth/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "v2-role-matrix-me-" + user.username())),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Set<String> permissions = permissionSet(response.getBody().path("data").path("permissions"));
        assertThat(permissions).containsAll(expectedPermissions);
    }

    private void assertCurrentUserMissesPermissions(MatrixUser user, List<String> forbiddenPermissions) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/auth/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "v2-role-matrix-me-" + user.username())),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Set<String> permissions = permissionSet(response.getBody().path("data").path("permissions"));
        assertThat(permissions).doesNotContainAnyElementsOf(forbiddenPermissions);
    }

    private void assertGetStatus(MatrixUser user, String endpoint, HttpStatus expectedStatus) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                endpoint,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "v2-role-matrix-get-" + user.username())),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(expectedStatus);
    }

    private void assertPostStatus(MatrixUser user, String endpoint, Map<String, Object> body, HttpStatus expectedStatus) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
                endpoint,
                HttpMethod.POST,
                new HttpEntity<>(body, authHeaders(user.token(), "v2-role-matrix-post-" + user.username())),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(expectedStatus);
    }

    private static Set<String> permissionSet(JsonNode permissionsNode) {
        Set<String> permissions = new LinkedHashSet<>();
        permissionsNode.forEach(permission -> permissions.add(permission.asText()));
        return permissions;
    }

    private static HttpHeaders traceHeaders(String traceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Trace-Id", traceId);
        return headers;
    }

    private static HttpHeaders authHeaders(String token, String traceId) {
        HttpHeaders headers = traceHeaders(traceId);
        headers.setBearerAuth(token);
        return headers;
    }

    private record MatrixUser(String username, String token) {
    }
}
