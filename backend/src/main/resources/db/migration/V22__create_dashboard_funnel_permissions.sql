insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.funnel.read', '查看销售漏斗', 'operation', 'dashboard', 1210
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.funnel.read'
);
