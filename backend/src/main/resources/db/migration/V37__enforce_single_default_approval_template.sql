update approval_templates current_template
set is_default = false,
    updated_at = current_timestamp,
    version = version + 1
where current_template.is_default = true
  and current_template.deleted_at is null
  and exists (
      select 1
      from approval_templates newer_template
      where newer_template.tenant_id = current_template.tenant_id
        and newer_template.object_type = current_template.object_type
        and newer_template.is_default = true
        and newer_template.deleted_at is null
        and newer_template.id > current_template.id
  );

${approvalDefaultUniqueIndex}
