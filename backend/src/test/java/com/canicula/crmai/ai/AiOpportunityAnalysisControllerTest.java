package com.canicula.crmai.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.account.AccountCreateRequest;
import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.activity.ActivityCreateRequest;
import com.canicula.crmai.activity.ActivityService;
import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.contact.ContactCreateRequest;
import com.canicula.crmai.contact.ContactResponse;
import com.canicula.crmai.contact.ContactService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.canicula.crmai.opportunity.OpportunityContactRelationRequest;
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
class AiOpportunityAnalysisControllerTest {

    private static final String PASSWORD = "S3cure!123";

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private ContactService contactService;

    @Autowired
    private OpportunityService opportunityService;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void generatesOpportunityAnalysisWithEvidenceWithoutWritingAction() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-oppty-generate-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_oppty_generate_" + suffix,
                departmentId,
                List.of(
                        "ai.opportunity.analyze",
                        "account.read",
                        "contact.read",
                        "opportunity.read",
                        "activity.read",
                        "activity.create"),
                List.of("account", "contact", "opportunity", "activity"),
                List.of("department"));
        SalesFixture fixture = createOpportunityFixture(suffix, departmentId, user.userId());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-opportunity-analyses/generate",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of("opportunity_id", fixture.opportunityId()),
                        authHeaders(user.token(), "ai-oppty-generate-trace-001")),
                JsonNode.class);
        Integer aiActionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from crm_sales_activities
                where source_type = 'ai_opportunity_analysis'
                  and opportunity_id = ?
                """,
                Integer.class,
                fixture.opportunityId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("status").asText()).isEqualTo("pending_confirmation");
        assertThat(data.path("opportunity_id").asLong()).isEqualTo(fixture.opportunityId());
        assertThat(data.path("opportunity_name").asText()).isEqualTo("AI商机分析-" + suffix);
        assertThat(data.path("stage_health")).anySatisfy(item ->
                assertThat(item.asText()).contains("proposal"));
        assertThat(data.path("relationship_gaps")).anySatisfy(item ->
                assertThat(item.asText()).contains("财务"));
        assertThat(data.path("risks")).anySatisfy(item ->
                assertThat(item.asText()).contains("预算审批"));
        assertThat(data.path("blockers")).anySatisfy(item ->
                assertThat(item.asText()).contains("预算审批"));
        assertThat(data.path("win_factors")).anySatisfy(item ->
                assertThat(item.asText()).contains("AI助手"));
        assertThat(data.path("next_actions")).anySatisfy(item ->
                assertThat(item.asText()).contains("财务审批人"));
        assertThat(data.path("evidence")).anySatisfy(evidence ->
                assertThat(evidence.path("drilldown_url").asText()).startsWith("/activities"));
        assertThat(aiActionCount).isZero();
    }

    @Test
    void confirmingOpportunityAnalysisWritesOnePlannedAction() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-oppty-confirm-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_oppty_confirm_" + suffix,
                departmentId,
                List.of(
                        "ai.opportunity.analyze",
                        "account.read",
                        "contact.read",
                        "opportunity.read",
                        "activity.read",
                        "activity.create"),
                List.of("account", "contact", "opportunity", "activity"),
                List.of("department"));
        SalesFixture fixture = createOpportunityFixture(suffix, departmentId, user.userId());
        JsonNode generated = restTemplate.exchange(
                        "/api/ai-opportunity-analyses/generate",
                        HttpMethod.POST,
                        new HttpEntity<>(
                                Map.of("opportunity_id", fixture.opportunityId()),
                                authHeaders(user.token(), "ai-oppty-confirm-generate-trace-001")),
                        JsonNode.class)
                .getBody()
                .path("data");
        long analysisId = generated.path("id").asLong();

        ResponseEntity<JsonNode> confirmResponse = restTemplate.exchange(
                "/api/ai-opportunity-analyses/" + analysisId + "/confirm",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(), authHeaders(user.token(), "ai-oppty-confirm-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> duplicateConfirmResponse = restTemplate.exchange(
                "/api/ai-opportunity-analyses/" + analysisId + "/confirm",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(), authHeaders(user.token(), "ai-oppty-confirm-repeat-trace-001")),
                JsonNode.class);
        JsonNode actionRows = restTemplate.exchange(
                        "/api/activities?opportunity_id=" + fixture.opportunityId(),
                        HttpMethod.GET,
                        new HttpEntity<>(authHeaders(user.token(), "ai-oppty-actions-after-confirm-trace-001")),
                        JsonNode.class)
                .getBody()
                .path("data");

        assertThat(confirmResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode confirmed = confirmResponse.getBody().path("data");
        assertThat(confirmed.path("status").asText()).isEqualTo("confirmed");
        assertThat(confirmed.path("write_activity_id").asLong()).isGreaterThan(0);
        assertThat(actionRows).anySatisfy(action -> {
            assertThat(action.path("subject").asText()).isEqualTo("AI商机分析-" + fixture.opportunityName());
            assertThat(action.path("activity_status").asText()).isEqualTo("planned");
            assertThat(action.path("source_type").asText()).isEqualTo("ai_opportunity_analysis");
            assertThat(action.path("next_plan").asText()).contains("财务审批人");
        });
        assertThat(duplicateConfirmResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Integer writeLogCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from ai_write_logs
                where operation = 'opportunity_analysis_confirm'
                  and object_type = 'activity'
                  and status = 'success'
                """,
                Integer.class);
        assertThat(writeLogCount).isEqualTo(1);
    }

    @Test
    void opportunityAnalysisRequiresPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-oppty-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_oppty_forbidden_" + suffix,
                departmentId,
                List.of("account.read", "opportunity.read", "activity.read"),
                List.of("account", "opportunity", "activity"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-opportunity-analyses/generate",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of("opportunity_id", 1),
                        authHeaders(user.token(), "ai-oppty-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private SalesFixture createOpportunityFixture(String suffix, Long departmentId, Long userId) {
        AccountResponse account = accountService.create(new AccountCreateRequest(
                null,
                "AI商机分析客户-" + suffix,
                "AI商机分析客户",
                "enterprise",
                "A",
                "following",
                "self_developed",
                "制造业",
                "上海",
                "上海",
                "上海市",
                "warm",
                departmentId,
                userId,
                "集团正在推进销售数字化",
                "希望用AI助手提升销售推进质量",
                "AI商机分析测试客户",
                List.of()), userId);
        ContactResponse decisionMaker = contactService.create(new ContactCreateRequest(
                account.id(),
                "业务负责人-" + suffix,
                "销售运营部",
                "总监",
                "13900000000",
                "decision@example.com",
                null,
                "decision_maker",
                "high",
                "positive",
                "warm",
                "A",
                null,
                null,
                "认可AI助手价值",
                "安排试点评审",
                "关键业务负责人",
                List.of("决策人")), userId);
        OpportunityResponse opportunity = opportunityService.create(new OpportunityCreateRequest(
                account.id(),
                "AI商机分析-" + suffix,
                "proposal",
                "following",
                "A",
                "self_developed",
                "CRM + AI助手试点，覆盖周报、商机分析和拜访计划",
                BigDecimal.valueOf(700000),
                BigDecimal.valueOf(520000),
                LocalDate.now().plusDays(21),
                departmentId,
                userId,
                "attention",
                "客户认可AI助手试点价值，等待财务审批路径确认",
                "补齐财务审批人并提交ROI材料",
                "预算审批链路未明确",
                List.of(),
                List.of(new OpportunityContactRelationRequest(decisionMaker.id(), "business_decision_maker", true))), userId);
        activityService.create(new ActivityCreateRequest(
                account.id(),
                opportunity.id(),
                "AI商机分析行动-" + suffix,
                "visit",
                "completed",
                "risk_found",
                OffsetDateTime.now().minusDays(1).withNano(0),
                OffsetDateTime.now().plusDays(3).withNano(0),
                departmentId,
                userId,
                "讨论AI助手试点范围和预算审批路径",
                "客户认可AI助手价值，但财务审批人尚未明确",
                "AI助手试点价值获得业务负责人认可",
                "补齐财务审批人并准备ROI材料",
                "预算审批链路未明确",
                true,
                "current_week",
                "manual",
                "AI商机分析测试行动",
                List.of(),
                List.of(),
                List.of("budget_uncertain")), userId);
        return new SalesFixture(account.id(), opportunity.id(), opportunity.opportunity_name());
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "AI商机分析测试部",
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
                "ai_oppty_role_" + username,
                "AI商机分析测试角色",
                "AI商机分析测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "AI商机分析测试用户",
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
                        "password", PASSWORD), traceHeaders("ai-oppty-login-trace-001")),
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

    private record SalesFixture(Long accountId, Long opportunityId, String opportunityName) {
    }
}
