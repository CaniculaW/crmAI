package com.canicula.crmai.approval;

import com.canicula.crmai.api.BusinessRuleException;
import com.canicula.crmai.auth.ForbiddenException;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
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

    @Transactional
    public ApprovalInstanceResponse submit(
            String objectType,
            Long objectId,
            String objectName,
            Long actorUserId) {
        String normalizedObjectType = requireObjectType(objectType);
        if (objectId == null || objectId <= 0) {
            throw new BusinessRuleException("审批对象ID必须大于0");
        }
        String normalizedObjectName = cleanRequired(objectName, "审批对象名称不能为空");
        Long templateId = lockDefaultTemplate(normalizedObjectType);
        requireNoPendingInstance(normalizedObjectType, objectId);
        requireBusinessObject(normalizedObjectType, objectId);

        List<WorkflowNode> workflowNodes = findActiveWorkflowNodes(templateId);
        if (workflowNodes.isEmpty()) {
            throw new BusinessRuleException("默认审批模板没有有效节点");
        }
        workflowNodes.forEach(this::requireEligibleApprover);

        long instanceId = insertInstance(
                templateId,
                normalizedObjectType,
                objectId,
                normalizedObjectName,
                workflowNodes.get(0).stepOrder(),
                actorUserId);
        for (int index = 0; index < workflowNodes.size(); index++) {
            WorkflowNode node = workflowNodes.get(index);
            jdbcTemplate.update(
                    """
                    insert into approval_instance_nodes (
                        instance_id, step_order, node_name, approver_role_id, status
                    )
                    values (?, ?, ?, ?, ?)
                    """,
                    instanceId,
                    node.stepOrder(),
                    node.nodeName(),
                    node.approverRoleId(),
                    index == 0 ? "pending" : "waiting");
        }
        insertAction(instanceId, null, "submit", actorUserId, null);
        syncBusinessStatus(normalizedObjectType, objectId, "submit");
        return findInstance(instanceId);
    }

    @Transactional
    public ApprovalInstanceResponse approve(Long instanceId, String comment, Long actorUserId) {
        DecisionContext context = requireDecisionContext(instanceId, actorUserId);
        String normalizedComment = cleanOptional(comment);
        int updatedNodeCount = jdbcTemplate.update(
                """
                update approval_instance_nodes
                set status = 'approved',
                    handled_by = ?,
                    handled_at = current_timestamp,
                    comment = ?,
                    updated_at = current_timestamp
                where id = ?
                  and instance_id = ?
                  and status = 'pending'
                """,
                actorUserId,
                normalizedComment,
                context.node().id(),
                instanceId);
        requireSinglePendingUpdate(updatedNodeCount);

        ApprovalInstanceNodeResponse nextNode = findNextWaitingNode(instanceId, context.node().step_order());
        if (nextNode == null) {
            int updatedInstanceCount = jdbcTemplate.update(
                    """
                    update approval_instances
                    set status = 'approved',
                        current_step_order = null,
                        completed_at = current_timestamp,
                        result_comment = ?,
                        updated_at = current_timestamp
                    where id = ?
                      and tenant_id = ?
                      and status = 'pending'
                    """,
                    normalizedComment,
                    instanceId,
                    TENANT_ID);
            requireSinglePendingUpdate(updatedInstanceCount);
            syncBusinessStatus(context.instance().object_type(), context.instance().object_id(), "approve");
        } else {
            int activatedCount = jdbcTemplate.update(
                    """
                    update approval_instance_nodes
                    set status = 'pending',
                        updated_at = current_timestamp
                    where id = ?
                      and instance_id = ?
                      and status = 'waiting'
                    """,
                    nextNode.id(),
                    instanceId);
            if (activatedCount != 1) {
                throw new BusinessRuleException("审批状态已变化，请刷新后重试");
            }
            int advancedCount = jdbcTemplate.update(
                    """
                    update approval_instances
                    set current_step_order = ?,
                        updated_at = current_timestamp
                    where id = ?
                      and tenant_id = ?
                      and status = 'pending'
                      and current_step_order = ?
                    """,
                    nextNode.step_order(),
                    instanceId,
                    TENANT_ID,
                    context.node().step_order());
            requireSinglePendingUpdate(advancedCount);
        }
        insertAction(instanceId, context.node().id(), "approve", actorUserId, normalizedComment);
        return findInstance(instanceId);
    }

    @Transactional
    public ApprovalInstanceResponse reject(Long instanceId, String comment, Long actorUserId) {
        String normalizedComment = cleanRequired(comment, "驳回意见不能为空");
        DecisionContext context = requireDecisionContext(instanceId, actorUserId);
        int updatedNodeCount = jdbcTemplate.update(
                """
                update approval_instance_nodes
                set status = 'rejected',
                    handled_by = ?,
                    handled_at = current_timestamp,
                    comment = ?,
                    updated_at = current_timestamp
                where id = ?
                  and instance_id = ?
                  and status = 'pending'
                """,
                actorUserId,
                normalizedComment,
                context.node().id(),
                instanceId);
        requireSinglePendingUpdate(updatedNodeCount);
        int updatedInstanceCount = jdbcTemplate.update(
                """
                update approval_instances
                set status = 'rejected',
                    current_step_order = null,
                    completed_at = current_timestamp,
                    result_comment = ?,
                    updated_at = current_timestamp
                where id = ?
                  and tenant_id = ?
                  and status = 'pending'
                  and current_step_order = ?
                """,
                normalizedComment,
                instanceId,
                TENANT_ID,
                context.node().step_order());
        requireSinglePendingUpdate(updatedInstanceCount);
        insertAction(instanceId, context.node().id(), "reject", actorUserId, normalizedComment);
        syncBusinessStatus(context.instance().object_type(), context.instance().object_id(), "reject");
        return findInstance(instanceId);
    }

    public List<ApprovalTaskResponse> listTasks(String bucket, Long actorUserId) {
        String normalizedBucket = cleanRequired(bucket, "任务分组不能为空");
        List<Long> instanceIds = switch (normalizedBucket) {
            case "pending" -> findPendingTaskIds(actorUserId);
            case "started" -> findStartedTaskIds(actorUserId);
            case "processed" -> findProcessedTaskIds(actorUserId);
            default -> throw new BusinessRuleException("任务分组只能是pending、started或processed");
        };
        List<ApprovalTaskResponse> tasks = new ArrayList<>();
        for (Long id : instanceIds) {
            ApprovalInstanceResponse instance = findInstance(id);
            tasks.add(new ApprovalTaskResponse(instance, findCurrentNode(instance)));
        }
        return tasks;
    }

    public ApprovalInstanceResponse findInstance(Long instanceId) {
        List<ApprovalInstanceResponse> instances = jdbcTemplate.query(
                """
                select id, tenant_id, template_id, object_type, object_id, object_name,
                       status, current_step_order, submitted_by, submitted_at,
                       completed_at, result_comment, created_at, updated_at
                from approval_instances
                where id = ?
                  and tenant_id = ?
                """,
                ApprovalService::mapInstance,
                instanceId,
                TENANT_ID);
        if (instances.isEmpty()) {
            throw new BusinessRuleException("审批实例不存在");
        }
        return instances.get(0);
    }

    public ApprovalInstanceDetailResponse findInstanceDetail(Long instanceId) {
        ApprovalInstanceResponse instance = findInstance(instanceId);
        return new ApprovalInstanceDetailResponse(
                instance,
                findInstanceNodes(instanceId),
                findActions(instanceId));
    }

    public ApprovalObjectStatusResponse findObjectStatus(String objectType, Long objectId) {
        String normalizedObjectType = requireObjectType(objectType);
        if (objectId == null || objectId <= 0) {
            throw new BusinessRuleException("审批对象ID必须大于0");
        }
        List<Long> instanceIds = jdbcTemplate.queryForList(
                """
                select id
                from approval_instances
                where tenant_id = ?
                  and object_type = ?
                  and object_id = ?
                order by submitted_at desc, id desc
                """,
                Long.class,
                TENANT_ID,
                normalizedObjectType,
                objectId);
        List<ApprovalInstanceDetailResponse> history = instanceIds.stream()
                .map(this::findInstanceDetail)
                .toList();
        return new ApprovalObjectStatusResponse(
                normalizedObjectType,
                objectId,
                history.isEmpty() ? null : history.get(0),
                history);
    }

    private Long lockDefaultTemplate(String objectType) {
        List<Long> templateIds = jdbcTemplate.query(
                """
                select id
                from approval_templates
                where tenant_id = ?
                  and object_type = ?
                  and status = 'active'
                  and is_default = true
                  and deleted_at is null
                order by id
                limit 1
                for update
                """,
                (rs, rowNum) -> rs.getLong("id"),
                TENANT_ID,
                objectType);
        if (templateIds.isEmpty()) {
            throw new BusinessRuleException("未配置启用的默认审批模板");
        }
        return templateIds.get(0);
    }

    private void requireNoPendingInstance(String objectType, Long objectId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from approval_instances
                where tenant_id = ?
                  and object_type = ?
                  and object_id = ?
                  and status = 'pending'
                """,
                Integer.class,
                TENANT_ID,
                objectType,
                objectId);
        if (count != null && count > 0) {
            throw new BusinessRuleException("该对象已有待处理审批实例");
        }
    }

    private List<WorkflowNode> findActiveWorkflowNodes(Long templateId) {
        return jdbcTemplate.query(
                """
                select step_order, node_name, approver_role_id
                from approval_template_nodes
                where template_id = ?
                  and status = 'active'
                order by step_order, id
                """,
                (rs, rowNum) -> new WorkflowNode(
                        rs.getInt("step_order"),
                        rs.getString("node_name"),
                        rs.getLong("approver_role_id")),
                templateId);
    }

    private void requireEligibleApprover(WorkflowNode node) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_roles r
                join sys_user_roles ur on ur.role_id = r.id
                join sys_users u on u.id = ur.user_id
                where r.id = ?
                  and r.tenant_id = ?
                  and r.deleted_at is null
                  and u.tenant_id = ?
                  and u.status = 'active'
                  and u.deleted_at is null
                """,
                Integer.class,
                node.approverRoleId(),
                TENANT_ID,
                TENANT_ID);
        if (count == null || count == 0) {
            throw new BusinessRuleException("审批节点未配置有效审批人");
        }
    }

    private long insertInstance(
            Long templateId,
            String objectType,
            Long objectId,
            String objectName,
            Integer currentStepOrder,
            Long actorUserId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into approval_instances (
                        tenant_id, template_id, object_type, object_id, object_name,
                        status, current_step_order, submitted_by
                    )
                    values (?, ?, ?, ?, ?, 'pending', ?, ?)
                    """,
                    new String[] {"id"});
            statement.setLong(1, TENANT_ID);
            statement.setLong(2, templateId);
            statement.setString(3, objectType);
            statement.setLong(4, objectId);
            statement.setString(5, objectName);
            statement.setInt(6, currentStepOrder);
            statement.setLong(7, actorUserId);
            return statement;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("审批实例创建失败");
        }
        return key.longValue();
    }

    private DecisionContext requireDecisionContext(Long instanceId, Long actorUserId) {
        ApprovalInstanceResponse instance = findInstance(instanceId);
        if (!"pending".equals(instance.status()) || instance.current_step_order() == null) {
            throw new BusinessRuleException("审批实例已处理或状态已变化");
        }
        ApprovalInstanceNodeResponse node = findCurrentNode(instance);
        if (node == null || !"pending".equals(node.status())) {
            throw new BusinessRuleException("当前审批节点已处理或状态已变化");
        }
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sys_users u
                join sys_user_roles ur on ur.user_id = u.id
                join sys_roles r on r.id = ur.role_id
                where u.id = ?
                  and u.tenant_id = ?
                  and u.status = 'active'
                  and u.deleted_at is null
                  and r.id = ?
                  and r.tenant_id = ?
                  and r.deleted_at is null
                """,
                Integer.class,
                actorUserId,
                TENANT_ID,
                node.approver_role_id(),
                TENANT_ID);
        if (count == null || count == 0) {
            throw new ForbiddenException("当前用户不是该节点的有效审批人");
        }
        return new DecisionContext(instance, node);
    }

    private ApprovalInstanceNodeResponse findNextWaitingNode(Long instanceId, Integer currentStepOrder) {
        List<ApprovalInstanceNodeResponse> nodes = jdbcTemplate.query(
                nodeSelect() + """
                 where n.instance_id = ?
                   and n.step_order > ?
                   and n.status = 'waiting'
                 order by n.step_order, n.id
                 limit 1
                """,
                ApprovalService::mapInstanceNode,
                instanceId,
                currentStepOrder);
        return nodes.isEmpty() ? null : nodes.get(0);
    }

    private ApprovalInstanceNodeResponse findCurrentNode(ApprovalInstanceResponse instance) {
        if (instance.current_step_order() == null) {
            return null;
        }
        List<ApprovalInstanceNodeResponse> nodes = jdbcTemplate.query(
                nodeSelect() + """
                 where n.instance_id = ?
                   and n.step_order = ?
                 order by n.id
                 limit 1
                """,
                ApprovalService::mapInstanceNode,
                instance.id(),
                instance.current_step_order());
        return nodes.isEmpty() ? null : nodes.get(0);
    }

    private List<ApprovalInstanceNodeResponse> findInstanceNodes(Long instanceId) {
        return jdbcTemplate.query(
                nodeSelect() + """
                 where n.instance_id = ?
                 order by n.step_order, n.id
                """,
                ApprovalService::mapInstanceNode,
                instanceId);
    }

    private List<ApprovalActionResponse> findActions(Long instanceId) {
        return jdbcTemplate.query(
                """
                select id, instance_id, node_id, action, actor_user_id, comment, action_at
                from approval_actions
                where instance_id = ?
                order by action_at, id
                """,
                ApprovalService::mapAction,
                instanceId);
    }

    private List<Long> findPendingTaskIds(Long actorUserId) {
        return jdbcTemplate.queryForList(
                """
                select i.id
                from approval_instances i
                where i.tenant_id = ?
                  and i.status = 'pending'
                  and exists (
                      select 1
                      from approval_instance_nodes n
                      join sys_user_roles ur on ur.role_id = n.approver_role_id
                      join sys_users u on u.id = ur.user_id
                      join sys_roles r on r.id = ur.role_id
                      where n.instance_id = i.id
                        and n.step_order = i.current_step_order
                        and n.status = 'pending'
                        and ur.user_id = ?
                        and u.tenant_id = ?
                        and u.status = 'active'
                        and u.deleted_at is null
                        and r.tenant_id = ?
                        and r.deleted_at is null
                  )
                order by i.submitted_at desc, i.id desc
                """,
                Long.class,
                TENANT_ID,
                actorUserId,
                TENANT_ID,
                TENANT_ID);
    }

    private List<Long> findStartedTaskIds(Long actorUserId) {
        return jdbcTemplate.queryForList(
                """
                select id
                from approval_instances
                where tenant_id = ?
                  and submitted_by = ?
                  and status = 'pending'
                order by submitted_at desc, id desc
                """,
                Long.class,
                TENANT_ID,
                actorUserId);
    }

    private List<Long> findProcessedTaskIds(Long actorUserId) {
        return jdbcTemplate.queryForList(
                """
                select i.id
                from approval_instances i
                where i.tenant_id = ?
                  and exists (
                      select 1
                      from approval_actions a
                      where a.instance_id = i.id
                        and a.actor_user_id = ?
                        and a.action in ('approve', 'reject')
                  )
                order by i.submitted_at desc, i.id desc
                """,
                Long.class,
                TENANT_ID,
                actorUserId);
    }

    private void requireBusinessObject(String objectType, Long objectId) {
        Integer count;
        if ("contract".equals(objectType)) {
            count = jdbcTemplate.queryForObject(
                    """
                    select count(*)
                    from crm_contracts
                    where id = ?
                      and tenant_id = ?
                      and deleted_at is null
                    """,
                    Integer.class,
                    objectId,
                    TENANT_ID);
        } else if ("bid".equals(objectType)) {
            count = jdbcTemplate.queryForObject(
                    """
                    select count(*)
                    from crm_solution_documents
                    where id = ?
                      and tenant_id = ?
                      and deleted_at is null
                      and lower(document_type) in ('bid_document', 'bid')
                    """,
                    Integer.class,
                    objectId,
                    TENANT_ID);
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    select count(*)
                    from crm_solution_documents
                    where id = ?
                      and tenant_id = ?
                      and deleted_at is null
                      and (
                          lower(document_type) = 'quotation'
                          or (
                              lower(document_type) not in ('bid_document', 'bid')
                              and quotation_amount is not null
                          )
                      )
                    """,
                    Integer.class,
                    objectId,
                    TENANT_ID);
        }
        if (count == null || count == 0) {
            throw new BusinessRuleException("审批业务对象不存在或类型不匹配");
        }
    }

    private void syncBusinessStatus(String objectType, Long objectId, String transition) {
        String targetStatus;
        if ("contract".equals(objectType)) {
            targetStatus = switch (transition) {
                case "submit" -> "approving";
                case "approve" -> "pending_signature";
                case "reject" -> "drafting";
                default -> throw new IllegalArgumentException("Unsupported approval transition");
            };
            int updated = jdbcTemplate.update(
                    """
                    update crm_contracts
                    set contract_status = ?,
                        updated_at = current_timestamp,
                        version = version + 1
                    where id = ?
                      and tenant_id = ?
                      and deleted_at is null
                    """,
                    targetStatus,
                    objectId,
                    TENANT_ID);
            if (updated != 1) {
                throw new BusinessRuleException("审批业务对象状态更新失败");
            }
            return;
        }
        targetStatus = switch (transition) {
            case "submit" -> "approving";
            case "approve" -> "approved";
            case "reject" -> "draft";
            default -> throw new IllegalArgumentException("Unsupported approval transition");
        };
        int updated = jdbcTemplate.update(
                """
                update crm_solution_documents
                set status = ?,
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and tenant_id = ?
                  and deleted_at is null
                """,
                targetStatus,
                objectId,
                TENANT_ID);
        if (updated != 1) {
            throw new BusinessRuleException("审批业务对象状态更新失败");
        }
    }

    private void insertAction(
            Long instanceId,
            Long nodeId,
            String action,
            Long actorUserId,
            String comment) {
        jdbcTemplate.update(
                """
                insert into approval_actions (
                    instance_id, node_id, action, actor_user_id, comment
                )
                values (?, ?, ?, ?, ?)
                """,
                instanceId,
                nodeId,
                action,
                actorUserId,
                comment);
    }

    private static void requireSinglePendingUpdate(int updatedCount) {
        if (updatedCount != 1) {
            throw new BusinessRuleException("审批状态已变化，请刷新后重试");
        }
    }

    private static String cleanOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.strip();
        return normalized.isEmpty() ? null : normalized;
    }

    private static String nodeSelect() {
        return """
                select n.id, n.instance_id, n.step_order, n.node_name, n.approver_role_id,
                       r.name as approver_role_name, n.status, n.handled_by, n.handled_at,
                       n.comment, n.created_at, n.updated_at
                from approval_instance_nodes n
                join sys_roles r on r.id = n.approver_role_id
                """;
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

    private static ApprovalInstanceResponse mapInstance(ResultSet rs, int rowNum) throws SQLException {
        return new ApprovalInstanceResponse(
                rs.getLong("id"),
                rs.getLong("tenant_id"),
                rs.getLong("template_id"),
                rs.getString("object_type"),
                rs.getLong("object_id"),
                rs.getString("object_name"),
                rs.getString("status"),
                nullableInteger(rs, "current_step_order"),
                rs.getLong("submitted_by"),
                rs.getObject("submitted_at", OffsetDateTime.class),
                rs.getObject("completed_at", OffsetDateTime.class),
                rs.getString("result_comment"),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class));
    }

    private static ApprovalInstanceNodeResponse mapInstanceNode(ResultSet rs, int rowNum) throws SQLException {
        return new ApprovalInstanceNodeResponse(
                rs.getLong("id"),
                rs.getLong("instance_id"),
                rs.getInt("step_order"),
                rs.getString("node_name"),
                rs.getLong("approver_role_id"),
                rs.getString("approver_role_name"),
                rs.getString("status"),
                nullableLong(rs, "handled_by"),
                rs.getObject("handled_at", OffsetDateTime.class),
                rs.getString("comment"),
                rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class));
    }

    private static ApprovalActionResponse mapAction(ResultSet rs, int rowNum) throws SQLException {
        return new ApprovalActionResponse(
                rs.getLong("id"),
                rs.getLong("instance_id"),
                nullableLong(rs, "node_id"),
                rs.getString("action"),
                rs.getLong("actor_user_id"),
                rs.getString("comment"),
                rs.getObject("action_at", OffsetDateTime.class));
    }

    private static Long nullableLong(ResultSet rs, String columnName) throws SQLException {
        long value = rs.getLong(columnName);
        return rs.wasNull() ? null : value;
    }

    private static Integer nullableInteger(ResultSet rs, String columnName) throws SQLException {
        int value = rs.getInt(columnName);
        return rs.wasNull() ? null : value;
    }

    private record WorkflowNode(Integer stepOrder, String nodeName, Long approverRoleId) {
    }

    private record DecisionContext(
            ApprovalInstanceResponse instance,
            ApprovalInstanceNodeResponse node) {
    }
}
