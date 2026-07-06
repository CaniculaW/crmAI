insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.read', '查看驾驶舱', 'operation', 'dashboard', 1200
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.read'
);
