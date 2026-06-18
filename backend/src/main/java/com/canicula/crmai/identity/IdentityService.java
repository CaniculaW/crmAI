package com.canicula.crmai.identity;

import com.canicula.crmai.auth.RoleSummary;
import java.sql.PreparedStatement;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentityService {

    private final JdbcTemplate jdbcTemplate;

    IdentityService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public Long createDepartment(DepartmentCreateRequest request) {
        return insertAndReturnId("""
                insert into sys_departments (parent_id, code, name, region_code, status)
                values (?, ?, ?, ?, ?)
                """,
                request.parentId(),
                request.code(),
                request.name(),
                request.regionCode(),
                request.status() == null ? "active" : request.status());
    }

    @Transactional
    public Long createRole(RoleCreateRequest request) {
        return insertAndReturnId("""
                insert into sys_roles (code, name, description)
                values (?, ?, ?)
                """,
                request.code(),
                request.name(),
                request.description());
    }

    @Transactional
    public Long createUser(UserCreateRequest request) {
        return insertAndReturnId("""
                insert into sys_users (department_id, name, mobile, email, role_code, status)
                values (?, ?, ?, ?, ?, ?)
                """,
                request.departmentId(),
                request.name(),
                request.mobile(),
                request.email(),
                request.roleCode(),
                request.status() == null ? "active" : request.status());
    }

    @Transactional
    public Long createLoginAccount(LoginAccountCreateRequest request) {
        return insertAndReturnId("""
                insert into sys_login_accounts (user_id, login_type, login_identifier, is_primary, status)
                values (?, ?, ?, ?, ?)
                """,
                request.userId(),
                request.loginType(),
                request.loginIdentifier(),
                request.primary(),
                request.status() == null ? "active" : request.status());
    }

    @Transactional
    public void assignRole(Long userId, Long roleId) {
        jdbcTemplate.update(
                """
                insert into sys_user_roles (user_id, role_id)
                values (?, ?)
                """,
                userId,
                roleId);
    }

    @Transactional
    public void grantPermission(Long roleId, Long permissionId) {
        jdbcTemplate.update(
                """
                insert into sys_role_permissions (role_id, permission_id)
                values (?, ?)
                """,
                roleId,
                permissionId);
    }

    public Long findPermissionIdByCode(String permissionCode) {
        return jdbcTemplate.queryForObject(
                "select id from sys_permissions where permission_code = ?",
                Long.class,
                permissionCode);
    }

    public List<String> findRoleCodesByUserId(Long userId) {
        return jdbcTemplate.queryForList(
                """
                select r.code
                from sys_roles r
                join sys_user_roles ur on ur.role_id = r.id
                where ur.user_id = ?
                order by r.code
                """,
                String.class,
                userId);
    }

    public List<String> findPermissionCodesByRoleId(Long roleId) {
        return jdbcTemplate.queryForList(
                """
                select p.permission_code
                from sys_permissions p
                join sys_role_permissions rp on rp.permission_id = p.id
                where rp.role_id = ?
                order by p.permission_code
                """,
                String.class,
                roleId);
    }

    public List<UserAdminResponse> listUsers() {
        return jdbcTemplate.query(
                """
                select id, department_id, name, mobile, email, role_code, status, last_login_at
                from sys_users
                where deleted_at is null
                order by id
                """,
                (rs, rowNum) -> new UserAdminResponse(
                        rs.getLong("id"),
                        nullableLong(rs.getObject("department_id")),
                        rs.getString("name"),
                        rs.getString("mobile"),
                        rs.getString("email"),
                        rs.getString("role_code"),
                        rs.getString("status"),
                        rs.getObject("last_login_at", java.time.OffsetDateTime.class),
                        findRoleSummariesByUserId(rs.getLong("id"))));
    }

    public List<RoleAdminResponse> listRoles() {
        return jdbcTemplate.query(
                """
                select id, code, name, description
                from sys_roles
                where deleted_at is null
                order by code
                """,
                (rs, rowNum) -> toRoleAdminResponse(
                        rs.getLong("id"),
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getString("description")));
    }

    public List<PermissionResponse> listPermissions() {
        return jdbcTemplate.query(
                """
                select id, permission_code, permission_name, permission_type, module_code
                from sys_permissions
                where is_active = true
                order by module_code, sort_order, permission_code
                """,
                (rs, rowNum) -> new PermissionResponse(
                        rs.getLong("id"),
                        rs.getString("permission_code"),
                        rs.getString("permission_name"),
                        rs.getString("permission_type"),
                        rs.getString("module_code")));
    }

    @Transactional
    public RolePermissionChange replaceRolePermissions(Long roleId, List<String> permissionCodes) {
        RoleAdminResponse beforeRole = findRole(roleId);
        Set<String> normalizedCodes = new LinkedHashSet<>(permissionCodes == null ? List.of() : permissionCodes);
        jdbcTemplate.update("delete from sys_role_permissions where role_id = ?", roleId);
        normalizedCodes.forEach(permissionCode ->
                grantPermission(roleId, findPermissionIdByCode(permissionCode)));
        RoleAdminResponse afterRole = findRole(roleId);
        return new RolePermissionChange(beforeRole, afterRole);
    }

    @Transactional
    public void updateLoginAccountStatus(String loginType, String loginIdentifier, String status) {
        jdbcTemplate.update(
                """
                update sys_login_accounts
                set status = ?,
                    updated_at = current_timestamp
                where login_type = ?
                  and login_identifier = ?
                """,
                status,
                loginType,
                loginIdentifier);
    }

    private RoleAdminResponse findRole(Long roleId) {
        return jdbcTemplate.queryForObject(
                """
                select id, code, name, description
                from sys_roles
                where id = ?
                  and deleted_at is null
                """,
                (rs, rowNum) -> toRoleAdminResponse(
                        rs.getLong("id"),
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getString("description")),
                roleId);
    }

    private RoleAdminResponse toRoleAdminResponse(Long id, String code, String name, String description) {
        return new RoleAdminResponse(id, code, name, description, findPermissionCodesByRoleId(id));
    }

    private List<RoleSummary> findRoleSummariesByUserId(Long userId) {
        return jdbcTemplate.query(
                """
                select r.id, r.code, r.name
                from sys_roles r
                join sys_user_roles ur on ur.role_id = r.id
                where ur.user_id = ?
                order by r.code
                """,
                (rs, rowNum) -> new RoleSummary(
                        rs.getLong("id"),
                        rs.getString("code"),
                        rs.getString("name")),
                userId);
    }

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
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
}
