insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'opportunity.close', '关闭商机', 'operation', 'opportunity', 330
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'opportunity.close'
);

insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'opportunity.reopen', '重启商机', 'operation', 'opportunity', 340
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'opportunity.reopen'
);
