package com.canicula.crmai.approval;

import com.canicula.crmai.api.BusinessRuleException;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApprovalService {

    private static final long TENANT_ID = 1L;
    private static final Set<String> SUPPORTED_OBJECT_TYPES = Set.of("quotation", "bid", "contract");
    private static final Set<String> SUPPORTED_STATUSES = Set.of("active", "inactive");

    private final JdbcTemplate jdbcTemplate;

    ApprovalService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ApprovalTemplateResponse> listTemplates() {
        return jdbcTemplate.query(
                """
                select id, tenant_id, object_type, template_name, status, is_default,
                       created_by, created_at, updated_by, updated_at
                from approval_templates
                where tenant_id = ?
                  and deleted_at is null
                order by object_type, template_name, id
                """,
                ApprovalService::mapTemplate,
                TENANT_ID);
    }

    public ApprovalTemplateResponse findTemplate(Long templateId) {
        List<ApprovalTemplateResponse> templates = jdbcTemplate.query(
                """
                select id, tenant_id, object_type, template_name, status, is_default,
                       created_by, created_at, updated_by, updated_at
                from approval_templates
                where id = ?
                  and tenant_id = ?
                  and deleted_at is null
                """,
                ApprovalService::mapTemplate,
                templateId,
                TENANT_ID);
        if (templates.isEmpty()) {
            throw new BusinessRuleException("审批模板不存在或已删除");
        }
        return templates.get(0);
    }

    public ApprovalTemplateResponse findDefaultTemplate(String objectType, Long exceptTemplateId) {
        String normalizedObjectType = requireObjectType(objectType);
        List<ApprovalTemplateResponse> templates;
        if (exceptTemplateId == null) {
            templates = jdbcTemplate.query(
                    """
                    select id, tenant_id, object_type, template_name, status, is_default,
                           created_by, created_at, updated_by, updated_at
                    from approval_templates
                    where tenant_id = ?
                      and object_type = ?
                      and is_default = true
                      and deleted_at is null
                    order by id
                    limit 1
                    """,
                    ApprovalService::mapTemplate,
                    TENANT_ID,
                    normalizedObjectType);
        } else {
            templates = jdbcTemplate.query(
                    """
                    select id, tenant_id, object_type, template_name, status, is_default,
                           created_by, created_at, updated_by, updated_at
                    from approval_templates
                    where tenant_id = ?
                      and object_type = ?
                      and id <> ?
                      and is_default = true
                      and deleted_at is null
                    order by id
                    limit 1
                    """,
                    ApprovalService::mapTemplate,
                    TENANT_ID,
                    normalizedObjectType,
                    exceptTemplateId);
        }
        return templates.isEmpty() ? null : templates.get(0);
    }

    @Transactional
    public ApprovalTemplateResponse createTemplate(ApprovalTemplateCreateRequest request, Long actorUserId) {
        String objectType = requireObjectType(request.object_type());
        String templateName = cleanRequired(request.template_name(), "模板名称不能为空");
        String status = normalizeStatus(request.status(), "active");
        boolean isDefault = Boolean.TRUE.equals(request.is_default());
        if (isDefault) {
            clearDefaultTemplates(objectType, null, actorUserId);
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into approval_templates (
                        tenant_id, object_type, template_name, status, is_default, created_by
                    )
                    values (?, ?, ?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setLong(1, TENANT_ID);
            statement.setString(2, objectType);
            statement.setString(3, templateName);
            statement.setString(4, status);
            statement.setBoolean(5, isDefault);
            statement.setLong(6, actorUserId);
            return statement;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("审批模板创建失败");
        }
        return findTemplate(key.longValue());
    }

    @Transactional
    public ApprovalTemplateResponse updateTemplate(
            Long templateId,
            ApprovalTemplateUpdateRequest request,
            Long actorUserId) {
        ApprovalTemplateResponse existing = findTemplate(templateId);
        String templateName = request.template_name() == null
                ? existing.template_name()
                : cleanRequired(request.template_name(), "模板名称不能为空");
        String status = request.status() == null
                ? existing.status()
                : normalizeStatus(request.status(), null);
        boolean isDefault = request.is_default() == null
                ? existing.is_default()
                : request.is_default();

        if (isDefault) {
            clearDefaultTemplates(existing.object_type(), templateId, actorUserId);
        }
        jdbcTemplate.update(
                """
                update approval_templates
                set template_name = ?,
                    status = ?,
                    is_default = ?,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and tenant_id = ?
                  and deleted_at is null
                """,
                templateName,
                status,
                isDefault,
                actorUserId,
                templateId,
                TENANT_ID);
        return findTemplate(templateId);
    }

    public List<ApprovalTemplateNodeResponse> listTemplateNodes(Long templateId) {
        findTemplate(templateId);
        return jdbcTemplate.query(
                """
                select n.id, n.template_id, n.step_order, n.node_name, n.approver_role_id,
                       r.name as approver_role_name, n.status, n.created_at, n.updated_at
                from approval_template_nodes n
                join approval_templates t on t.id = n.template_id
                join sys_roles r on r.id = n.approver_role_id
                where n.template_id = ?
                  and t.tenant_id = ?
                  and t.deleted_at is null
                order by n.step_order, n.id
                """,
                ApprovalService::mapTemplateNode,
                templateId,
                TENANT_ID);
    }

    public ApprovalTemplateNodeResponse findTemplateNode(Long templateId, Long nodeId) {
        List<ApprovalTemplateNodeResponse> nodes = jdbcTemplate.query(
                """
                select n.id, n.template_id, n.step_order, n.node_name, n.approver_role_id,
                       r.name as approver_role_name, n.status, n.created_at, n.updated_at
                from approval_template_nodes n
                join approval_templates t on t.id = n.template_id
                join sys_roles r on r.id = n.approver_role_id
                where n.id = ?
                  and n.template_id = ?
                  and t.tenant_id = ?
                  and t.deleted_at is null
                """,
                ApprovalService::mapTemplateNode,
                nodeId,
                templateId,
                TENANT_ID);
        if (nodes.isEmpty()) {
            throw new BusinessRuleException("审批模板节点不存在");
        }
        return nodes.get(0);
    }

    @Transactional
    public ApprovalTemplateNodeResponse createTemplateNode(
            Long templateId,
            ApprovalTemplateNodeCreateRequest request) {
        findTemplate(templateId);
        int stepOrder = requireStepOrder(request.step_order());
        String nodeName = cleanRequired(request.node_name(), "节点名称不能为空");
        long approverRoleId = requireActiveRole(request.approver_role_id());
        String status = normalizeStatus(request.status(), "active");
        requireAvailableStepOrder(templateId, stepOrder, null);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        try {
            jdbcTemplate.update(connection -> {
                PreparedStatement statement = connection.prepareStatement(
                        """
                        insert into approval_template_nodes (
                            template_id, step_order, node_name, approver_role_id, status
                        )
                        values (?, ?, ?, ?, ?)
                        """,
                        new String[] {"id"});
                statement.setLong(1, templateId);
                statement.setInt(2, stepOrder);
                statement.setString(3, nodeName);
                statement.setLong(4, approverRoleId);
                statement.setString(5, status);
                return statement;
            }, keyHolder);
        } catch (DuplicateKeyException exception) {
            throw new BusinessRuleException("同一审批模板的节点顺序不能重复");
        }

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("审批模板节点创建失败");
        }
        return findTemplateNode(templateId, key.longValue());
    }

    @Transactional
    public ApprovalTemplateNodeResponse updateTemplateNode(
            Long templateId,
            Long nodeId,
            ApprovalTemplateNodeUpdateRequest request) {
        ApprovalTemplateNodeResponse existing = findTemplateNode(templateId, nodeId);
        int stepOrder = request.step_order() == null
                ? existing.step_order()
                : requireStepOrder(request.step_order());
        String nodeName = request.node_name() == null
                ? existing.node_name()
                : cleanRequired(request.node_name(), "节点名称不能为空");
        long approverRoleId = request.approver_role_id() == null
                ? existing.approver_role_id()
                : requireActiveRole(request.approver_role_id());
        String status = request.status() == null
                ? existing.status()
                : normalizeStatus(request.status(), null);
        requireAvailableStepOrder(templateId, stepOrder, nodeId);

        try {
            jdbcTemplate.update(
                    """
                    update approval_template_nodes
                    set step_order = ?,
                        node_name = ?,
                        approver_role_id = ?,
                        status = ?,
                        updated_at = current_timestamp
                    where id = ?
                      and template_id = ?
                    """,
                    stepOrder,
                    nodeName,
                    approverRoleId,
                    status,
                    nodeId,
                    templateId);
        } catch (DuplicateKeyException exception) {
            throw new BusinessRuleException("同一审批模板的节点顺序不能重复");
        }
        return findTemplateNode(templateId, nodeId);
    }

    private void clearDefaultTemplates(String objectType, Long exceptTemplateId, Long actorUserId) {
        if (exceptTemplateId == null) {
            jdbcTemplate.update(
                    """
                    update approval_templates
                    set is_default = false,
                        updated_by = ?,
                        updated_at = current_timestamp,
                        version = version + 1
                    where tenant_id = ?
                      and object_type = ?
                      and is_default = true
                      and deleted_at is null
                    """,
                    actorUserId,
                    TENANT_ID,
                    objectType);
            return;
        }
        jdbcTemplate.update(
                """
                update approval_templates
                set is_default = false,
                    updated_by = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where tenant_id = ?
                  and object_type = ?
                  and id <> ?
                  and is_default = true
                  and deleted_at is null
                """,
                actorUserId,
                TENANT_ID,
                objectType,
                exceptTemplateId);
    }

    private long requireActiveRole(Long roleId) {
        if (roleId == null) {
            throw new BusinessRuleException("审批角色不能为空");
        }
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_roles
                where id = ?
                  and tenant_id = ?
                  and deleted_at is null
                """,
                Integer.class,
                roleId,
                TENANT_ID);
        if (count == null || count == 0) {
            throw new BusinessRuleException("审批角色不存在或已删除");
        }
        return roleId;
    }

    private void requireAvailableStepOrder(Long templateId, int stepOrder, Long exceptNodeId) {
        Integer count;
        if (exceptNodeId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    select count(*)
                    from approval_template_nodes
                    where template_id = ?
                      and step_order = ?
                    """,
                    Integer.class,
                    templateId,
                    stepOrder);
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    select count(*)
                    from approval_template_nodes
                    where template_id = ?
                      and step_order = ?
                      and id <> ?
                    """,
                    Integer.class,
                    templateId,
                    stepOrder,
                    exceptNodeId);
        }
        if (count != null && count > 0) {
            throw new BusinessRuleException("同一审批模板的节点顺序不能重复");
        }
    }

    private static String requireObjectType(String objectType) {
        String normalized = cleanRequired(objectType, "审批对象类型不能为空");
        if (!SUPPORTED_OBJECT_TYPES.contains(normalized)) {
            throw new BusinessRuleException("不支持的审批对象类型");
        }
        return normalized;
    }

    private static int requireStepOrder(Integer stepOrder) {
        if (stepOrder == null || stepOrder <= 0) {
            throw new BusinessRuleException("节点顺序必须大于0");
        }
        return stepOrder;
    }

    private static String normalizeStatus(String status, String defaultStatus) {
        if (status == null) {
            return defaultStatus;
        }
        String normalized = status.strip();
        if (!SUPPORTED_STATUSES.contains(normalized)) {
            throw new BusinessRuleException("状态只能是active或inactive");
        }
        return normalized;
    }

    private static String cleanRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BusinessRuleException(message);
        }
        return value.strip();
    }

    private static ApprovalTemplateResponse mapTemplate(ResultSet rs, int rowNum) throws SQLException {
        return new ApprovalTemplateResponse(
                rs.getLong("id"),
                rs.getLong("tenant_id"),
                rs.getString("object_type"),
                rs.getString("template_name"),
                rs.getString("status"),
                rs.getBoolean("is_default"),
                rs.getLong("created_by"),
                rs.getObject("created_at", OffsetDateTime.class),
                nullableLong(rs, "updated_by"),
                rs.getObject("updated_at", OffsetDateTime.class));
    }

    private static ApprovalTemplateNodeResponse mapTemplateNode(ResultSet rs, int rowNum) throws SQLException {
        return new ApprovalTemplateNodeResponse(
                rs.getLong("id"),
                rs.getLong("template_id"),
                rs.getInt("step_order"),
                rs.getString("node_name"),
                rs.getLong("approver_role_id"),
                rs.getString("approver_role_name"),
                rs.getString("status"),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class));
    }

    private static Long nullableLong(ResultSet rs, String columnName) throws SQLException {
        long value = rs.getLong(columnName);
        return rs.wasNull() ? null : value;
    }
}
