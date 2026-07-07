package com.canicula.crmai.database;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.DriverManager;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class PostgresMigrationIT {

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("crm_ai")
                    .withUsername("crm_ai")
                    .withPassword("crm_ai");

    @Test
    void appliesMigrationToEmptyPostgresDatabaseWithSoftDeleteIndexes() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .placeholders(Map.of(
                        "activeRecordFilter", "where deleted_at is null",
                        "jsonDataType", "jsonb"))
                .load();

        flyway.migrate();

        JdbcTemplate jdbcTemplate = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));

        Integer dictionaryTypeCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_dict_types",
                Integer.class);
        String activeTypeIndex = jdbcTemplate.queryForObject(
                """
                select indexdef
                from pg_indexes
                where schemaname = 'public'
                  and indexname = 'uk_sys_dict_types_code_active'
                """,
                String.class);
        Integer accountTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in ('crm_accounts', 'crm_account_collaborators')
                """,
                Integer.class);
        String activeAccountNameIndex = jdbcTemplate.queryForObject(
                """
                select indexdef
                from pg_indexes
                where schemaname = 'public'
                  and indexname = 'uk_crm_accounts_name_active'
                """,
                String.class);
        Integer contactTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in ('crm_contacts', 'crm_contact_project_roles')
                """,
                Integer.class);
        String activeContactMobileIndex = jdbcTemplate.queryForObject(
                """
                select indexdef
                from pg_indexes
                where schemaname = 'public'
                  and indexname = 'uk_crm_contacts_mobile_active'
                """,
                String.class);
        Integer contactUpdatePermissionCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_permissions where permission_code = 'contact.update'",
                Integer.class);
        Integer opportunityTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in (
                    'crm_opportunities', 'crm_opportunity_collaborators', 'crm_opportunity_contacts'
                  )
                """,
                Integer.class);
        String activeOpportunityNameIndex = jdbcTemplate.queryForObject(
                """
                select indexdef
                from pg_indexes
                where schemaname = 'public'
                  and indexname = 'uk_crm_opportunities_name_active'
                """,
                String.class);
        Integer opportunityLifecyclePermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in ('opportunity.close', 'opportunity.reopen')
                """,
                Integer.class);
        Integer activityTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in (
                    'crm_sales_activities', 'crm_activity_contacts',
                    'crm_activity_participants', 'crm_activity_risk_types'
                  )
                """,
                Integer.class);
        Integer activityUpdatePermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in ('activity.update', 'activity.complete')
                """,
                Integer.class);
        Integer weeklyProgressViewCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.views
                where table_schema = 'public'
                  and table_name = 'v_opportunity_weekly_progress'
                """,
                Integer.class);
        Integer attachmentTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'crm_attachments'
                """,
                Integer.class);
        Integer attachmentPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in ('attachment.read', 'attachment.create', 'attachment.delete')
                """,
                Integer.class);
        Integer reminderTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'crm_reminders'
                """,
                Integer.class);
        Integer reminderPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in ('reminder.read', 'reminder.update')
                """,
                Integer.class);
        Integer solutionTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'crm_solution_documents'
                """,
                Integer.class);
        Integer solutionPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in ('solution.read', 'solution.create', 'solution.update', 'solution.void')
                """,
                Integer.class);
        Integer contractTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in ('crm_contracts', 'crm_contract_changes', 'crm_contract_milestones')
                """,
                Integer.class);
        Integer contractPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in (
                  'contract.read', 'contract.create', 'contract.update',
                  'contract.terminate', 'contract.milestone.manage'
                )
                """,
                Integer.class);
        Integer invoiceTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'crm_invoices'
                """,
                Integer.class);
        Integer invoicePermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in (
                  'invoice.read', 'invoice.create', 'invoice.update', 'invoice.apply',
                  'invoice.issue', 'invoice.sign', 'invoice.exception', 'invoice.void'
                )
                """,
                Integer.class);
        Integer receivablePlanTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'crm_receivable_plans'
                """,
                Integer.class);
        Integer paymentTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'crm_payments'
                """,
                Integer.class);
        Integer followUpTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'crm_receivable_follow_ups'
                """,
                Integer.class);
        Integer receivablePermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in (
                  'receivable.read', 'receivable.create', 'receivable.update',
                  'receivable.terminate', 'receivable.follow_up',
                  'payment.read', 'payment.create', 'payment.update',
                  'payment.confirm', 'payment.exception', 'payment.refund'
                )
                """,
                Integer.class);
        Integer reconciliationTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'crm_reconciliations'
                """,
                Integer.class);
        Integer invoiceReconciledColumnCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'crm_invoices'
                  and column_name = 'reconciled_amount'
                """,
                Integer.class);
        Integer reconciliationPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code in (
                  'reconciliation.read', 'reconciliation.create', 'reconciliation.void'
                )
                """,
                Integer.class);
        Integer aiContextPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.context.read'
                  and module_code = 'ai'
                """,
                Integer.class);
        Integer aiDraftTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in ('ai_input_records', 'ai_extraction_drafts', 'ai_write_logs')
                """,
                Integer.class);
        Integer aiDraftPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.draft.manage'
                  and module_code = 'ai'
                """,
                Integer.class);
        Integer aiWeeklyReportTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'ai_weekly_reports'
                """,
                Integer.class);
        Integer aiWeeklyPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.weekly.manage'
                  and module_code = 'ai'
                """,
                Integer.class);
        Integer aiOpportunityAnalysisTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'ai_opportunity_analyses'
                """,
                Integer.class);
        Integer aiOpportunityAnalysisPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.opportunity.analyze'
                  and module_code = 'ai'
                """,
                Integer.class);
        Integer aiVisitPlanTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'ai_visit_plans'
                """,
                Integer.class);
        Integer aiVisitPlanPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.visit.plan'
                  and module_code = 'ai'
                """,
                Integer.class);
        Integer aiCommunicationRecommendationTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'ai_communication_recommendations'
                """,
                Integer.class);
        Integer aiCommunicationRecommendationPermissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.communication.recommend'
                  and module_code = 'ai'
                """,
                Integer.class);

        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("33");
        assertThat(dictionaryTypeCount).isGreaterThanOrEqualTo(3);
        assertThat(activeTypeIndex).contains("WHERE", "deleted_at IS NULL");
        assertThat(accountTableCount).isEqualTo(2);
        assertThat(activeAccountNameIndex).contains("WHERE", "deleted_at IS NULL");
        assertThat(contactTableCount).isEqualTo(2);
        assertThat(activeContactMobileIndex).contains("WHERE", "deleted_at IS NULL");
        assertThat(contactUpdatePermissionCount).isEqualTo(1);
        assertThat(opportunityTableCount).isEqualTo(3);
        assertThat(activeOpportunityNameIndex).contains("WHERE", "deleted_at IS NULL");
        assertThat(opportunityLifecyclePermissionCount).isEqualTo(2);
        assertThat(activityTableCount).isEqualTo(4);
        assertThat(activityUpdatePermissionCount).isEqualTo(2);
        assertThat(weeklyProgressViewCount).isEqualTo(1);
        assertThat(attachmentTableCount).isEqualTo(1);
        assertThat(attachmentPermissionCount).isEqualTo(3);
        assertThat(reminderTableCount).isEqualTo(1);
        assertThat(reminderPermissionCount).isEqualTo(2);
        assertThat(solutionTableCount).isEqualTo(1);
        assertThat(solutionPermissionCount).isEqualTo(4);
        assertThat(contractTableCount).isEqualTo(3);
        assertThat(contractPermissionCount).isEqualTo(5);
        assertThat(invoiceTableCount).isEqualTo(1);
        assertThat(invoicePermissionCount).isEqualTo(8);
        assertThat(receivablePlanTableCount).isEqualTo(1);
        assertThat(paymentTableCount).isEqualTo(1);
        assertThat(followUpTableCount).isEqualTo(1);
        assertThat(receivablePermissionCount).isEqualTo(11);
        assertThat(reconciliationTableCount).isEqualTo(1);
        assertThat(invoiceReconciledColumnCount).isEqualTo(1);
        assertThat(reconciliationPermissionCount).isEqualTo(3);
        assertThat(aiContextPermissionCount).isEqualTo(1);
        assertThat(aiDraftTableCount).isEqualTo(3);
        assertThat(aiDraftPermissionCount).isEqualTo(1);
        assertThat(aiWeeklyReportTableCount).isEqualTo(1);
        assertThat(aiWeeklyPermissionCount).isEqualTo(1);
        assertThat(aiOpportunityAnalysisTableCount).isEqualTo(1);
        assertThat(aiOpportunityAnalysisPermissionCount).isEqualTo(1);
        assertThat(aiVisitPlanTableCount).isEqualTo(1);
        assertThat(aiVisitPlanPermissionCount).isEqualTo(1);
        assertThat(aiCommunicationRecommendationTableCount).isEqualTo(1);
        assertThat(aiCommunicationRecommendationPermissionCount).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                """
                select data_type
                from information_schema.columns
                where table_name = 'sys_audit_logs'
                  and column_name = 'before_data'
                """,
                String.class)).isEqualTo("jsonb");

        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into sys_dict_types (dict_code, dict_name) values (?, ?)",
                "account_type",
                "重复客户类型"))
                .hasRootCauseInstanceOf(org.postgresql.util.PSQLException.class);

        jdbcTemplate.update(
                "update sys_dict_types set deleted_at = current_timestamp where dict_code = ?",
                "account_type");
        jdbcTemplate.update(
                "insert into sys_dict_types (dict_code, dict_name) values (?, ?)",
                "account_type",
                "客户类型新版本");

        Integer activeAccountTypeCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_dict_types where dict_code = ? and deleted_at is null",
                Integer.class,
                "account_type");

        assertThat(activeAccountTypeCount).isEqualTo(1);
    }

    @Test
    void createsDashboardReadPermission() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .placeholders(Map.of(
                        "activeRecordFilter", "where deleted_at is null",
                        "jsonDataType", "jsonb"))
                .load();

        flyway.migrate();

        JdbcTemplate jdbcTemplate = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'dashboard.read'
                  and permission_name = '查看驾驶舱'
                  and module_code = 'dashboard'
                """,
                Integer.class);

        assertThat(count).isEqualTo(1);
    }

    @Test
    void createsDashboardFunnelReadPermission() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .placeholders(Map.of(
                        "activeRecordFilter", "where deleted_at is null",
                        "jsonDataType", "jsonb"))
                .load();

        flyway.migrate();

        JdbcTemplate jdbcTemplate = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'dashboard.funnel.read'
                  and permission_name = '查看销售漏斗'
                  and module_code = 'dashboard'
                """,
                Integer.class);

        assertThat(count).isEqualTo(1);
    }

    @Test
    void createsDashboardContractsReadPermission() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .placeholders(Map.of(
                        "activeRecordFilter", "where deleted_at is null",
                        "jsonDataType", "jsonb"))
                .load();

        flyway.migrate();

        JdbcTemplate jdbcTemplate = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'dashboard.contracts.read'
                  and permission_name = '查看合同看板'
                  and module_code = 'dashboard'
                """,
                Integer.class);

        assertThat(count).isEqualTo(1);
    }

    @Test
    void createsDashboardInvoicesReadPermission() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .placeholders(Map.of(
                        "activeRecordFilter", "where deleted_at is null",
                        "jsonDataType", "jsonb"))
                .load();

        flyway.migrate();

        JdbcTemplate jdbcTemplate = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'dashboard.invoices.read'
                  and permission_name = '查看开票看板'
                  and module_code = 'dashboard'
                """,
                Integer.class);

        assertThat(count).isEqualTo(1);
    }

    @Test
    void createsDashboardReceivablesReadPermission() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .placeholders(Map.of(
                        "activeRecordFilter", "where deleted_at is null",
                        "jsonDataType", "jsonb"))
                .load();

        flyway.migrate();

        JdbcTemplate jdbcTemplate = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'dashboard.receivables.read'
                  and permission_name = '查看回款看板'
                  and module_code = 'dashboard'
                """,
                Integer.class);

        assertThat(count).isEqualTo(1);
    }

    @Test
    void createsDashboardRisksReadPermission() {
        Flyway flyway = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .placeholders(Map.of(
                        "activeRecordFilter", "where deleted_at is null",
                        "jsonDataType", "jsonb"))
                .load();

        flyway.migrate();

        JdbcTemplate jdbcTemplate = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'dashboard.risks.read'
                  and permission_name = '查看风险预警'
                  and module_code = 'dashboard'
                """,
                Integer.class);

        assertThat(count).isEqualTo(1);
    }
}
