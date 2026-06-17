package com.canicula.crmai.identity;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Objects;
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
