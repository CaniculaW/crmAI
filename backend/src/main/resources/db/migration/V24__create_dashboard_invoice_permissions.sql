insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.invoices.read', '查看开票看板', 'operation', 'dashboard', 1230
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.invoices.read'
);
