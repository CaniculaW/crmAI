package com.canicula.crmai.system;

import com.canicula.crmai.auth.PasswordCredentialService;
import java.sql.PreparedStatement;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(prefix = "crm.seed.v1-demo", name = "enabled", havingValue = "true")
public class V1DemoDataSeeder implements ApplicationRunner {

    public static final String DEMO_ADMIN_USERNAME = "demo_admin";
    public static final String DEMO_ADMIN_PASSWORD = "S3cure!123";

    private static final String DEMO_DEPARTMENT_CODE = "v1-demo-sales";
    private static final String DEMO_ADMIN_EMAIL = "demo_admin@example.com";
    private static final String DEMO_ADMIN_ROLE_CODE = "v1_demo_admin";
    private static final List<String> GLOBAL_SCOPE_MODULES = List.of(
            "account",
            "contact",
            "opportunity",
            "activity",
            "weekly_progress",
            "attachment",
            "reminder");

    private final JdbcTemplate jdbcTemplate;
    private final PasswordCredentialService passwordCredentialService;
    private final Environment environment;

    V1DemoDataSeeder(
            JdbcTemplate jdbcTemplate,
            PasswordCredentialService passwordCredentialService,
            Environment environment) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordCredentialService = passwordCredentialService;
        this.environment = environment;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        refuseProductionProfile();
        Long departmentId = ensureDepartment();
        Long roleId = ensureRole();
        grantAllPermissions(roleId);
        grantGlobalDataScopes(roleId);
        Long userId = ensureAdminUser(departmentId);
        ensureLoginAccount(userId);
        ensurePasswordCredential(userId);
        ensureUserRole(userId, roleId);
    }

    private Long ensureDepartment() {
        return findId(
                "select id from sys_departments where code = ? and deleted_at is null",
                DEMO_DEPARTMENT_CODE)
                .orElseGet(() -> insertAndReturnId(
                        """
                        insert into sys_departments (code, name, region_code, status)
                        values (?, ?, ?, 'active')
                        """,
                        DEMO_DEPARTMENT_CODE,
                        "V1演示销售部",
                        "CN-31"));
    }

    private Long ensureRole() {
        return findId(
                "select id from sys_roles where code = ? and deleted_at is null",
                DEMO_ADMIN_ROLE_CODE)
                .orElseGet(() -> insertAndReturnId(
                        """
                        insert into sys_roles (code, name, description)
                        values (?, ?, ?)
                        """,
                        DEMO_ADMIN_ROLE_CODE,
                        "V1演示管理员",
                        "用于测试环境和本地部署态V1验收验证"));
    }

    private void grantAllPermissions(Long roleId) {
        jdbcTemplate.update(
                """
                insert into sys_role_permissions (role_id, permission_id)
                select ?, p.id
                from sys_permissions p
                where p.is_active = true
                  and not exists (
                      select 1
                      from sys_role_permissions rp
                      where rp.role_id = ?
                        and rp.permission_id = p.id
                  )
                """,
                roleId,
                roleId);
    }

    private void grantGlobalDataScopes(Long roleId) {
        Long globalScopeId = findId("select id from sys_data_scopes where scope_code = ?", "global")
                .orElseThrow(() -> new IllegalStateException("global data scope is missing"));
        GLOBAL_SCOPE_MODULES.forEach(moduleCode -> {
            if (count("""
                    select count(*)
                    from sys_role_data_scopes
                    where role_id = ?
                      and module_code = ?
                      and data_scope_id = ?
                    """, roleId, moduleCode, globalScopeId) == 0) {
                jdbcTemplate.update(
                        """
                        insert into sys_role_data_scopes (role_id, module_code, data_scope_id)
                        values (?, ?, ?)
                        """,
                        roleId,
                        moduleCode,
                        globalScopeId);
            }
        });
    }

    private Long ensureAdminUser(Long departmentId) {
        Optional<Long> existingUserId = findId(
                "select id from sys_users where email = ? and deleted_at is null",
                DEMO_ADMIN_EMAIL);
        if (existingUserId.isPresent()) {
            assertExistingDemoUserIsOwnedBySeed(existingUserId.get());
            return existingUserId.get();
        }
        return insertAndReturnId(
                """
                insert into sys_users (department_id, name, email, role_code, status)
                values (?, ?, ?, 'system_admin', 'active')
                """,
                departmentId,
                "V1演示管理员",
                DEMO_ADMIN_EMAIL);
    }

    private void assertExistingDemoUserIsOwnedBySeed(Long userId) {
        Optional<LoginAccountSnapshot> existingLogin = findDemoLoginAccount();
        if (existingLogin.isEmpty()) {
            throw new IllegalStateException("demo admin email already exists without demo_admin login");
        }
        if (!Objects.equals(existingLogin.get().userId(), userId)) {
            throw new IllegalStateException("demo_admin login belongs to a different user");
        }
    }

    private void ensureLoginAccount(Long userId) {
        Optional<LoginAccountSnapshot> existingLogin = findDemoLoginAccount();
        if (existingLogin.isPresent()) {
            LoginAccountSnapshot loginAccount = existingLogin.get();
            if (!Objects.equals(loginAccount.userId(), userId)) {
                throw new IllegalStateException("demo_admin login belongs to a different user");
            }
            jdbcTemplate.update(
                    """
                    update sys_login_accounts
                    set is_primary = true,
                        status = 'active',
                        updated_at = current_timestamp
                    where id = ?
                    """,
                    loginAccount.id());
        } else {
            jdbcTemplate.update(
                    """
                    insert into sys_login_accounts (user_id, login_type, login_identifier, is_primary, status)
                    values (?, 'username', ?, true, 'active')
                    """,
                    userId,
                    DEMO_ADMIN_USERNAME);
        }
    }

    private Optional<LoginAccountSnapshot> findDemoLoginAccount() {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                    select id, user_id, status
                    from sys_login_accounts
                    where login_type = 'username'
                      and login_identifier = ?
                    """,
                    (rs, rowNum) -> new LoginAccountSnapshot(
                            rs.getLong("id"),
                            rs.getLong("user_id"),
                            rs.getString("status")),
                    DEMO_ADMIN_USERNAME));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    private void ensurePasswordCredential(Long userId) {
        if (count("""
                select count(*)
                from sys_user_credentials
                where user_id = ?
                  and credential_type = 'password'
                """, userId) == 0) {
            passwordCredentialService.createPasswordCredential(userId, DEMO_ADMIN_PASSWORD);
        } else {
            passwordCredentialService.resetPassword(userId, DEMO_ADMIN_PASSWORD);
        }
    }

    private void ensureUserRole(Long userId, Long roleId) {
        if (count("select count(*) from sys_user_roles where user_id = ? and role_id = ?", userId, roleId) == 0) {
            jdbcTemplate.update(
                    """
                    insert into sys_user_roles (user_id, role_id)
                    values (?, ?)
                    """,
                    userId,
                    roleId);
        }
    }

    private Optional<Long> findId(String sql, Object... parameters) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(sql, Long.class, parameters));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    private int count(String sql, Object... parameters) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, parameters);
        return count == null ? 0 : count;
    }

    private Long insertAndReturnId(String sql, Object... parameters) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql, new String[] {"id"});
            for (int index = 0; index < parameters.length; index++) {
                statement.setObject(index + 1, parameters[index]);
            }
            return statement;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }

    private void refuseProductionProfile() {
        if (Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase)) {
            throw new IllegalStateException("V1 demo seed must not run with prod profile");
        }
    }

    private record LoginAccountSnapshot(Long id, Long userId, String status) {
    }
}
