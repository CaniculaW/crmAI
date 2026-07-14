package com.canicula.crmai.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import com.canicula.crmai.auth.PasswordCredentialService;
import com.canicula.crmai.identity.DepartmentCreateRequest;
import com.canicula.crmai.identity.IdentityService;
import com.canicula.crmai.identity.LoginAccountCreateRequest;
import com.canicula.crmai.identity.RoleCreateRequest;
import com.canicula.crmai.identity.UserCreateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.util.LinkedHashSet;
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
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DashboardControllerTest {

    private static final String PASSWORD = "S3cure!123";

    @Autowired
    private IdentityService identityService;

    @Autowired
    private PasswordCredentialService passwordCredentialService;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void overviewReturnsMetricCardsBusinessFlowRisksAndDrilldowns() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_all_" + suffix,
                departmentId,
                allDashboardPermissions(),
                List.of("department"));
        DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "/api/dashboard/overview?date_from=2026-07-01&date_to=2026-07-31",
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-overview-trace-001")),
                    JsonNode.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode data = response.getBody().path("data");
            assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
            assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("forecast_amount");
                assertThat(card.path("label").asText()).isEqualTo("预测金额");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(900000));
                assertThat(card.path("unit").asText()).isEqualTo("CNY");
                assertThat(card.path("drilldown_url").asText()).startsWith("/opportunities");
            });
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("received_amount");
                assertThat(card.path("label").asText()).isEqualTo("已回款金额");
                assertThat(card.path("drilldown_url").asText()).startsWith("/receivables");
            });
            assertThat(data.path("business_flow")).anySatisfy(item -> {
                assertThat(item.path("key").asText()).isEqualTo("opportunity");
                assertThat(item.path("label").asText()).isEqualTo("商机预测");
            });
            assertThat(data.path("business_flow")).anySatisfy(item -> {
                assertThat(item.path("key").asText()).isEqualTo("receivable");
                assertThat(item.path("label").asText()).isEqualTo("回款");
                assertThat(item.path("drilldown_url").asText()).startsWith("/receivables");
            });
            assertThat(data.path("risk_summary")).anySatisfy(summary -> {
                assertThat(summary.path("risk_type").asText()).isEqualTo("receivable_overdue");
                assertThat(summary.path("label").asText()).isEqualTo("回款逾期");
                assertThat(summary.path("count").asLong()).isGreaterThan(0);
                assertThat(summary.path("amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(260000));
                assertThat(summary.path("drilldown_url").asText()).startsWith("/receivables");
            });
            assertThat(data.path("top_risks")).isNotEmpty();
            assertThat(data.path("top_risks").size()).isLessThanOrEqualTo(8);
            data.path("top_risks").forEach(risk ->
                    assertThat(risk.path("drilldown_url").asText()).startsWith("/"));
            assertThat(data.path("top_risks")).anySatisfy(risk ->
                    assertThat(risk.path("object_id").asLong()).isEqualTo(fixture.receivablePlanId()));
        } finally {
            deleteFixture(fixture);
        }
    }

    @Test
    void overviewRequiresDashboardReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_forbidden_" + suffix,
                departmentId,
                List.of("opportunity.read", "contract.read", "invoice.read", "receivable.read", "payment.read", "reconciliation.read"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/overview",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void rejectsInvertedDateRangeForEveryDashboard() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-invalid-range-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_invalid_range_" + suffix,
                departmentId,
                allDashboardPermissions(),
                List.of("global"));

        for (String dashboard : List.of("overview", "funnel", "contracts", "invoices", "receivables", "risks")) {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "/api/dashboard/" + dashboard + "?date_from=2026-08-01&date_to=2026-07-01",
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-invalid-range-" + dashboard)),
                    JsonNode.class);

            assertThat(response.getStatusCode())
                    .as("dashboard %s must reject an inverted range", dashboard)
                    .isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().path("code").asText()).isEqualTo("VALIDATION_ERROR");
        }
    }

    @Test
    void funnelReturnsStageForecastTrendAndAttentionOpportunities() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-funnel-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_funnel_" + suffix,
                departmentId,
                allDashboardPermissions(),
                List.of("department"));
        DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "/api/dashboard/funnel?date_from=2026-07-01&date_to=2026-07-31",
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-funnel-trace-001")),
                    JsonNode.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode data = response.getBody().path("data");
            assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
            assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("forecast_amount");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(900000));
            });
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("weighted_forecast_amount");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(405000));
            });
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("stalled_count");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.ONE);
            });
            assertThat(data.path("stages")).anySatisfy(stage -> {
                assertThat(stage.path("key").asText()).isEqualTo("proposal");
                assertThat(stage.path("label").asText()).isEqualTo("商业方案");
                assertThat(stage.path("count").asLong()).isEqualTo(1);
                assertThat(stage.path("amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(900000));
                assertThat(stage.path("weighted_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(405000));
                assertThat(stage.path("conversion_rate").decimalValue()).isEqualByComparingTo("0.45");
            });
            assertThat(data.path("forecast_trend")).anySatisfy(point -> {
                assertThat(point.path("period").asText()).isEqualTo("2026-07");
                assertThat(point.path("forecast_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(900000));
                assertThat(point.path("weighted_forecast_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(405000));
            });
            assertThat(data.path("attention_opportunities")).anySatisfy(item -> {
                assertThat(item.path("opportunity_id").asLong()).isEqualTo(fixture.opportunityId());
                assertThat(item.path("reason").asText()).contains("停滞");
                assertThat(item.path("drilldown_url").asText()).isEqualTo("/opportunities?opportunity_id=" + fixture.opportunityId());
            });
        } finally {
            deleteFixture(fixture);
        }
    }

    @Test
    void funnelRequiresDashboardFunnelReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-funnel-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_funnel_forbidden_" + suffix,
                departmentId,
                List.of("dashboard.read", "opportunity.read"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/funnel",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-funnel-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void contractsDashboardReturnsMetricsStatusMilestonesChangesAndAttentionContracts() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-contract-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_contract_" + suffix,
                departmentId,
                allDashboardPermissions(),
                List.of("department"));
        DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "/api/dashboard/contracts?date_from=2026-07-01&date_to=2026-07-31",
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-contract-trace-001")),
                    JsonNode.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode data = response.getBody().path("data");
            assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
            assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("contract_amount");
                assertThat(card.path("label").asText()).isEqualTo("合同总额");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(500000));
            });
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("overdue_milestone_count");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.ONE);
            });
            assertThat(data.path("status_distribution")).anySatisfy(status -> {
                assertThat(status.path("status").asText()).isEqualTo("performing");
                assertThat(status.path("label").asText()).isEqualTo("执行中");
                assertThat(status.path("amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(500000));
            });
            assertThat(data.path("milestone_summary")).anySatisfy(summary -> {
                assertThat(summary.path("key").asText()).isEqualTo("overdue");
                assertThat(summary.path("count").asLong()).isEqualTo(1);
                assertThat(summary.path("drilldown_url").asText()).startsWith("/contracts");
            });
            assertThat(data.path("change_trend").isArray()).isTrue();
            assertThat(data.path("attention_contracts")).anySatisfy(item -> {
                assertThat(item.path("contract_id").asLong()).isEqualTo(fixture.contractId());
                assertThat(item.path("reason").asText()).contains("节点逾期");
                assertThat(item.path("drilldown_url").asText()).isEqualTo("/contracts?contract_id=" + fixture.contractId());
            });
        } finally {
            deleteFixture(fixture);
        }
    }

    @Test
    void contractsDashboardRequiresDashboardContractsReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-contract-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_contract_forbidden_" + suffix,
                departmentId,
                List.of("dashboard.read", "dashboard.funnel.read", "contract.read"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/contracts",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-contract-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void invoicesDashboardReturnsMetricsStatusGapRisksAndAttentionInvoices() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-invoice-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_invoice_" + suffix,
                departmentId,
                allDashboardPermissions(),
                List.of("department"));
        DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "/api/dashboard/invoices?date_from=2026-07-01&date_to=2026-07-31",
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-invoice-trace-001")),
                    JsonNode.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode data = response.getBody().path("data");
            assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
            assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("planned_invoice_amount");
                assertThat(card.path("label").asText()).isEqualTo("计划开票金额");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(300000));
                assertThat(card.path("drilldown_url").asText()).startsWith("/invoices");
            });
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("exception_count");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.ONE);
            });
            assertThat(data.path("status_distribution")).anySatisfy(status -> {
                assertThat(status.path("status").asText()).isEqualTo("exception");
                assertThat(status.path("label").asText()).isEqualTo("异常");
                assertThat(status.path("count").asLong()).isEqualTo(1);
                assertThat(status.path("planned_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(300000));
                assertThat(status.path("actual_amount").decimalValue()).isEqualByComparingTo(BigDecimal.ZERO);
            });
            assertThat(data.path("gap_trend")).anySatisfy(point -> {
                assertThat(point.path("period").asText()).isEqualTo("2026-07");
                assertThat(point.path("planned_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(300000));
                assertThat(point.path("invoiced_amount").decimalValue()).isEqualByComparingTo(BigDecimal.ZERO);
                assertThat(point.path("gap_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(300000));
            });
            assertThat(data.path("risk_summary")).anySatisfy(summary -> {
                assertThat(summary.path("key").asText()).isEqualTo("exception");
                assertThat(summary.path("label").asText()).isEqualTo("异常开票");
                assertThat(summary.path("count").asLong()).isEqualTo(1);
            });
            assertThat(data.path("attention_invoices")).anySatisfy(item -> {
                assertThat(item.path("invoice_id").asLong()).isEqualTo(fixture.invoiceId());
                assertThat(item.path("reason").asText()).contains("开票异常");
                assertThat(item.path("drilldown_url").asText()).isEqualTo("/invoices?invoice_id=" + fixture.invoiceId());
            });
        } finally {
            deleteFixture(fixture);
        }
    }

    @Test
    void invoicesDashboardRequiresDashboardInvoicesReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-invoice-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_invoice_forbidden_" + suffix,
                departmentId,
                List.of("dashboard.read", "dashboard.funnel.read", "dashboard.contracts.read", "invoice.read"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/invoices",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-invoice-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void receivablesDashboardReturnsMetricsStatusGapReconciliationAndAttentionReceivables() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-receivable-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_receivable_" + suffix,
                departmentId,
                allDashboardPermissions(),
                List.of("department"));
        DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "/api/dashboard/receivables?date_from=2026-07-01&date_to=2026-07-31&account_id="
                            + fixture.accountId(),
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-receivable-trace-001")),
                    JsonNode.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode data = response.getBody().path("data");
            assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
            assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("planned_receivable_amount");
                assertThat(card.path("label").asText()).isEqualTo("计划应收金额");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(260000));
                assertThat(card.path("drilldown_url").asText()).startsWith("/receivables");
            });
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("confirmed_received_amount");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(180000));
            });
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("unreceived_amount");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(80000));
            });
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("pending_reconciliation_amount");
                assertThat(card.path("value").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(60000));
            });
            assertThat(data.path("status_distribution")).anySatisfy(status -> {
                assertThat(status.path("status").asText()).isEqualTo("overdue");
                assertThat(status.path("label").asText()).isEqualTo("已逾期");
                assertThat(status.path("count").asLong()).isEqualTo(1);
                assertThat(status.path("planned_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(260000));
                assertThat(status.path("received_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(180000));
                assertThat(status.path("unreceived_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(80000));
            });
            assertThat(data.path("gap_trend")).anySatisfy(point -> {
                assertThat(point.path("period").asText()).isEqualTo("2026-07");
                assertThat(point.path("planned_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(260000));
                assertThat(point.path("received_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(180000));
                assertThat(point.path("gap_amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(80000));
            });
            assertThat(data.path("reconciliation_summary")).anySatisfy(summary -> {
                assertThat(summary.path("key").asText()).isEqualTo("confirmed_unreconciled");
                assertThat(summary.path("label").asText()).isEqualTo("待核销到账");
                assertThat(summary.path("amount").decimalValue()).isEqualByComparingTo(BigDecimal.valueOf(60000));
            });
            assertThat(data.path("attention_receivables")).anySatisfy(item -> {
                assertThat(item.path("object_type").asText()).isEqualTo("receivable_plan");
                assertThat(item.path("object_id").asLong()).isEqualTo(fixture.receivablePlanId());
                assertThat(item.path("reason").asText()).contains("逾期");
                assertThat(item.path("drilldown_url").asText()).isEqualTo("/receivables?receivable_plan_id=" + fixture.receivablePlanId());
            });
        } finally {
            deleteFixture(fixture);
        }
    }

    @Test
    void receivablesDashboardRequiresDashboardReceivablesReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-receivable-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_receivable_forbidden_" + suffix,
                departmentId,
                List.of("dashboard.read", "dashboard.funnel.read", "dashboard.contracts.read",
                        "dashboard.invoices.read", "receivable.read", "payment.read", "reconciliation.read"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/receivables",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-receivable-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void risksDashboardReturnsMetricsSummaryTrendOwnersAndItems() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-risk-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_risk_" + suffix,
                departmentId,
                allDashboardPermissions(),
                List.of("department"));
        DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    "/api/dashboard/risks?date_from=2026-07-01&date_to=2026-07-31&account_id="
                            + fixture.accountId(),
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-risk-trace-001")),
                    JsonNode.class);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode data = response.getBody().path("data");
            assertThat(data.path("filters").path("date_from").asText()).isEqualTo("2026-07-01");
            assertThat(data.path("filters").path("date_to").asText()).isEqualTo("2026-07-31");
            assertThat(data.path("metric_cards")).anySatisfy(card -> {
                assertThat(card.path("key").asText()).isEqualTo("risk_count");
                assertThat(card.path("label").asText()).isEqualTo("风险总数");
                assertThat(card.path("value").asLong()).isGreaterThanOrEqualTo(1);
                assertThat(card.path("drilldown_url").asText()).startsWith("/dashboard/risks");
            });
            assertThat(data.path("risk_summary")).anySatisfy(summary -> {
                assertThat(summary.path("risk_type").asText()).isEqualTo("receivable_overdue");
                assertThat(summary.path("label").asText()).isEqualTo("回款逾期");
                assertThat(summary.path("highest_level").asText()).isEqualTo("high");
            });
            assertThat(data.path("risk_trend")).isNotEmpty();
            assertThat(data.path("owner_ranking")).anySatisfy(owner -> {
                assertThat(owner.path("owner_user_id").asLong()).isEqualTo(user.userId());
                assertThat(owner.path("owner_name").asText()).isNotBlank();
            });
            assertThat(data.path("risk_items")).anySatisfy(item -> {
                assertThat(item.path("risk_type").asText()).isEqualTo("receivable_overdue");
                assertThat(item.path("risk_level").asText()).isEqualTo("high");
                assertThat(item.path("priority_score").asInt()).isGreaterThanOrEqualTo(300);
                assertThat(item.path("suggested_action").asText()).contains("回款");
                assertThat(item.path("drilldown_url").asText()).isEqualTo(
                        "/receivables?receivable_plan_id=" + fixture.receivablePlanId());
            });
        } finally {
            deleteFixture(fixture);
        }
    }

    @Test
    void risksDashboardRequiresDashboardRisksReadPermission() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-risk-forbidden-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_risk_forbidden_" + suffix,
                departmentId,
                List.of("dashboard.read", "dashboard.funnel.read", "dashboard.contracts.read",
                        "dashboard.invoices.read", "dashboard.receivables.read", "opportunity.read",
                        "contract.read", "invoice.read", "receivable.read", "payment.read", "reconciliation.read"),
                List.of("department"));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/dashboard/risks",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(user.token(), "dashboard-risk-forbidden-trace-001")),
                JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void overviewDateFilterNarrowsMetrics() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = createDepartment("dashboard-date-dept-" + suffix);
        TestUser user = createLoginReadyUser(
                "dashboard_date_" + suffix,
                departmentId,
                allDashboardPermissions(),
                List.of("department"));
        DashboardFixture fixture = createCompleteFixture(suffix, departmentId, user.userId());

        try {
            ResponseEntity<JsonNode> julyResponse = restTemplate.exchange(
                    "/api/dashboard/overview?date_from=2026-07-01&date_to=2026-07-31",
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-july-trace-001")),
                    JsonNode.class);
            ResponseEntity<JsonNode> augustResponse = restTemplate.exchange(
                    "/api/dashboard/overview?date_from=2026-08-01&date_to=2026-08-31",
                    HttpMethod.GET,
                    new HttpEntity<>(authHeaders(user.token(), "dashboard-august-trace-001")),
                    JsonNode.class);

            assertThat(julyResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(augustResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(metricValue(julyResponse.getBody(), "forecast_amount")).isGreaterThan(BigDecimal.ZERO);
            assertThat(metricValue(augustResponse.getBody(), "forecast_amount")).isEqualByComparingTo(BigDecimal.ZERO);
        } finally {
            deleteFixture(fixture);
        }
    }

    private DashboardFixture createCompleteFixture(String suffix, Long departmentId, Long ownerUserId) {
        Long accountId = insertAccount("驾驶舱客户-" + suffix, departmentId, ownerUserId);
        Long opportunityId = insertOpportunity(accountId, "驾驶舱商机-" + suffix, departmentId, ownerUserId);
        Long contractId = insertContract(accountId, opportunityId, ownerUserId, suffix);
        Long invoiceId = insertInvoice(accountId, opportunityId, contractId, ownerUserId, suffix);
        Long receivablePlanId = insertReceivablePlan(accountId, opportunityId, contractId, ownerUserId, suffix);
        Long paymentId = insertPayment(accountId, opportunityId, contractId, receivablePlanId, ownerUserId, suffix);
        insertReconciliation(accountId, opportunityId, contractId, invoiceId, paymentId, ownerUserId, suffix);
        insertOverdueMilestone(contractId, ownerUserId);
        return new DashboardFixture(accountId, opportunityId, contractId, invoiceId, receivablePlanId, paymentId);
    }

    private Long insertAccount(String accountName, Long departmentId, Long ownerUserId) {
        return insertAndReturnId("""
                insert into crm_accounts (
                    account_name, account_type, account_status, owner_department_id, owner_user_id, created_by, updated_by
                )
                values (?, 'enterprise', 'following', ?, ?, ?, ?)
                """,
                accountName,
                departmentId,
                ownerUserId,
                ownerUserId,
                ownerUserId);
    }

    private Long insertOpportunity(Long accountId, String opportunityName, Long departmentId, Long ownerUserId) {
        return insertAndReturnId("""
                insert into crm_opportunities (
                    account_id, opportunity_name, stage, status, level, estimated_contract_amount,
                    expected_close_date, owner_department_id, owner_user_id, risk_status,
                    last_activity_at, created_by, updated_by
                )
                values (?, ?, 'proposal', 'open', 'A', 900000.00, date '2026-07-20', ?, ?, 'warning',
                    timestamp with time zone '2026-06-01 00:00:00+08', ?, ?)
                """,
                accountId,
                opportunityName,
                departmentId,
                ownerUserId,
                ownerUserId,
                ownerUserId);
    }

    private Long insertContract(Long accountId, Long opportunityId, Long ownerUserId, String suffix) {
        return insertAndReturnId("""
                insert into crm_contracts (
                    account_id, opportunity_id, contract_name, contract_no, contract_type, contract_status,
                    contract_amount, tax_rate, net_amount, owner_user_id, business_owner_id,
                    signed_at, risk_level, created_by, updated_by
                )
                values (?, ?, ?, ?, 'project', 'performing', 500000.00, 0.1300, 442477.88, ?, ?,
                    timestamp with time zone '2026-07-10 10:00:00+08', 'medium', ?, ?)
                """,
                accountId,
                opportunityId,
                "驾驶舱合同-" + suffix,
                "DASH-CONTRACT-" + suffix,
                ownerUserId,
                ownerUserId,
                ownerUserId,
                ownerUserId);
    }

    private Long insertInvoice(Long accountId, Long opportunityId, Long contractId, Long ownerUserId, String suffix) {
        return insertAndReturnId("""
                insert into crm_invoices (
                    account_id, opportunity_id, contract_id, plan_name, invoice_status, invoice_type,
                    planned_invoice_date, planned_amount, applied_amount, applied_at,
                    invoice_code, invoice_no, invoice_date, tax_rate, net_amount, tax_amount,
                    actual_invoice_amount, owner_user_id, created_by, updated_by
                )
                values (?, ?, ?, ?, 'exception', 'vat_special',
                    timestamp with time zone '2026-07-12 10:00:00+08', 300000.00, 300000.00,
                    timestamp with time zone '2026-07-12 11:00:00+08',
                    ?, ?, timestamp with time zone '2026-07-13 10:00:00+08', 0.1300, 265486.73, 34513.27,
                    300000.00, ?, ?, ?)
                """,
                accountId,
                opportunityId,
                contractId,
                "驾驶舱开票-" + suffix,
                "DASH-CODE-" + suffix,
                "DASH-NO-" + suffix,
                ownerUserId,
                ownerUserId,
                ownerUserId);
    }

    private Long insertReceivablePlan(Long accountId, Long opportunityId, Long contractId, Long ownerUserId, String suffix) {
        return insertAndReturnId("""
                insert into crm_receivable_plans (
                    account_id, opportunity_id, contract_id, plan_name, plan_stage, receivable_status,
                    planned_receivable_date, planned_amount, owner_user_id, overdue_reason, created_by, updated_by
                )
                values (?, ?, ?, ?, '首付款', 'overdue',
                    timestamp with time zone '2026-07-01 00:00:00+08', 260000.00, ?, '客户付款流程延迟', ?, ?)
                """,
                accountId,
                opportunityId,
                contractId,
                "驾驶舱回款-" + suffix,
                ownerUserId,
                ownerUserId,
                ownerUserId);
    }

    private Long insertPayment(
            Long accountId,
            Long opportunityId,
            Long contractId,
            Long receivablePlanId,
            Long ownerUserId,
            String suffix) {
        return insertAndReturnId("""
                insert into crm_payments (
                    account_id, opportunity_id, contract_id, receivable_plan_id, payment_name, payment_status,
                    received_at, received_amount, confirmed_amount, confirmed_at, payment_method,
                    payer_name, bank_flow_no, reconciled_amount, owner_user_id, created_by, updated_by
                )
                values (?, ?, ?, ?, ?, 'confirmed',
                    timestamp with time zone '2026-07-14 10:00:00+08', 180000.00, 180000.00,
                    timestamp with time zone '2026-07-14 11:00:00+08', 'bank_transfer',
                    '驾驶舱付款方', ?, 120000.00, ?, ?, ?)
                """,
                accountId,
                opportunityId,
                contractId,
                receivablePlanId,
                "驾驶舱到账-" + suffix,
                "DASH-FLOW-" + suffix,
                ownerUserId,
                ownerUserId,
                ownerUserId);
    }

    private Long insertReconciliation(
            Long accountId,
            Long opportunityId,
            Long contractId,
            Long invoiceId,
            Long paymentId,
            Long ownerUserId,
            String suffix) {
        return insertAndReturnId("""
                insert into crm_reconciliations (
                    account_id, opportunity_id, contract_id, invoice_id, payment_id, reconciliation_no,
                    reconciliation_status, reconciled_amount, reconciled_at, reconciled_by
                )
                values (?, ?, ?, ?, ?, ?, 'active', 120000.00,
                    timestamp with time zone '2026-07-15 10:00:00+08', ?)
                """,
                accountId,
                opportunityId,
                contractId,
                invoiceId,
                paymentId,
                "DASH-RECON-" + suffix,
                ownerUserId);
    }

    private void insertOverdueMilestone(Long contractId, Long ownerUserId) {
        jdbcTemplate.update(
                """
                insert into crm_contract_milestones (
                    contract_id, milestone_name, milestone_type, planned_at, status, created_by, updated_by
                )
                values (?, '上线验收', 'delivery', timestamp with time zone '2026-07-02 00:00:00+08', 'overdue', ?, ?)
                """,
                contractId,
                ownerUserId,
                ownerUserId);
    }

    private void deleteFixture(DashboardFixture fixture) {
        jdbcTemplate.update("delete from crm_reconciliations where payment_id = ?", fixture.paymentId());
        jdbcTemplate.update("delete from crm_payments where id = ?", fixture.paymentId());
        jdbcTemplate.update("delete from crm_receivable_plans where id = ?", fixture.receivablePlanId());
        jdbcTemplate.update("delete from crm_invoices where id = ?", fixture.invoiceId());
        jdbcTemplate.update("delete from crm_contract_milestones where contract_id = ?", fixture.contractId());
        jdbcTemplate.update("delete from crm_contracts where id = ?", fixture.contractId());
        jdbcTemplate.update("delete from crm_opportunities where id = ?", fixture.opportunityId());
        jdbcTemplate.update("delete from crm_accounts where id = ?", fixture.accountId());
    }

    private Long insertAndReturnId(String sql, Object... args) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql, new String[] {"id"});
            for (int i = 0; i < args.length; i++) {
                statement.setObject(i + 1, args[i]);
            }
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    private TestUser createLoginReadyUser(
            String username,
            Long departmentId,
            List<String> permissions,
            List<String> dataScopes) {
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "dashboard_role_" + username,
                "驾驶舱测试角色",
                "驾驶舱测试角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "驾驶舱测试用户",
                null,
                username + "@example.com",
                "manager",
                "active"));
        identityService.createLoginAccount(new LoginAccountCreateRequest(
                userId,
                "username",
                username,
                true,
                "active"));
        identityService.assignRole(userId, roleId);
        new LinkedHashSet<>(permissions).forEach(permission ->
                identityService.grantPermission(roleId, identityService.findPermissionIdByCode(permission)));
        dataScopes.forEach(scope -> {
            grantDataScope(roleId, "account", scope);
            grantDataScope(roleId, "opportunity", scope);
            grantDataScope(roleId, "contract", scope);
            grantDataScope(roleId, "invoice", scope);
            grantDataScope(roleId, "receivable", scope);
            grantDataScope(roleId, "payment", scope);
            grantDataScope(roleId, "reconciliation", scope);
        });
        passwordCredentialService.createPasswordCredential(userId, PASSWORD);
        return new TestUser(userId, login(username));
    }

    private Long createDepartment(String code) {
        return identityService.createDepartment(new DepartmentCreateRequest(
                null,
                code,
                "驾驶舱测试部",
                "CN-31",
                "active"));
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
                        "password", PASSWORD), traceHeaders("dashboard-login-" + username)),
                JsonNode.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        return loginResponse.getBody().path("data").path("access_token").asText();
    }

    private BigDecimal metricValue(JsonNode body, String key) {
        for (JsonNode card : body.path("data").path("metric_cards")) {
            if (key.equals(card.path("key").asText())) {
                return card.path("value").decimalValue();
            }
        }
        throw new AssertionError("Missing metric card: " + key);
    }

    private List<String> allDashboardPermissions() {
        return List.of(
                "dashboard.read",
                "dashboard.funnel.read",
                "dashboard.contracts.read",
                "dashboard.invoices.read",
                "dashboard.receivables.read",
                "dashboard.risks.read",
                "opportunity.read",
                "contract.read",
                "invoice.read",
                "receivable.read",
                "payment.read",
                "reconciliation.read");
    }

    private HttpHeaders authHeaders(String accessToken, String traceId) {
        HttpHeaders headers = traceHeaders(traceId);
        headers.setBearerAuth(accessToken);
        return headers;
    }

    private HttpHeaders traceHeaders(String traceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Type", "application/json");
        headers.add("X-Trace-Id", traceId);
        return headers;
    }

    private record TestUser(Long userId, String token) {
    }

    private record DashboardFixture(
            Long accountId,
            Long opportunityId,
            Long contractId,
            Long invoiceId,
            Long receivablePlanId,
            Long paymentId) {
    }
}
