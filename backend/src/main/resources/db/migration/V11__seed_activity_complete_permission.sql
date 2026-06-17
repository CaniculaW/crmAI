insert into sys_permissions (permission_code, permission_name, permission_type, module_code, sort_order)
select 'activity.complete', '完成销售行动', 'operation', 'activity', 430
where not exists (
    select 1
    from sys_permissions
    where permission_code = 'activity.complete'
);
