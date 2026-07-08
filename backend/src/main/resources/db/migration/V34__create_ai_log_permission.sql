insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'ai.log.read', '查看AI日志', 'operation', 'ai', 1360
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'ai.log.read'
);

insert into sys_role_permissions (role_id, permission_id)
select distinct rp.role_id, ai_log.id
from sys_role_permissions rp
join sys_permissions existing_permission on existing_permission.id = rp.permission_id
join sys_permissions ai_log on ai_log.permission_code = 'ai.log.read'
where existing_permission.permission_code in ('ai.draft.manage', 'ai.context.read', 'system.role.manage')
  and not exists (
      select 1
      from sys_role_permissions existing_role_permission
      where existing_role_permission.role_id = rp.role_id
        and existing_role_permission.permission_id = ai_log.id
  );
