package com.canicula.crmai.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class DataPermissionServiceTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private DataPermissionService dataPermissionService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void buildsOwnDepartmentTreeAndCollaboratedCondition() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long parentDepartmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "scope-parent-" + suffix,
                "数据权限上级部",
                "CN-31",
                "active"));
        Long childDepartmentId = identityService.createDepartment(new DepartmentCreateRequest(
                parentDepartmentId,
                "scope-child-" + suffix,
                "数据权限本部门",
                "CN-31",
                "active"));
        Long grandchildDepartmentId = identityService.createDepartment(new DepartmentCreateRequest(
                childDepartmentId,
                "scope-grandchild-" + suffix,
                "数据权限下级部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "scope_role_" + suffix,
                "数据权限角色",
                "数据权限角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                childDepartmentId,
                "数据权限用户",
                null,
                "scope_" + suffix + "@example.com",
                "sales_rep",
                "active"));
        identityService.assignRole(userId, roleId);
        grantDataScope(roleId, "account", "own");
        grantDataScope(roleId, "account", "department_tree");
        grantDataScope(roleId, "account", "collaborated");

        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "account",
                new DataPermissionColumns(
                        "a.owner_user_id",
                        "a.owner_department_id",
                        "exists (select 1 from crm_account_collaborators ac where ac.account_id = a.id and ac.user_id = ?)"));

        assertThat(condition.clause()).isEqualTo(
                "(a.owner_user_id = ? or a.owner_department_id in (?, ?) "
                        + "or exists (select 1 from crm_account_collaborators ac where ac.account_id = a.id and ac.user_id = ?))");
        assertThat(condition.parameters()).containsExactly(
                userId,
                childDepartmentId,
                grandchildDepartmentId,
                userId);
    }

    @Test
    void globalScopeAllowsAllRows() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "scope-global-" + suffix,
                "全局数据权限部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "scope_global_role_" + suffix,
                "全局数据权限角色",
                "全局数据权限角色"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "全局数据权限用户",
                null,
                "scope_global_" + suffix + "@example.com",
                "sales_manager",
                "active"));
        identityService.assignRole(userId, roleId);
        grantDataScope(roleId, "account", "global");

        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "account",
                new DataPermissionColumns(
                        "a.owner_user_id",
                        "a.owner_department_id",
                        "exists (select 1 from crm_account_collaborators ac where ac.account_id = a.id and ac.user_id = ?)"));

        assertThat(condition.clause()).isEqualTo("1 = 1");
        assertThat(condition.parameters()).isEmpty();
    }

    @Test
    void missingScopeDeniesAllRows() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "scope-empty-" + suffix,
                "空数据权限部",
                "CN-31",
                "active"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "空数据权限用户",
                null,
                "scope_empty_" + suffix + "@example.com",
                "sales_rep",
                "active"));

        DataPermissionCondition condition = dataPermissionService.buildCondition(
                userId,
                "account",
                new DataPermissionColumns("a.owner_user_id", "a.owner_department_id", null));

        assertThat(condition.clause()).isEqualTo("1 = 0");
        assertThat(condition.parameters()).isEqualTo(List.of());
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
}
