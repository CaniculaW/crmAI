package com.canicula.crmai.approval;

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
        String template_name,
        Boolean is_default,
        @Pattern(regexp = "active|inactive") String status) {
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
        String node_name,
        @Positive Long approver_role_id,
        @Pattern(regexp = "active|inactive") String status) {
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
