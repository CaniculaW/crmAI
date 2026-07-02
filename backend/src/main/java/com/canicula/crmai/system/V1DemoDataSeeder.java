package com.canicula.crmai.system;

import com.canicula.crmai.auth.PasswordCredentialService;
import java.sql.PreparedStatement;
import java.time.LocalDate;
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
    private static final String DEMO_ACCOUNT_NAME = "V1演示客户-上海智造集团";
    private static final String DEMO_CONTACT_NAME = "王敏";
    private static final String DEMO_CONTACT_MOBILE_NORMALIZED = "13800000001";
    private static final String DEMO_OPPORTUNITY_NAME = "智能制造CRM一期试点";
    private static final String DEMO_ACTIVITY_SUBJECT = "完成CRM V1试点需求确认会";
    private static final List<String> GLOBAL_SCOPE_MODULES = List.of(
            "account",
            "contact",
            "opportunity",
            "activity",
            "weekly_progress",
            "attachment",
            "reminder",
            "solution",
            "contract",
            "invoice",
            "receivable",
            "payment",
            "reconciliation");

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
        ensureDemoBusinessData(departmentId, userId);
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

    private void ensureDemoBusinessData(Long departmentId, Long userId) {
        Long accountId = ensureDemoAccount(departmentId, userId);
        Long contactId = ensureDemoContact(accountId, departmentId, userId);
        ensureContactProjectRole(contactId);
        Long opportunityId = ensureDemoOpportunity(accountId, departmentId, userId);
        ensureOpportunityContact(opportunityId, contactId);
        Long activityId = ensureDemoActivity(accountId, opportunityId, departmentId, userId);
        ensureActivityContact(activityId, contactId);
        ensureActivityParticipant(activityId, userId);
        refreshDemoLastActivity(accountId, contactId, opportunityId, userId);
    }

    private Long ensureDemoAccount(Long departmentId, Long userId) {
        return findId(
                "select id from crm_accounts where tenant_id = 1 and account_name = ? and deleted_at is null",
                DEMO_ACCOUNT_NAME)
                .orElseGet(() -> insertAndReturnId(
                        """
                        insert into crm_accounts (
                            account_name, account_short_name, account_type, account_level,
                            account_status, account_source, industry, region_province,
                            region_city, relationship_status, owner_department_id,
                            owner_user_id, background, key_needs, remark, created_by, updated_by
                        )
                        values (?, ?, 'enterprise', 'A', 'active', 'v1_demo_seed',
                            ?, ?, ?, 'warming', ?, ?, ?, ?, ?, ?, ?)
                        """,
                        DEMO_ACCOUNT_NAME,
                        "上海智造",
                        "智能制造",
                        "上海",
                        "上海",
                        departmentId,
                        userId,
                        "集团正在推进销售数字化和重点客户经营体系建设。",
                        "需要统一客户档案、商机过程和周进展管理。",
                        "V1演示数据，由测试环境 seed 自动维护。",
                        userId,
                        userId));
    }

    private Long ensureDemoContact(Long accountId, Long departmentId, Long userId) {
        return findId(
                """
                select id
                from crm_contacts
                where tenant_id = 1
                  and account_id = ?
                  and name = ?
                  and mobile_normalized = ?
                  and deleted_at is null
                """,
                accountId,
                DEMO_CONTACT_NAME,
                DEMO_CONTACT_MOBILE_NORMALIZED)
                .orElseGet(() -> insertAndReturnId(
                        """
                        insert into crm_contacts (
                            account_id, name, department, title, mobile, mobile_normalized,
                            email, contact_type, decision_influence, attitude,
                            relationship_heat, importance_level, owner_department_id,
                            owner_user_id, next_action, remark, created_by, updated_by
                        )
                        values (?, ?, '数字化办公室', '数字化负责人', ?, ?, ?,
                            'decision_maker', 'high', 'supportive', 'hot', 'key',
                            ?, ?, ?, ?, ?, ?)
                        """,
                        accountId,
                        DEMO_CONTACT_NAME,
                        DEMO_CONTACT_MOBILE_NORMALIZED,
                        DEMO_CONTACT_MOBILE_NORMALIZED,
                        "wangmin@example.com",
                        departmentId,
                        userId,
                        "安排试点范围确认会",
                        "V1演示联系人。",
                        userId,
                        userId));
    }

    private void ensureContactProjectRole(Long contactId) {
        if (count(
                "select count(*) from crm_contact_project_roles where contact_id = ? and role_code = ?",
                contactId,
                "decision_maker") == 0) {
            jdbcTemplate.update(
                    """
                    insert into crm_contact_project_roles (contact_id, role_code)
                    values (?, ?)
                    """,
                    contactId,
                    "decision_maker");
        }
    }

    private Long ensureDemoOpportunity(Long accountId, Long departmentId, Long userId) {
        return findId(
                """
                select id
                from crm_opportunities
                where tenant_id = 1
                  and account_id = ?
                  and opportunity_name = ?
                  and deleted_at is null
                """,
                accountId,
                DEMO_OPPORTUNITY_NAME)
                .orElseGet(() -> insertAndReturnId(
                        """
                        insert into crm_opportunities (
                            account_id, opportunity_name, stage, status, level, source,
                            potential_point, opportunity_analysis, project_requirement,
                            estimated_budget_amount, estimated_contract_amount,
                            estimated_gross_margin_rate, expected_close_date, project_cycle,
                            procurement_process, funding_source, owner_department_id,
                            owner_user_id, technical_solution_status, stakeholder_plan_status,
                            quotation_status, bid_self_check_status, current_progress,
                            next_plan, risk_status, risk_description, win_rate,
                            remark, created_by, updated_by
                        )
                        values (?, ?, 'proposal', 'active', 'A', 'v1_demo_seed',
                            ?, ?, ?, 800000.00, 620000.00, 0.2800, ?, '45天',
                            ?, ?, ?, ?, 'drafted', 'confirmed', 'pending',
                            'not_started', ?, ?, 'low', ?, 0.6500, ?, ?, ?)
                        """,
                        accountId,
                        DEMO_OPPORTUNITY_NAME,
                        "客户已认可统一CRM试点价值。",
                        "决策人支持度较高，预算和采购窗口明确。",
                        "建设客户、联系人、商机、销售活动与周进展闭环。",
                        LocalDate.now().plusDays(45),
                        "先完成试点方案评审，再进入合同审批。",
                        "年度数字化专项预算",
                        departmentId,
                        userId,
                        "已完成需求确认，进入试点方案细化。",
                        "提交V1试点方案和实施排期。",
                        "需持续确认数据迁移范围。",
                        "V1演示商机。",
                        userId,
                        userId));
    }

    private void ensureOpportunityContact(Long opportunityId, Long contactId) {
        if (count(
                "select count(*) from crm_opportunity_contacts where opportunity_id = ? and contact_id = ?",
                opportunityId,
                contactId) == 0) {
            jdbcTemplate.update(
                    """
                    insert into crm_opportunity_contacts (
                        opportunity_id, contact_id, role_in_opportunity, is_key_person
                    )
                    values (?, ?, '决策人', true)
                    """,
                    opportunityId,
                    contactId);
        }
    }

    private Long ensureDemoActivity(Long accountId, Long opportunityId, Long departmentId, Long userId) {
        return findId(
                """
                select id
                from crm_sales_activities
                where tenant_id = 1
                  and account_id = ?
                  and opportunity_id = ?
                  and subject = ?
                  and deleted_at is null
                """,
                accountId,
                opportunityId,
                DEMO_ACTIVITY_SUBJECT)
                .orElseGet(() -> insertAndReturnId(
                        """
                        insert into crm_sales_activities (
                            account_id, opportunity_id, subject, activity_type,
                            activity_status, activity_result, activity_time,
                            next_follow_up_at, owner_department_id, owner_user_id,
                            communication_content, customer_feedback, conclusion,
                            next_plan, risk_description, include_in_weekly_progress,
                            weekly_period, source_type, remark, completed_at,
                            completed_by, created_by, updated_by
                        )
                        values (?, ?, ?, 'meeting', 'completed', 'aligned',
                            current_timestamp, current_timestamp, ?, ?, ?, ?, ?, ?,
                            ?, true, 'current_week', 'v1_demo_seed', ?,
                            current_timestamp, ?, ?, ?)
                        """,
                        accountId,
                        opportunityId,
                        DEMO_ACTIVITY_SUBJECT,
                        departmentId,
                        userId,
                        "围绕CRM V1试点目标、角色权限、客户档案和商机推进节奏完成确认。",
                        "客户希望先以重点客户团队试点，验证周进展和提醒机制。",
                        "双方确认进入试点方案细化阶段。",
                        "三日内提交试点方案和演示账号。",
                        "需在方案中明确历史数据导入范围。",
                        "V1演示销售行动。",
                        userId,
                        userId,
                        userId));
    }

    private void ensureActivityContact(Long activityId, Long contactId) {
        if (count(
                "select count(*) from crm_activity_contacts where activity_id = ? and contact_id = ?",
                activityId,
                contactId) == 0) {
            jdbcTemplate.update(
                    """
                    insert into crm_activity_contacts (activity_id, contact_id)
                    values (?, ?)
                    """,
                    activityId,
                    contactId);
        }
    }

    private void ensureActivityParticipant(Long activityId, Long userId) {
        if (count(
                "select count(*) from crm_activity_participants where activity_id = ? and user_id = ?",
                activityId,
                userId) == 0) {
            jdbcTemplate.update(
                    """
                    insert into crm_activity_participants (activity_id, user_id, participant_role)
                    values (?, ?, 'owner')
                    """,
                    activityId,
                    userId);
        }
    }

    private void refreshDemoLastActivity(Long accountId, Long contactId, Long opportunityId, Long userId) {
        jdbcTemplate.update(
                """
                update crm_accounts
                set last_activity_at = current_timestamp,
                    last_activity_summary = ?,
                    next_follow_up_at = current_timestamp,
                    updated_by = ?,
                    updated_at = current_timestamp
                where id = ?
                """,
                DEMO_ACTIVITY_SUBJECT,
                userId,
                accountId);
        jdbcTemplate.update(
                """
                update crm_contacts
                set last_communication_at = current_timestamp,
                    last_communication_summary = ?,
                    updated_by = ?,
                    updated_at = current_timestamp
                where id = ?
                """,
                DEMO_ACTIVITY_SUBJECT,
                userId,
                contactId);
        jdbcTemplate.update(
                """
                update crm_opportunities
                set last_activity_at = current_timestamp,
                    last_activity_summary = ?,
                    updated_by = ?,
                    updated_at = current_timestamp
                where id = ?
                """,
                DEMO_ACTIVITY_SUBJECT,
                userId,
                opportunityId);
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
