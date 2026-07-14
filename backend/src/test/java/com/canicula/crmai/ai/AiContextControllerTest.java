package com.canicula.crmai.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.account.AccountCreateRequest;
import com.canicula.crmai.account.AccountResponse;
import com.canicula.crmai.account.AccountService;
import com.canicula.crmai.activity.ActivityCreateRequest;
import com.canicula.crmai.activity.ActivityResponse;
import com.canicula.crmai.activity.ActivityService;
import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.contact.ContactCreateRequest;
import com.canicula.crmai.contact.ContactResponse;
import com.canicula.crmai.contact.ContactService;
import com.canicula.crmai.contract.ContractCreateRequest;
import com.canicula.crmai.contract.ContractResponse;
import com.canicula.crmai.contract.ContractService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.canicula.crmai.opportunity.OpportunityCreateRequest;
import com.canicula.crmai.opportunity.OpportunityResponse;
import com.canicula.crmai.opportunity.OpportunityService;
import com.canicula.crmai.receivable.ReceivablePlanCreateRequest;
import com.canicula.crmai.receivable.ReceivablePlanResponse;
import com.canicula.crmai.receivable.ReceivablePlanService;
import com.canicula.crmai.solution.SolutionDocumentCreateRequest;
import com.canicula.crmai.solution.SolutionDocumentResponse;
import com.canicula.crmai.solution.SolutionDocumentService;
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
class AiContextControllerTest {

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
    private SolutionDocumentService solutionDocumentService;

    @Autowired
    private ContractService contractService;

    @Autowired
    private ReceivablePlanService receivablePlanService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void summaryReturnsOnlyReadableSalesContextWithEvidence() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-context-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_context_" + suffix,
                departmentId,
                List.of(
                        "ai.context.read",
                        "account.read",
                        "contact.read",
                        "opportunity.read",
                        "activity.read",
                        "solution.read",
                        "contract.read",
                        "receivable.read"),
                List.of("account", "contact", "opportunity", "activity", "solution", "contract", "receivable"),
                List.of("department"));
        SalesFixture fixture = createSalesFixture(suffix, departmentId, user.userId());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-context/summary",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "ai-context-summary-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("generation_mode").asText()).isEqualTo("rules_fallback");
        assertThat(data.path("generation_notice").asText())
                .isEqualTo("当前版本由业务规则辅助生成，未调用远程模型；AI配置仅用于连接测试。");
        assertThat(data.path("accounts")).anySatisfy(account ->
                assertThat(account.path("account_name").asText()).isEqualTo("AI上下文客户-" + suffix));
        assertThat(data.path("opportunities")).anySatisfy(opportunity ->
                assertThat(opportunity.path("opportunity_name").asText()).isEqualTo("AI上下文商机-" + suffix));
        assertThat(data.path("recent_activities")).anySatisfy(activity ->
                assertThat(activity.path("subject").asText()).isEqualTo("AI上下文拜访-" + suffix));
        assertThat(data.path("evidence")).anySatisfy(evidence -> {
            assertThat(evidence.path("object_type").asText()).isEqualTo("activity");
            assertThat(evidence.path("object_id").asLong()).isEqualTo(fixture.activityId());
            assertThat(evidence.path("drilldown_url").asText()).startsWith("/activities");
        });
    }

    @Test
    void accountContextReturnsRelatedSalesAndExecutionEvidence() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-account-context-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_account_context_" + suffix,
                departmentId,
                List.of(
                        "ai.context.read",
                        "account.read",
                        "contact.read",
                        "opportunity.read",
                        "activity.read",
                        "solution.read",
                        "contract.read",
                        "receivable.read"),
                List.of("account", "contact", "opportunity", "activity", "solution", "contract", "receivable"),
                List.of("department"));
        SalesFixture fixture = createSalesFixture(suffix, departmentId, user.userId());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-context/accounts/" + fixture.accountId(),
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "ai-account-context-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("account").path("id").asLong()).isEqualTo(fixture.accountId());
        assertThat(data.path("contacts")).anySatisfy(contact ->
                assertThat(contact.path("id").asLong()).isEqualTo(fixture.contactId()));
        assertThat(data.path("opportunities")).anySatisfy(opportunity ->
                assertThat(opportunity.path("id").asLong()).isEqualTo(fixture.opportunityId()));
        assertThat(data.path("recent_activities")).anySatisfy(activity ->
                assertThat(activity.path("id").asLong()).isEqualTo(fixture.activityId()));
        assertThat(data.path("solutions")).anySatisfy(solution ->
                assertThat(solution.path("id").asLong()).isEqualTo(fixture.solutionId()));
        assertThat(data.path("contracts")).anySatisfy(contract ->
                assertThat(contract.path("id").asLong()).isEqualTo(fixture.contractId()));
        assertThat(data.path("receivables")).anySatisfy(receivable ->
                assertThat(receivable.path("id").asLong()).isEqualTo(fixture.receivableId()));
        assertThat(data.path("evidence")).anySatisfy(evidence ->
                assertThat(evidence.path("drilldown_url").asText()).isEqualTo("/accounts?account_id=" + fixture.accountId()));
    }

    @Test
    void opportunityContextReturnsOpportunityCenteredEvidence() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-opportunity-context-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_opportunity_context_" + suffix,
                departmentId,
                List.of(
                        "ai.context.read",
                        "account.read",
                        "contact.read",
                        "opportunity.read",
                        "activity.read",
                        "solution.read",
                        "contract.read",
                        "receivable.read"),
                List.of("account", "contact", "opportunity", "activity", "solution", "contract", "receivable"),
                List.of("department"));
        SalesFixture fixture = createSalesFixture(suffix, departmentId, user.userId());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-context/opportunities/" + fixture.opportunityId(),
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "ai-opportunity-context-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("opportunity").path("id").asLong()).isEqualTo(fixture.opportunityId());
        assertThat(data.path("account").path("id").asLong()).isEqualTo(fixture.accountId());
        assertThat(data.path("contacts")).anySatisfy(contact ->
                assertThat(contact.path("id").asLong()).isEqualTo(fixture.contactId()));
        assertThat(data.path("recent_activities")).anySatisfy(activity ->
                assertThat(activity.path("id").asLong()).isEqualTo(fixture.activityId()));
        assertThat(data.path("solutions")).anySatisfy(solution ->
                assertThat(solution.path("id").asLong()).isEqualTo(fixture.solutionId()));
        assertThat(data.path("contracts")).anySatisfy(contract ->
                assertThat(contract.path("id").asLong()).isEqualTo(fixture.contractId()));
        assertThat(data.path("receivables")).anySatisfy(receivable ->
                assertThat(receivable.path("id").asLong()).isEqualTo(fixture.receivableId()));
        assertThat(data.path("evidence")).anySatisfy(evidence ->
                assertThat(evidence.path("drilldown_url").asText()).isEqualTo("/opportunities?opportunity_id=" + fixture.opportunityId()));
    }

    @Test
    void summaryRequiresAiContextReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-context-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "ai_context_forbidden_" + suffix,
                departmentId,
                List.of("account.read", "contact.read", "opportunity.read", "activity.read"),
                List.of("account", "contact", "opportunity", "activity"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/ai-context/summary",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "ai-context-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void summaryDoesNotExposeModulesWithoutBusinessReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-context-limited-dept-" + suffix);
        TestUser owner = createLoginReadyUser(
                "ai_context_owner_" + suffix,
                departmentId,
                List.of(
                        "ai.context.read",
                        "account.read",
                        "contact.read",
                        "opportunity.read",
                        "activity.read",
                        "solution.read",
                        "contract.read",
                        "receivable.read"),
                List.of("account", "contact", "opportunity", "activity", "solution", "contract", "receivable"),
                List.of("department"));
        SalesFixture fixture = createSalesFixture(suffix, departmentId, owner.userId());
        TestUser limitedUser = createLoginReadyUser(
                "ai_context_limited_" + suffix,
                departmentId,
                List.of("ai.context.read", "account.read", "opportunity.read", "activity.read"),
                List.of("account", "opportunity", "activity", "contact", "solution", "contract", "receivable"),
                List.of("department"));

        ResponseEntity<JsonNode> summaryResponse = restTemplate.exchange(
                "/api/ai-context/summary",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(limitedUser.token(), "ai-context-limited-summary-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> accountResponse = restTemplate.exchange(
                "/api/ai-context/accounts/" + fixture.accountId(),
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(limitedUser.token(), "ai-context-limited-account-trace-001")),
                JsonNode.class);

        assertThat(summaryResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode summary = summaryResponse.getBody().path("data");
        assertThat(summary.path("accounts")).anySatisfy(account ->
                assertThat(account.path("id").asLong()).isEqualTo(fixture.accountId()));
        assertThat(summary.path("opportunities")).anySatisfy(opportunity ->
                assertThat(opportunity.path("id").asLong()).isEqualTo(fixture.opportunityId()));
        assertThat(summary.path("recent_activities")).anySatisfy(activity ->
                assertThat(activity.path("id").asLong()).isEqualTo(fixture.activityId()));

        assertThat(accountResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode accountContext = accountResponse.getBody().path("data");
        assertThat(accountContext.path("contacts")).isEmpty();
        assertThat(accountContext.path("solutions")).isEmpty();
        assertThat(accountContext.path("contracts")).isEmpty();
        assertThat(accountContext.path("receivables")).isEmpty();
    }

    @Test
    void accountContextRequiresAccountReadPermissionAndOpportunityContextRequiresOpportunityReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("ai-context-root-permission-dept-" + suffix);
        TestUser owner = createLoginReadyUser(
                "ai_context_root_owner_" + suffix,
                departmentId,
                List.of(
                        "ai.context.read",
                        "account.read",
                        "contact.read",
                        "opportunity.read",
                        "activity.read",
                        "solution.read",
                        "contract.read",
                        "receivable.read"),
                List.of("account", "contact", "opportunity", "activity", "solution", "contract", "receivable"),
                List.of("department"));
        SalesFixture fixture = createSalesFixture(suffix, departmentId, owner.userId());
        TestUser noAccountRead = createLoginReadyUser(
                "ai_context_no_account_" + suffix,
                departmentId,
                List.of("ai.context.read", "opportunity.read"),
                List.of("account", "opportunity"),
                List.of("department"));
        TestUser noOpportunityRead = createLoginReadyUser(
                "ai_context_no_opportunity_" + suffix,
                departmentId,
                List.of("ai.context.read", "account.read"),
                List.of("account", "opportunity"),
                List.of("department"));

        ResponseEntity<JsonNode> accountResponse = restTemplate.exchange(
                "/api/ai-context/accounts/" + fixture.accountId(),
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(noAccountRead.token(), "ai-context-no-account-trace-001")),
                JsonNode.class);
        ResponseEntity<JsonNode> opportunityResponse = restTemplate.exchange(
                "/api/ai-context/opportunities/" + fixture.opportunityId(),
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(noOpportunityRead.token(), "ai-context-no-opportunity-trace-001")),
                JsonNode.class);

        assertThat(accountResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(opportunityResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private SalesFixture createSalesFixture(String suffix, Long departmentId, Long userId) {
        AccountResponse account = accountService.create(new AccountCreateRequest(
                null,
                "AI上下文客户-" + suffix,
                "AI客户-" + suffix,
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
                "正在推进重点数字化项目",
                "希望提升销售预测和项目执行透明度",
                "AI上下文测试客户",
                List.of()), userId);
        ContactResponse contact = contactService.create(new ContactCreateRequest(
                account.id(),
                "AI上下文联系人-" + suffix,
                "信息化部",
                "总监",
                "13800000000",
                "ai-context-" + suffix + "@example.com",
                "ai-context-" + suffix,
                "decision_maker",
                "high",
                "positive",
                "hot",
                "A",
                null,
                null,
                "认可方案方向",
                "安排技术交流",
                "AI上下文联系人",
                List.of("decision_maker")), userId);
        OpportunityResponse opportunity = opportunityService.create(new OpportunityCreateRequest(
                account.id(),
                "AI上下文商机-" + suffix,
                "proposal",
                "following",
                "A",
                "self_developed",
                "客户希望提升销售管理效率",
                BigDecimal.valueOf(800000),
                BigDecimal.valueOf(600000),
                LocalDate.now().plusDays(45),
                departmentId,
                userId,
                "attention",
                "已提交初版方案",
                "下周确认预算和决策链",
                "存在预算确认风险",
                List.of(),
                List.of()), userId);
        ActivityResponse activity = activityService.create(new ActivityCreateRequest(
                account.id(),
                opportunity.id(),
                "AI上下文拜访-" + suffix,
                "visit",
                "completed",
                "milestone_completed",
                OffsetDateTime.now().minusDays(1),
                OffsetDateTime.now().plusDays(3),
                departmentId,
                userId,
                "沟通项目目标和推进节奏",
                "客户要求补充 ROI 测算",
                "客户认可方案方向",
                "安排技术 workshop",
                "预算仍需确认",
                true,
                "2026-W27",
                "manual",
                "AI上下文行动",
                List.of(contact.id()),
                List.of(),
                List.of("budget_uncertain")), userId);
        SolutionDocumentResponse solution = solutionDocumentService.create(new SolutionDocumentCreateRequest(
                account.id(),
                opportunity.id(),
                "AI上下文方案-" + suffix,
                "proposal",
                "V1",
                "submitted",
                userId,
                "客户要求量化销售过程和风险",
                "CRM + AI销售作战助手",
                "先争取信息化总监支持，再补齐财务负责人",
                BigDecimal.valueOf(600000),
                BigDecimal.valueOf(300000),
                BigDecimal.valueOf(50),
                "passed",
                "预算确认风险",
                OffsetDateTime.now().minusHours(6),
                "需要补充 ROI",
                "AI上下文方案"), userId);
        ContractResponse contract = contractService.create(new ContractCreateRequest(
                account.id(),
                opportunity.id(),
                "AI上下文合同-" + suffix,
                "AI-CTX-" + suffix,
                "sales",
                "performing",
                BigDecimal.valueOf(500000),
                BigDecimal.valueOf(0.13),
                "我方主体",
                "客户主体",
                userId,
                userId,
                OffsetDateTime.now().minusDays(10),
                OffsetDateTime.now().minusDays(8),
                OffsetDateTime.now().plusMonths(6),
                "首付款 50%，验收 50%",
                "按节点开票",
                "CRM系统与AI助手",
                "完成UAT验收",
                "medium",
                "回款节点需关注",
                "AI上下文合同"), userId);
        ReceivablePlanResponse receivable = receivablePlanService.create(new ReceivablePlanCreateRequest(
                contract.id(),
                "AI上下文回款-" + suffix,
                "first_payment",
                OffsetDateTime.now().plusDays(20),
                BigDecimal.valueOf(250000),
                userId,
                "首付款 50%",
                "AI上下文回款计划"), userId);
        return new SalesFixture(
                account.id(),
                contact.id(),
                opportunity.id(),
                activity.id(),
                solution.id(),
                contract.id(),
                receivable.id());
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "AI上下文测试部",
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
                "ai_context_role_" + username,
                "AI上下文测试角色",
                "AI上下文测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "AI上下文测试用户",
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
                        "password", PASSWORD), traceHeaders("ai-context-login-trace-001")),
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

    private record SalesFixture(
            Long accountId,
            Long contactId,
            Long opportunityId,
            Long activityId,
            Long solutionId,
            Long contractId,
            Long receivableId) {
    }
}
