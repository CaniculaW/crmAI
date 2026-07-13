package com.canicula.crmai.approval;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import java.time.OffsetDateTime;
import java.util.List;

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

record ApprovalApproverRoleResponse(
        Long id,
        String code,
        String name) {
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

record ApprovalSubmitRequest(
        @NotBlank String object_type,
        @NotNull @Positive Long object_id,
        @NotBlank String object_name) {
}

record ApprovalDecisionRequest(String comment) {
}

record ApprovalInstanceResponse(
        Long id,
        Long tenant_id,
        Long template_id,
        String object_type,
        Long object_id,
        String object_name,
        String status,
        Integer current_step_order,
        Long submitted_by,
        OffsetDateTime submitted_at,
        OffsetDateTime completed_at,
        String result_comment,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}

record ApprovalInstanceNodeResponse(
        Long id,
        Long instance_id,
        Integer step_order,
        String node_name,
        Long approver_role_id,
        String approver_role_name,
        String status,
        Long handled_by,
        OffsetDateTime handled_at,
        String comment,
        OffsetDateTime created_at,
        OffsetDateTime updated_at) {
}

record ApprovalActionResponse(
        Long id,
        Long instance_id,
        Long node_id,
        String action,
        Long actor_user_id,
        String comment,
        OffsetDateTime action_at) {
}

record ApprovalInstanceDetailResponse(
        ApprovalInstanceResponse instance,
        List<ApprovalInstanceNodeResponse> nodes,
        List<ApprovalActionResponse> actions) {
}

record ApprovalTaskResponse(
        ApprovalInstanceResponse instance,
        ApprovalInstanceNodeResponse current_node) {
}

record ApprovalObjectStatusResponse(
        String object_type,
        Long object_id,
        ApprovalInstanceDetailResponse instance,
        List<ApprovalInstanceDetailResponse> history) {
}
