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

        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("7");
        assertThat(dictionaryTypeCount).isGreaterThanOrEqualTo(3);
        assertThat(activeTypeIndex).contains("WHERE", "deleted_at IS NULL");
        assertThat(accountTableCount).isEqualTo(2);
        assertThat(activeAccountNameIndex).contains("WHERE", "deleted_at IS NULL");
        assertThat(contactTableCount).isEqualTo(2);
        assertThat(activeContactMobileIndex).contains("WHERE", "deleted_at IS NULL");
        assertThat(contactUpdatePermissionCount).isEqualTo(1);
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
}
