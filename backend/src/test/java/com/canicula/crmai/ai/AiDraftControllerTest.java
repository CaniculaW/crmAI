package com.canicula.crmai.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.account.AccountCreateRequest;
import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.activity.ActivityCreateRequest;
import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.canicula.crmai.opportunity.OpportunityCreateRequest;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.opportunity.OpportunityService;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AiDraftControllerTest {

    private static final String PASSWORD = "S3cure!123";

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private OpportunityService opportunityService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void parsesTextIntoConfirmableDraftsWithoutWritingCrmData() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-draft-parse-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_draft_parse_" + suffix,
                departmentId,
                List.of(
                        "ai.draft.manage",
                        "account.create",
                        "account.read",
                        "contact.create",
                        "contact.read",
                        "opportunity.create",
                        "opportunity.read",
                        "activity.create",
                        "activity.read"),
                List.of("account", "contact", "opportunity", "activity"),
                List.of("department"));
        AccountResponse existingAccount = createAccount("AI草稿既有客户-" + suffix, departmentId, user.userId());
        OpportunityResponse existingOpportunity = createOpportunity(
                existingAccount.id(),
                "AI草稿既有商机-" + suffix,
                departmentId,
                user.userId());
        String sourceText = """
                客户：AI草稿新客户-%s，行业：制造业，地区：上海，需求：希望提升销售预测透明度
                联系人：张三-%s，客户：AI草稿既有客户-%s，职务：信息化总监，手机：13800000001，态度：积极
                商机：AI草稿新增商机-%s，客户：AI草稿既有客户-%s，金额：320000，预计成交：2026-08-20，下一步：安排方案评审
                行动：AI草稿拜访-%s，客户：AI草稿既有客户-%s，商机：AI草稿既有商机-%s，时间：2026-07-07T10:00:00+08:00，内容：确认试点范围，反馈：客户关注ROI
                """.formatted(suffix, suffix, suffix, suffix, suffix, suffix, suffix, suffix);

        ResponseEntity<JsonNode> parseResponse = restTemplate.exchange(
                "/api/ai-drafts/parse",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("source_text", sourceText), authHeaders(user.token(), "ai-draft-parse-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountListBeforeConfirm = restTemplate.exchange(
                "/api/accounts?keyword=AI草稿新客户-" + suffix,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "ai-draft-account-before-confirm-trace-001")),
                JsonNode.class);

        assertThat(parseResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode drafts = parseResponse.getBody().path("data").path("drafts");
        assertThat(drafts).hasSize(4);
        assertThat(drafts).anySatisfy(draft -> {
            assertThat(draft.path("draft_type").asText()).isEqualTo("account");
            assertThat(draft.path("status").asText()).isEqualTo("pending_confirmation");
            assertThat(draft.path("payload").path("account_name").asText()).isEqualTo("AI草稿新客户-" + suffix);
            assertThat(draft.path("missing_fields")).isEmpty();
            assertThat(draft.path("target_action").asText()).isEqualTo("create");
        });
        assertThat(drafts).anySatisfy(draft -> {
            assertThat(draft.path("draft_type").asText()).isEqualTo("contact");
            assertThat(draft.path("payload").path("account_id").asLong()).isEqualTo(existingAccount.id());
        });
        assertThat(drafts).anySatisfy(draft -> {
            assertThat(draft.path("draft_type").asText()).isEqualTo("opportunity");
            assertThat(draft.path("payload").path("stage").asText()).isEqualTo("lead");
        });
        assertThat(drafts).anySatisfy(draft -> {
            assertThat(draft.path("draft_type").asText()).isEqualTo("activity");
            assertThat(draft.path("payload").path("opportunity_id").asLong()).isEqualTo(existingOpportunity.id());
        });
        assertThat(accountListBeforeConfirm.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accountListBeforeConfirm.getBody().path("data")).isEmpty();
    }

    @Test
    void confirmsAndRejectsDraftsWithWriteLogs() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-draft-confirm-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_draft_confirm_" + suffix,
                departmentId,
                List.of(
                        "ai.draft.manage",
                        "account.create",
                        "account.read",
                        "contact.create",
                        "contact.read"),
                List.of("account", "contact"),
                List.of("department"));
        AccountResponse existingAccount = createAccount("AI草稿确认既有客户-" + suffix, departmentId, user.userId());
        String sourceText = """
                客户：AI草稿确认客户-%s，行业：软件，地区：北京，需求：建设销售过程管理
                联系人：李四-%s，客户：AI草稿确认既有客户-%s，职务：采购负责人，手机：13800000002
                """.formatted(suffix, suffix, suffix);
        JsonNode drafts = restTemplate.exchange(
                        "/api/ai-drafts/parse",
                        HttpMethod.POST,
                        new HttpEntity<>(Map.of("source_text", sourceText), authHeaders(user.token(), "ai-draft-confirm-parse-trace-001")),
                        JsonNode.class)
                .getBody()
                .path("data")
                .path("drafts");
        long accountDraftId = findDraftId(drafts, "account");
        long contactDraftId = findDraftId(drafts, "contact");

        ResponseEntity<JsonNode> confirmResponse = restTemplate.exchange(
                "/api/ai-drafts/" + accountDraftId + "/confirm",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(), authHeaders(user.token(), "ai-draft-confirm-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> rejectResponse = restTemplate.exchange(
                "/api/ai-drafts/" + contactDraftId + "/reject",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("reason", "联系人信息暂不录入"), authHeaders(user.token(), "ai-draft-reject-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountListAfterConfirm = restTemplate.exchange(
                "/api/accounts?keyword=AI草稿确认客户-" + suffix,
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "ai-draft-account-after-confirm-trace-001")),
                JsonNode.class);

        assertThat(confirmResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode confirmed = confirmResponse.getBody().path("data");
        assertThat(confirmed.path("status").asText()).isEqualTo("confirmed");
        assertThat(confirmed.path("write_object_type").asText()).isEqualTo("account");
        assertThat(confirmed.path("write_object_id").asLong()).isPositive();
        assertThat(rejectResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rejectResponse.getBody().path("data").path("status").asText()).isEqualTo("rejected");
        assertThat(accountListAfterConfirm.getBody().path("data")).anySatisfy(account ->
                assertThat(account.path("account_name").asText()).isEqualTo("AI草稿确认客户-" + suffix));
        Integer successLogCount = jdbcTemplate.queryForObject(
                "select count(*) from ai_write_logs where draft_id = ? and status = 'success'",
                Integer.class,
                accountDraftId);
        Integer rejectedLogCount = jdbcTemplate.queryForObject(
                "select count(*) from ai_write_logs where draft_id = ? and operation = 'reject' and status = 'success'",
                Integer.class,
                contactDraftId);
        assertThat(successLogCount).isEqualTo(1);
        assertThat(rejectedLogCount).isEqualTo(1);
        assertThat(existingAccount.id()).isPositive();
    }

    private static long findDraftId(JsonNode drafts, String draftType) {
        for (JsonNode draft : drafts) {
            if (draft.path("draft_type").asText().equals(draftType)) {
                return draft.path("id").asLong();
            }
        }
        throw new AssertionError("Missing draft type " + draftType);
    }

    private AccountResponse createAccount(String accountName, Long departmentId, Long userId) {
        return accountService.create(new AccountCreateRequest(
                null,
                accountName,
                accountName,
                "enterprise",
                "A",
                "following",
                "self_developed",
                "制造业",
                "上海",
                "上海",
                null,
                "warm",
                departmentId,
                userId,
                "AI草稿测试客户",
                "销售过程管理",
                null,
                List.of()), userId);
    }

    private OpportunityResponse createOpportunity(Long accountId, String opportunityName, Long departmentId, Long userId) {
        return opportunityService.create(new OpportunityCreateRequest(
                accountId,
                opportunityName,
                "lead",
                "following",
                "A",
                "self_developed",
                "AI草稿既有商机",
                BigDecimal.valueOf(300000),
                BigDecimal.valueOf(300000),
                LocalDate.now().plusDays(30),
                departmentId,
                userId,
                "normal",
                "待确认",
                "安排拜访",
                null,
                List.of(),
                List.of()), userId);
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "AI草稿测试部",
                "CN-31",
                "active"));
    }

    private TestUser createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataModules,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "ai_draft_role_" + username,
                "AI草稿测试角色",
                "AI草稿测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "AI草稿测试用户",
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
        for (String moduleCode : dataModules) {
            for (String scopeCode : dataScopes) {
                grantDataScope(roleId, moduleCode, scopeCode);
            }
        }
        passwordCredentialService.createPasswordCredential(userId, PASSWORD);
        return new TestUser(userId, login(username));
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
                        "password", PASSWORD), traceHeaders("ai-draft-login-trace-001")),
                JsonNode.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
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

    private record TestUser(Long userId, String token) {
    }
}
