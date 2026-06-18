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

        assertThat(flyway.info().current()).isNotNull();
        assertThat(migrationCount).isGreaterThanOrEqualTo(13);
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
    }
}
