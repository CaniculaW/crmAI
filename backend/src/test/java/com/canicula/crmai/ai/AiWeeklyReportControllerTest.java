package com.canicula.crmai.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.account.AccountCreateRequest;
import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.activity.ActivityCreateRequest;
import com.canicula.crmai.activity.ActivityService;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
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
class AiWeeklyReportControllerTest {

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
    private ActivityService activityService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void generatesWeeklyReportWithEvidenceWithoutWritingProgress() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-weekly-generate-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_weekly_generate_" + suffix,
                departmentId,
                List.of("ai.weekly.manage", "weekly_progress.read", "account.read", "opportunity.read", "activity.read"),
                List.of("account", "opportunity", "activity"),
                List.of("department"));
        SalesFixture fixture = createWeeklyFixture(suffix, departmentId, user.userId());
        LocalDate weekStart = currentWeekStart();

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-weekly-reports/generate",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of("week_start", weekStart.toString()),
                        authHeaders(user.token(), "ai-weekly-generate-trace-001")),
                JsonNode.class);
        Integer aiWeeklyActivityCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from crm_sales_activities
                where source_type = 'ai_weekly_report'
                  and opportunity_id = ?
                """,
                Integer.class,
                fixture.opportunityId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("status").asText()).isEqualTo("pending_confirmation");
        assertThat(data.path("source_activity_count").asInt()).isEqualTo(2);
        assertThat(data.path("personal_summary").path("highlights")).anySatisfy(highlight ->
                assertThat(highlight.asText()).contains("客户认可试点目标"));
        assertThat(data.path("personal_summary").path("risks")).anySatisfy(risk ->
                assertThat(risk.asText()).contains("预算审批"));
        assertThat(data.path("opportunity_progress")).anySatisfy(progress -> {
            assertThat(progress.path("opportunity_id").asLong()).isEqualTo(fixture.opportunityId());
            assertThat(progress.path("opportunity_name").asText()).isEqualTo("AI周报商机-" + suffix);
            assertThat(progress.path("summary").asText()).contains("客户认可试点目标");
            assertThat(progress.path("next_week_plan").asText()).contains("补充 ROI");
            assertThat(progress.path("evidence")).anySatisfy(evidence ->
                    assertThat(evidence.path("drilldown_url").asText()).startsWith("/activities"));
        });
        assertThat(data.path("evidence")).anySatisfy(evidence ->
                assertThat(evidence.path("object_id").asLong()).isEqualTo(fixture.firstActivityId()));
        assertThat(aiWeeklyActivityCount).isZero();
    }

    @Test
    void confirmingWeeklyReportWritesProgressActivityOnce() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-weekly-confirm-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_weekly_confirm_" + suffix,
                departmentId,
                List.of(
                        "ai.weekly.manage",
                        "weekly_progress.read",
                        "account.read",
                        "opportunity.read",
                        "activity.read",
                        "activity.create"),
                List.of("account", "opportunity", "activity"),
                List.of("department"));
        SalesFixture fixture = createWeeklyFixture(suffix, departmentId, user.userId());
        JsonNode generated = restTemplate.exchange(
                        "/api/ai-weekly-reports/generate",
                        HttpMethod.POST,
                        new HttpEntity<>(
                                Map.of("week_start", currentWeekStart().toString()),
                                authHeaders(user.token(), "ai-weekly-confirm-generate-trace-001")),
                        JsonNode.class)
                .getBody()
                .path("data");
        long reportId = generated.path("id").asLong();

        ResponseEntity<JsonNode> confirmResponse = restTemplate.exchange(
                "/api/ai-weekly-reports/" + reportId + "/confirm",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(), authHeaders(user.token(), "ai-weekly-confirm-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> weeklyProgressResponse = restTemplate.exchange(
                "/api/opportunities/" + fixture.opportunityId() + "/weekly-progress",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "ai-weekly-progress-after-confirm-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> duplicateConfirmResponse = restTemplate.exchange(
                "/api/ai-weekly-reports/" + reportId + "/confirm",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(), authHeaders(user.token(), "ai-weekly-confirm-repeat-trace-001")),
                JsonNode.class);

        assertThat(confirmResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode confirmed = confirmResponse.getBody().path("data");
        assertThat(confirmed.path("status").asText()).isEqualTo("confirmed");
        assertThat(confirmed.path("write_activity_ids")).hasSize(1);
        assertThat(weeklyProgressResponse.getStatusCode())
                .as("weekly progress body: %s", weeklyProgressResponse.getBody())
                .isEqualTo(HttpStatus.OK);
        JsonNode rows = weeklyProgressResponse.getBody().path("data");
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).path("progress_items")).anySatisfy(item -> {
            assertThat(item.path("subject").asText()).contains("AI周进展");
            assertThat(item.path("conclusion").asText()).contains("客户认可试点目标");
            assertThat(item.path("next_plan").asText()).contains("补充 ROI");
        });
        assertThat(duplicateConfirmResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Integer writeLogCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from ai_write_logs
                where operation = 'weekly_report_confirm'
                  and object_type = 'activity'
                  and status = 'success'
                """,
                Integer.class);
        assertThat(writeLogCount).isEqualTo(1);
    }

    @Test
    void weeklyReportRequiresAiWeeklyPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-weekly-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_weekly_forbidden_" + suffix,
                departmentId,
                List.of("weekly_progress.read", "account.read", "opportunity.read", "activity.read"),
                List.of("account", "opportunity", "activity"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-weekly-reports/generate",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of("week_start", currentWeekStart().toString()),
                        authHeaders(user.token(), "ai-weekly-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private SalesFixture createWeeklyFixture(String suffix, Long departmentId, Long userId) {
        AccountResponse account = accountService.create(new AccountCreateRequest(
                null,
                "AI周报客户-" + suffix,
                "AI周报客户",
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
                "重点客户",
                "希望提升项目推进效率",
                "AI周报测试客户",
                List.of()), userId);
        OpportunityResponse opportunity = opportunityService.create(new OpportunityCreateRequest(
                account.id(),
                "AI周报商机-" + suffix,
                "proposal",
                "following",
                "A",
                "self_developed",
                "试点 CRM + AI 助手",
                BigDecimal.valueOf(600000),
                BigDecimal.valueOf(500000),
                LocalDate.now().plusDays(30),
                departmentId,
                userId,
                "attention",
                "已完成试点范围沟通",
                "补充 ROI 测算",
                "预算审批链路未明确",
                List.of(),
                List.of()), userId);
        Long firstActivityId = activityService.create(new ActivityCreateRequest(
                account.id(),
                opportunity.id(),
                "AI周报行动一-" + suffix,
                "visit",
                "completed",
                "milestone_completed",
                currentWeekStart().atTime(10, 0).atOffset(OffsetDateTime.now().getOffset()),
                OffsetDateTime.now().plusDays(3),
                departmentId,
                userId,
                "确认试点目标和业务范围",
                "客户认可试点目标，要求补充 ROI",
                "客户认可试点目标",
                "补充 ROI 测算并约技术评审",
                null,
                true,
                "current_week",
                "manual",
                "AI周报测试行动一",
                List.of(),
                List.of(),
                List.of()), userId).id();
        Long secondActivityId = activityService.create(new ActivityCreateRequest(
                account.id(),
                opportunity.id(),
                "AI周报行动二-" + suffix,
                "call",
                "completed",
                "risk_found",
                currentWeekStart().plusDays(1).atTime(15, 0).atOffset(OffsetDateTime.now().getOffset()),
                OffsetDateTime.now().plusDays(5),
                departmentId,
                userId,
                "沟通预算审批路径",
                "客户反馈预算审批还需财务确认",
                "预算审批人尚未确认",
                "推动客户补齐财务审批人",
                "预算审批链路未明确",
                true,
                "current_week",
                "manual",
                "AI周报测试行动二",
                List.of(),
                List.of(),
                List.of("budget_uncertain")), userId).id();
        return new SalesFixture(account.id(), opportunity.id(), firstActivityId, secondActivityId);
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "AI周报测试部",
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
                "ai_weekly_role_" + username,
                "AI周报测试角色",
                "AI周报测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "AI周报测试用户",
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
                        "password", PASSWORD), traceHeaders("ai-weekly-login-trace-001")),
                JsonNode.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        return loginResponse.getBody().path("data").path("access_token").asText();
    }

    private static LocalDate currentWeekStart() {
        return LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
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

    private record SalesFixture(
            Long accountId,
            Long opportunityId,
            Long firstActivityId,
            Long secondActivityId) {
    }
}
