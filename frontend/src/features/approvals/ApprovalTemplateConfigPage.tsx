import {
  Button,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Plus, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  crmApi,
  type ApprovalApproverRole,
  type ApprovalObjectType,
  type ApprovalTemplate,
  type ApprovalTemplateCreateRequest,
  type ApprovalTemplateNode,
  type ApprovalTemplateNodeCreateRequest,
  type ApprovalTemplateStatus,
  type ApprovalTemplateUpdateRequest
} from "../../api/crm";

type TemplateFormValues = ApprovalTemplateCreateRequest;
type NodeFormValues = ApprovalTemplateNodeCreateRequest;

const objectTypeLabels: Record<ApprovalObjectType, string> = {
  quotation: "报价",
  bid: "标书",
  contract: "合同"
};

const objectTypeOptions = Object.entries(objectTypeLabels).map(([value, label]) => ({
  value: value as ApprovalObjectType,
  label
}));

const statusOptions: Array<{ label: string; value: ApprovalTemplateStatus }> = [
  { label: "启用", value: "active" },
  { label: "停用", value: "inactive" }
];

export function ApprovalTemplateConfigPage() {
  const [templates, setTemplates] = useState<ApprovalTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ApprovalTemplate | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateForm] = Form.useForm<TemplateFormValues>();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ApprovalTemplate | null>(null);
  const [nodes, setNodes] = useState<ApprovalTemplateNode[]>([]);
  const [roles, setRoles] = useState<ApprovalApproverRole[]>([]);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<ApprovalTemplateNode | null>(null);
  const [nodeSaving, setNodeSaving] = useState(false);
  const [nodeForm] = Form.useForm<NodeFormValues>();
  const drawerRequestSequence = useRef(0);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      setTemplates(await crmApi.approvalTemplates.list());
    } catch (error) {
      message.error(errorText(error, "审批模板加载失败"));
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    templateForm.resetFields();
    templateForm.setFieldsValue({ is_default: false, status: "active" });
    setTemplateModalOpen(true);
  };

  const openEditTemplate = (template: ApprovalTemplate) => {
    setEditingTemplate(template);
    templateForm.setFieldsValue({
      object_type: template.object_type,
      template_name: template.template_name,
      is_default: template.is_default,
      status: template.status
    });
    setTemplateModalOpen(true);
  };

  const saveTemplate = async (values: TemplateFormValues) => {
    setTemplateSaving(true);
    try {
      if (editingTemplate) {
        const body: ApprovalTemplateUpdateRequest = {
          template_name: values.template_name,
          is_default: values.is_default,
          status: values.status
        };
        await crmApi.approvalTemplates.update(editingTemplate.id, body);
      } else {
        await crmApi.approvalTemplates.create(values);
      }
      await loadTemplates();
      message.success(editingTemplate ? "审批模板已更新" : "审批模板已创建");
      setTemplateModalOpen(false);
      setEditingTemplate(null);
      templateForm.resetFields();
    } catch (error) {
      message.error(errorText(error, editingTemplate ? "审批模板更新失败" : "审批模板创建失败"));
    } finally {
      setTemplateSaving(false);
    }
  };

  const openNodeDrawer = async (template: ApprovalTemplate) => {
    const requestSequence = ++drawerRequestSequence.current;
    setActiveTemplate(template);
    setNodes([]);
    setRoles([]);
    setNodeModalOpen(false);
    setEditingNode(null);
    nodeForm.resetFields();
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const [loadedNodes, loadedRoles] = await Promise.all([
        crmApi.approvalTemplates.listNodes(template.id),
        crmApi.approvalTemplates.approverRoles()
      ]);
      if (requestSequence === drawerRequestSequence.current) {
        setNodes(sortNodes(loadedNodes));
        setRoles(loadedRoles);
      }
    } catch (error) {
      if (requestSequence === drawerRequestSequence.current) {
        message.error(errorText(error, "审批节点加载失败"));
      }
    } finally {
      if (requestSequence === drawerRequestSequence.current) {
        setDrawerLoading(false);
      }
    }
  };

  const openCreateNode = () => {
    const nextStepOrder = nodes.reduce((maximum, node) => Math.max(maximum, node.step_order), 0) + 1;
    setEditingNode(null);
    nodeForm.resetFields();
    nodeForm.setFieldsValue({ step_order: nextStepOrder, status: "active" });
    setNodeModalOpen(true);
  };

  const openEditNode = (node: ApprovalTemplateNode) => {
    setEditingNode(node);
    nodeForm.setFieldsValue({
      step_order: node.step_order,
      node_name: node.node_name,
      approver_role_id: node.approver_role_id,
      status: node.status
    });
    setNodeModalOpen(true);
  };

  const saveNode = async (values: NodeFormValues) => {
    if (!activeTemplate) return;
    setNodeSaving(true);
    try {
      const saved = editingNode
        ? await crmApi.approvalTemplates.updateNode(activeTemplate.id, editingNode.id, values)
        : await crmApi.approvalTemplates.addNode(activeTemplate.id, values);
      setNodes((current) =>
        sortNodes(
          editingNode
            ? current.map((node) => (node.id === saved.id ? saved : node))
            : [...current, saved]
        )
      );
      message.success(editingNode ? "审批节点已更新" : "审批节点已创建");
      setNodeModalOpen(false);
      setEditingNode(null);
      nodeForm.resetFields();
    } catch (error) {
      message.error(errorText(error, editingNode ? "审批节点更新失败" : "审批节点创建失败"));
    } finally {
      setNodeSaving(false);
    }
  };

  const templateColumns = useMemo<ColumnsType<ApprovalTemplate>>(
    () => [
      {
        title: "类型",
        dataIndex: "object_type",
        width: 96,
        render: (value: ApprovalObjectType) => objectTypeLabels[value]
      },
      { title: "名称", dataIndex: "template_name" },
      {
        title: "默认",
        dataIndex: "is_default",
        width: 84,
        align: "center",
        render: (checked: boolean, template) => (
          <Switch
            size="small"
            checked={checked}
            disabled
            aria-label={`${template.template_name}${checked ? "是" : "不是"}默认模板`}
          />
        )
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 88,
        render: (status: ApprovalTemplateStatus) => (
          <Tag color={status === "active" ? "success" : "default"}>{statusLabel(status)}</Tag>
        )
      },
      {
        title: "更新时间",
        dataIndex: "updated_at",
        width: 180,
        render: formatDateTime
      },
      {
        title: "操作",
        key: "actions",
        width: 104,
        align: "center",
        render: (_, template) => (
          <Space size={4}>
            <Tooltip title="编辑模板">
              <Button
                type="text"
                size="small"
                icon={<Pencil size={16} />}
                aria-label={`编辑模板 ${template.template_name}`}
                onClick={() => openEditTemplate(template)}
              />
            </Tooltip>
            <Tooltip title="配置审批节点">
              <Button
                type="text"
                size="small"
                icon={<Settings size={16} />}
                aria-label={`配置模板 ${template.template_name}`}
                onClick={() => void openNodeDrawer(template)}
              />
            </Tooltip>
          </Space>
        )
      }
    ],
    []
  );

  const nodeColumns = useMemo<ColumnsType<ApprovalTemplateNode>>(
    () => [
      { title: "顺序", dataIndex: "step_order", width: 72, align: "center" },
      { title: "节点名称", dataIndex: "node_name" },
      { title: "审批角色", dataIndex: "approver_role_name", width: 140 },
      {
        title: "状态",
        dataIndex: "status",
        width: 88,
        render: (status: ApprovalTemplateStatus) => (
          <Tag color={status === "active" ? "success" : "default"}>{statusLabel(status)}</Tag>
        )
      },
      {
        title: "操作",
        key: "actions",
        width: 72,
        align: "center",
        render: (_, node) => (
          <Tooltip title="编辑节点">
            <Button
              type="text"
              size="small"
              icon={<Pencil size={16} />}
              aria-label={`编辑节点 ${node.node_name}`}
              onClick={() => openEditNode(node)}
            />
          </Tooltip>
        )
      }
    ],
    []
  );

  const roleOptions = roles.map((role) => ({ label: role.name, value: role.id }));

  return (
    <Flex vertical gap={16}>
      <Flex align="center" justify="space-between" gap={12} wrap>
        <Typography.Title level={2} style={{ margin: 0 }}>
          审批配置
        </Typography.Title>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreateTemplate}>
          新建模板
        </Button>
      </Flex>

      <Table
        rowKey="id"
        size="small"
        loading={templatesLoading}
        dataSource={templates}
        columns={templateColumns}
        pagination={false}
        scroll={{ x: 780 }}
        locale={{ emptyText: "暂无审批模板" }}
      />

      <Modal
        title={editingTemplate ? "编辑审批模板" : "新建审批模板"}
        open={templateModalOpen}
        footer={null}
        destroyOnHidden
        onCancel={() => {
          setTemplateModalOpen(false);
          setEditingTemplate(null);
          templateForm.resetFields();
        }}
      >
        <Form form={templateForm} layout="vertical" onFinish={saveTemplate}>
          <Form.Item name="object_type" label="对象类型" rules={[{ required: true, message: "请选择对象类型" }]}>
            <Select disabled={!!editingTemplate} options={objectTypeOptions} />
          </Form.Item>
          <Form.Item name="template_name" label="模板名称" rules={[{ required: true, message: "请输入模板名称" }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="is_default" label="默认模板" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: "请选择状态" }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={templateSaving}>
            保存模板
          </Button>
        </Form>
      </Modal>

      <Drawer
        title={activeTemplate ? `审批节点：${activeTemplate.template_name}` : "审批节点"}
        open={drawerOpen}
        size="large"
        destroyOnHidden
        onClose={() => {
          drawerRequestSequence.current += 1;
          setDrawerOpen(false);
          setActiveTemplate(null);
          setNodes([]);
          setRoles([]);
        }}
      >
        <Flex vertical gap={12}>
          <Flex justify="flex-end">
            <Button type="primary" icon={<Plus size={16} />} onClick={openCreateNode} disabled={drawerLoading}>
              新增节点
            </Button>
          </Flex>
          <Table
            rowKey="id"
            size="small"
            loading={drawerLoading}
            dataSource={nodes}
            columns={nodeColumns}
            pagination={false}
            scroll={{ x: 560 }}
            locale={{ emptyText: "暂无审批节点" }}
          />
        </Flex>
      </Drawer>

      <Modal
        title={editingNode ? "编辑审批节点" : "新增审批节点"}
        open={nodeModalOpen}
        footer={null}
        destroyOnHidden
        onCancel={() => {
          setNodeModalOpen(false);
          setEditingNode(null);
          nodeForm.resetFields();
        }}
      >
        <Form form={nodeForm} layout="vertical" onFinish={saveNode}>
          <Form.Item name="step_order" label="步骤顺序" rules={[{ required: true, message: "请输入步骤顺序" }]}>
            <InputNumber min={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="node_name" label="节点名称" rules={[{ required: true, message: "请输入节点名称" }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="approver_role_id" label="审批角色" rules={[{ required: true, message: "请选择审批角色" }]}>
            <Select showSearch optionFilterProp="label" options={roleOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: "请选择状态" }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={nodeSaving}>
            保存节点
          </Button>
        </Form>
      </Modal>
    </Flex>
  );
}

function sortNodes(nodes: ApprovalTemplateNode[]) {
  return [...nodes].sort((left, right) => left.step_order - right.step_order);
}

function statusLabel(status: ApprovalTemplateStatus) {
  return status === "active" ? "启用" : "停用";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
