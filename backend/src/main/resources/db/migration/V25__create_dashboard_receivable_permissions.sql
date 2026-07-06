insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.receivables.read', '查看回款看板', 'operation', 'dashboard', 1240
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.receivables.read'
);
