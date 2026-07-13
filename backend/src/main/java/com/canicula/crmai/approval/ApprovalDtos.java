package com.canicula.crmai.approval;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import java.time.OffsetDateTime;

record ApprovalTemplateCreateRequest(
        @NotBlank String object_type,
        @NotBlank String template_name,
        Boolean is_default,
        @Pattern(regexp = "active|inactive") String status) {
}

record ApprovalTemplateUpdateRequest(
        @Pattern(regexp = "(?s).*\\S.*") String template_name,
        Boolean is_default,
        @Pattern(regexp = "active|inactive") String status) {

    @AssertTrue(message = "至少提供一个模板更新字段")
    public boolean isValidPatch() {
        return template_name != null || is_default != null || status != null;
    }
}

record ApprovalTemplateResponse(
        Long id,
        Long tenant_id,
        String object_type,
        String template_name,
        String status,
        Boolean is_default,
        Long created_by,
        OffsetDateTime created_at,
        Long updated_by,
        OffsetDateTime updated_at) {
}

record ApprovalTemplateNodeCreateRequest(
        @NotNull @Positive Integer step_order,
        @NotBlank String node_name,
        @NotNull @Positive Long approver_role_id,
        @Pattern(regexp = "active|inactive") String status) {
}

record ApprovalTemplateNodeUpdateRequest(
        @Positive Integer step_order,
        @Pattern(regexp = "(?s).*\\S.*") String node_name,
        @Positive Long approver_role_id,
        @Pattern(regexp = "active|inactive") String status) {

    @AssertTrue(message = "至少提供一个节点更新字段")
    public boolean isValidPatch() {
        return step_order != null || node_name != null || approver_role_id != null || status != null;
    }
}

record ApprovalTemplateNodeResponse(
        Long id,
        Long template_id,
        Integer step_order,
        String node_name,
        Long approver_role_id,
        String approver_role_name,
        String status,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}
