insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.contracts.read', '查看合同看板', 'operation', 'dashboard', 1220
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.contracts.read'
);
