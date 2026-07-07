package com.canicula.crmai.database;

import static org.assertj.core.api.Assertions.assertThat;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class DatabaseMigrationTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void appliesInitialSystemDictionaryMigration() {
        Integer migrationCount = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success = true",
                Integer.class);
        Integer dictionaryTypeCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_dict_types",
                Integer.class);
        Integer auditTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_name in ('sys_login_logs', 'sys_audit_logs')
                """,
                Integer.class);
        Integer identityTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_name in (
                  'sys_departments', 'sys_users', 'sys_roles', 'sys_user_roles',
                  'sys_login_accounts', 'sys_user_credentials', 'sys_permissions',
                  'sys_role_permissions', 'sys_data_scopes', 'sys_role_data_scopes',
                  'sys_sessions'
                )
                """,
                Integer.class);
        Integer accountTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_name in ('crm_accounts', 'crm_account_collaborators')
                """,
                Integer.class);
        Integer contactTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_name in ('crm_contacts', 'crm_contact_project_roles')
                """,
                Integer.class);
        Integer contactUpdatePermissionCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_permissions where permission_code = 'contact.update'",
                Integer.class);
        Integer opportunityTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_name in (
                  'crm_opportunities', 'crm_opportunity_collaborators', 'crm_opportunity_contacts'
                )
                """,
                Integer.class);
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
                where table_name in (
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
                where table_name = 'v_opportunity_weekly_progress'
                """,
                Integer.class);
        Integer attachmentTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_name = 'crm_attachments'
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
                where table_name = 'crm_reminders'
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
                where table_name = 'crm_solution_documents'
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
                where table_name in ('crm_contracts', 'crm_contract_changes', 'crm_contract_milestones')
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
                where table_name = 'crm_invoices'
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
                where table_name = 'crm_receivable_plans'
                """,
                Integer.class);
        Integer paymentTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_name = 'crm_payments'
                """,
                Integer.class);
        Integer followUpTableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_name = 'crm_receivable_follow_ups'
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
                where table_name = 'crm_reconciliations'
                """,
                Integer.class);
        Integer invoiceReconciledColumnCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.columns
                where table_name = 'crm_invoices'
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
        Integer v2DictionaryTypeCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_dict_types
                where dict_code in (
                  'solution_doc_type', 'solution_status', 'solution_self_check_result', 'solution_risk_level',
                  'contract_type', 'contract_status', 'contract_change_type', 'contract_milestone_status',
                  'invoice_status', 'invoice_type', 'invoice_exception_type',
                  'receivable_plan_status', 'payment_status', 'payment_method', 'receivable_follow_up_result',
                  'reconciliation_status', 'reconciliation_source'
                )
                """,
                Integer.class);
        Integer v2DictionaryItemCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_dict_items i
                join sys_dict_types t on t.id = i.dict_type_id
                where t.dict_code in (
                  'solution_doc_type', 'solution_status', 'solution_self_check_result', 'solution_risk_level',
                  'contract_type', 'contract_status', 'contract_change_type', 'contract_milestone_status',
                  'invoice_status', 'invoice_type', 'invoice_exception_type',
                  'receivable_plan_status', 'payment_status', 'payment_method', 'receivable_follow_up_result',
                  'reconciliation_status', 'reconciliation_source'
                )
                  and i.is_active = true
                """,
                Integer.class);

        assertThat(flyway.info().current()).isNotNull();
        assertThat(migrationCount).isGreaterThanOrEqualTo(33);
        assertThat(dictionaryTypeCount).isGreaterThanOrEqualTo(1);
        assertThat(auditTableCount).isEqualTo(2);
        assertThat(identityTableCount).isEqualTo(11);
        assertThat(accountTableCount).isEqualTo(2);
        assertThat(contactTableCount).isEqualTo(2);
        assertThat(contactUpdatePermissionCount).isEqualTo(1);
        assertThat(opportunityTableCount).isEqualTo(3);
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
        assertThat(v2DictionaryTypeCount).isEqualTo(17);
        assertThat(v2DictionaryItemCount).isGreaterThanOrEqualTo(48);
    }

    @Test
    void createsDashboardReadPermission() {
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

    @Test
    void createsAiDraftTablesAndPermission() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where lower(table_name) in ('ai_input_records', 'ai_extraction_drafts', 'ai_write_logs')
                """,
                Integer.class);
        Integer permissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.draft.manage'
                  and module_code = 'ai'
                """,
                Integer.class);

        assertThat(tableCount).isEqualTo(3);
        assertThat(permissionCount).isEqualTo(1);
    }

    @Test
    void createsAiWeeklyReportTableAndPermission() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where lower(table_name) = 'ai_weekly_reports'
                """,
                Integer.class);
        Integer permissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.weekly.manage'
                  and module_code = 'ai'
                """,
                Integer.class);

        assertThat(tableCount).isEqualTo(1);
        assertThat(permissionCount).isEqualTo(1);
    }

    @Test
    void createsAiOpportunityAnalysisTableAndPermission() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where lower(table_name) = 'ai_opportunity_analyses'
                """,
                Integer.class);
        Integer permissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.opportunity.analyze'
                  and module_code = 'ai'
                """,
                Integer.class);

        assertThat(tableCount).isEqualTo(1);
        assertThat(permissionCount).isEqualTo(1);
    }

    @Test
    void createsAiVisitPlanTableAndPermission() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where lower(table_name) = 'ai_visit_plans'
                """,
                Integer.class);
        Integer permissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.visit.plan'
                  and module_code = 'ai'
                """,
                Integer.class);

        assertThat(tableCount).isEqualTo(1);
        assertThat(permissionCount).isEqualTo(1);
    }

    @Test
    void createsAiCommunicationRecommendationTableAndPermission() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where lower(table_name) = 'ai_communication_recommendations'
                """,
                Integer.class);
        Integer permissionCount = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_permissions
                where permission_code = 'ai.communication.recommend'
                  and module_code = 'ai'
                """,
                Integer.class);

        assertThat(tableCount).isEqualTo(1);
        assertThat(permissionCount).isEqualTo(1);
    }
}
