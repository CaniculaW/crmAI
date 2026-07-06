insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'ai.context.read', '查看AI上下文', 'operation', 'ai', 1300
where not exists (
    select 1 from sys_permissions where permission_code = 'ai.context.read'
);
