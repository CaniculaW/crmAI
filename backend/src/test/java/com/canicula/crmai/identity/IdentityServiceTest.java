package com.canicula.crmai.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class IdentityServiceTest {

    @Autowired
    private IdentityService identityService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void createsUserRoleLoginAccountAndPermissionAssignments() {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "sales-east",
                "华东销售部",
                "CN-31",
                "active"));
        Long roleId = identityService.createRole(new RoleCreateRequest(
                "sales_rep",
                "销售个人",
                "负责客户、联系人、商机和销售行动"));
        Long permissionId = identityService.findPermissionIdByCode("account.create");
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "张三",
                "13800000001",
                "zhangsan@example.com",
                "sales_rep",
                "active"));

        Long loginAccountId = identityService.createLoginAccount(new LoginAccountCreateRequest(
                userId,
                "username",
                "zhangsan",
                true,
                "active"));
        identityService.assignRole(userId, roleId);
        identityService.grantPermission(roleId, permissionId);

        assertThat(loginAccountId).isPositive();
        assertThat(identityService.findRoleCodesByUserId(userId)).containsExactly("sales_rep");
        assertThat(identityService.findPermissionCodesByRoleId(roleId)).contains("account.create");
    }

    @Test
    void seedsPermissionAndDataScopeBaselines() {
        Integer permissionCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_permissions where permission_code in ('account.create', 'system.dict.manage')",
                Integer.class);
        Integer dataScopeCount = jdbcTemplate.queryForObject(
                "select count(*) from sys_data_scopes where scope_code in ('own', 'department', 'global')",
                Integer.class);

        assertThat(permissionCount).isEqualTo(2);
        assertThat(dataScopeCount).isEqualTo(3);
    }

    @Test
    void rejectsDuplicateLoginIdentifier() {
        Long departmentId = identityService.createDepartment(new DepartmentCreateRequest(
                null,
                "sales-south",
                "华南销售部",
                "CN-44",
                "active"));
        Long userId = identityService.createUser(new UserCreateRequest(
                departmentId,
                "李四",
                "13800000002",
                "lisi@example.com",
                "sales_rep",
                "active"));

        LoginAccountCreateRequest request = new LoginAccountCreateRequest(
                userId,
                "username",
                "lisi",
                true,
                "active");
        identityService.createLoginAccount(request);

        assertThatThrownBy(() -> identityService.createLoginAccount(request))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
