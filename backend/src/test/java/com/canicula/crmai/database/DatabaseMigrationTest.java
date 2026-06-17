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

        assertThat(flyway.info().current()).isNotNull();
        assertThat(migrationCount).isGreaterThanOrEqualTo(3);
        assertThat(dictionaryTypeCount).isGreaterThanOrEqualTo(1);
        assertThat(auditTableCount).isEqualTo(2);
    }
}
