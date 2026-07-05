insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'dashboard.risks.read', '查看风险预警', 'operation', 'dashboard', 1250
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'dashboard.risks.read'
);
