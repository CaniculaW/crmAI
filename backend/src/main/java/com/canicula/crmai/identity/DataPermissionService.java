package com.canicula.crmai.identity;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DataPermissionService {

    private final JdbcTemplate jdbcTemplate;

    DataPermissionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public DataPermissionCondition buildCondition(
            Long userId,
            String moduleCode,
            DataPermissionColumns columns) {
        Set<String> scopes = dataScopes(userId, moduleCode);
        if (scopes.contains("global")) {
            return new DataPermissionCondition("1 = 1", List.of());
        }
        if (scopes.isEmpty()) {
            return new DataPermissionCondition("1 = 0", List.of());
        }

        List<String> clauses = new ArrayList<>();
        List<Object> parameters = new ArrayList<>();
        if (scopes.contains("own")) {
            clauses.add(columns.ownerUserIdColumn() + " = ?");
            parameters.add(userId);
        }

        Set<Long> departmentIds = allowedDepartmentIds(userId, scopes);
        if (!departmentIds.isEmpty()) {
            clauses.add(columns.ownerDepartmentIdColumn()
                    + " in ("
                    + String.join(", ", Collections.nCopies(departmentIds.size(), "?"))
                    + ")");
            parameters.addAll(departmentIds);
        }

        if (scopes.contains("collaborated") && columns.collaboratorExistsClause() != null) {
            clauses.add(columns.collaboratorExistsClause());
            parameters.add(userId);
        }

        if (clauses.isEmpty()) {
            return new DataPermissionCondition("1 = 0", List.of());
        }
        return new DataPermissionCondition("(" + String.join(" or ", clauses) + ")", parameters);
    }

    private Set<String> dataScopes(Long userId, String moduleCode) {
        return new LinkedHashSet<>(jdbcTemplate.queryForList(
                """
                select distinct ds.scope_code
                from sys_data_scopes ds
                join sys_role_data_scopes rds on rds.data_scope_id = ds.id
                join sys_user_roles ur on ur.role_id = rds.role_id
                where ur.user_id = ?
                  and rds.module_code = ?
                order by ds.scope_code
                """,
                String.class,
                userId,
                moduleCode));
    }

    private Set<Long> allowedDepartmentIds(Long userId, Set<String> scopes) {
        Long departmentId = userDepartmentId(userId);
        if (departmentId == null) {
            return Set.of();
        }
        Set<Long> departmentIds = new LinkedHashSet<>();
        if (scopes.contains("department")) {
            departmentIds.add(departmentId);
        }
        if (scopes.contains("department_tree")) {
            departmentIds.addAll(departmentTreeIds(departmentId));
        }
        return departmentIds;
    }

    private Long userDepartmentId(Long userId) {
        return jdbcTemplate.queryForObject(
                "select department_id from sys_users where id = ?",
                Long.class,
                userId);
    }

    private List<Long> departmentTreeIds(Long departmentId) {
        return jdbcTemplate.queryForList(
                """
                with recursive dept_tree(id) as (
                    select id
                    from sys_departments
                    where id = ?
                      and deleted_at is null
                    union all
                    select d.id
                    from sys_departments d
                    join dept_tree t on d.parent_id = t.id
                    where d.deleted_at is null
                )
                select id
                from dept_tree
                order by id
                """,
                Long.class,
                departmentId);
    }
}
