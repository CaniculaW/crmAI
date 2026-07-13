import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  crmApi,
  type ApprovalAction,
  type ApprovalInstanceDetail,
  type ApprovalInstanceNode,
  type ApprovalInstanceStatus,
  type ApprovalObjectType,
  type ApprovalTask,
  type ApprovalTaskBucket,
  type CurrentUser,
  type SystemRoleSummary
} from "../../api/crm";

type ApprovalCenterUser = CurrentUser & { roles?: SystemRoleSummary[] };

const objectTypeLabels: Record<ApprovalObjectType, string> = {
  quotation: "报价",
  bid: "投标",
  contract: "合同"
};

const statusLabels: Record<ApprovalInstanceStatus, string> = {
  pending: "审批中",
  approved: "已通过",
  rejected: "已驳回"
};

const nodeStatusLabels: Record<ApprovalInstanceNode["status"], string> = {
  waiting: "待流转",
  pending: "待审批",
  approved: "已通过",
  rejected: "已驳回"
};

const actionLabels: Record<ApprovalAction["action"], string> = {
  submit: "提交审批",
  approve: "通过",
  reject: "驳回"
};

function dateText(value?: string | null) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function statusTag(status: ApprovalInstanceStatus) {
  const color = status === "approved" ? "green" : status === "rejected" ? "red" : "blue";
  return <Tag color={color}>{statusLabels[status]}</Tag>;
}

function nodeStatusTag(status: ApprovalInstanceNode["status"]) {
  const color = status === "approved" ? "green" : status === "rejected" ? "red" : status === "pending" ? "blue" : "default";
  return <Tag color={color}>{nodeStatusLabels[status]}</Tag>;
}

export function ApprovalCenterPage({ currentUser }: { currentUser: CurrentUser }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [bucket, setBucket] = useState<ApprovalTaskBucket>("pending");
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ApprovalInstanceDetail | null>(null);
  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectForm] = Form.useForm<{ comment: string }>();
  const taskRequestSequence = useRef(0);

  const resetDecisionInputs = useCallback(() => {
    setApprovalComment("");
    rejectForm.resetFields();
  }, [rejectForm]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDetail(null);
    setSelectedTask(null);
    setRejectOpen(false);
    resetDecisionInputs();
  }, [resetDecisionInputs]);

  const loadTasks = useCallback(async () => {
    const requestSequence = ++taskRequestSequence.current;
    setLoading(true);
    try {
      const nextTasks = await crmApi.approvals.tasks(bucket);
      if (requestSequence === taskRequestSequence.current) {
        setTasks(nextTasks);
      }
    } catch (error) {
      if (requestSequence === taskRequestSequence.current) {
        setTasks([]);
        messageApi.error(errorText(error, "加载审批任务失败"));
      }
    } finally {
      if (requestSequence === taskRequestSequence.current) {
        setLoading(false);
      }
    }
  }, [bucket, messageApi]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const openDetail = useCallback(async (task: ApprovalTask) => {
    resetDecisionInputs();
    setRejectOpen(false);
    setSelectedTask(task);
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await crmApi.approvals.detail(task.instance.id));
    } catch (error) {
      messageApi.error(errorText(error, "加载审批详情失败"));
    } finally {
      setDetailLoading(false);
    }
  }, [messageApi, resetDecisionInputs]);

  const handleApprove = async () => {
    if (!detail) {
      return;
    }
    setDecisionLoading(true);
    try {
      const comment = approvalComment.trim();
      await crmApi.approvals.approve(detail.instance.id, comment ? { comment } : undefined);
      messageApi.success("审批已通过");
      closeDrawer();
      await loadTasks();
    } catch (error) {
      messageApi.error(errorText(error, "审批操作失败"));
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleReject = async ({ comment }: { comment: string }) => {
    if (!detail) {
      return;
    }
    setDecisionLoading(true);
    try {
      await crmApi.approvals.reject(detail.instance.id, { comment: comment.trim() });
      messageApi.success("审批已驳回");
      closeDrawer();
      await loadTasks();
    } catch (error) {
      messageApi.error(errorText(error, "驳回操作失败"));
    } finally {
      setDecisionLoading(false);
    }
  };

  const columns = useMemo<ColumnsType<ApprovalTask>>(
    () => [
      {
        title: "对象类型",
        key: "object_type",
        width: 100,
        render: (_, task) => objectTypeLabels[task.instance.object_type]
      },
      {
        title: "对象名称",
        key: "object_name",
        width: 240,
        ellipsis: true,
        render: (_, task) => task.instance.object_name
      },
      {
        title: "当前节点",
        key: "current_node",
        width: 180,
        ellipsis: true,
        render: (_, task) => task.current_node?.node_name ?? "-"
      },
      {
        title: "提交人",
        key: "submitted_by",
        width: 100,
        render: (_, task) => task.instance.submitted_by
      },
      {
        title: "提交时间",
        key: "submitted_at",
        width: 160,
        render: (_, task) => dateText(task.instance.submitted_at)
      },
      {
        title: "状态",
        key: "status",
        width: 100,
        render: (_, task) => statusTag(task.instance.status)
      },
      {
        title: "操作",
        key: "actions",
        width: 90,
        fixed: "right",
        render: (_, task) => (
          <Button
            type="link"
            size="small"
            icon={<Eye size={15} />}
            onClick={(event) => {
              event.stopPropagation();
              void openDetail(task);
            }}
          >
            查看
          </Button>
        )
      }
    ],
    [openDetail]
  );

  const orderedNodes = useMemo(
    () => [...(detail?.nodes ?? [])].sort((left, right) => left.step_order - right.step_order),
    [detail]
  );
  const currentNode = selectedTask?.current_node;
  const userRoles = (currentUser as ApprovalCenterUser).roles ?? [];
  const canDecide =
    bucket === "pending" &&
    currentUser.permissions.includes("approval.approve") &&
    detail?.instance.status === "pending" &&
    Boolean(currentNode) &&
    userRoles.some((role) => role.id === currentNode?.approver_role_id);

  return (
    <section style={{ minWidth: 0 }}>
      {contextHolder}
      <Typography.Title level={2} style={{ margin: "0 0 12px" }}>
        审批中心
      </Typography.Title>
      <Tabs
        activeKey={bucket}
        onChange={(key) => setBucket(key as ApprovalTaskBucket)}
        items={[
          { key: "pending", label: "待我审批" },
          { key: "started", label: "我发起的" },
          { key: "processed", label: "已处理" }
        ]}
        style={{ marginBottom: 4 }}
      />
      <Table
        rowKey={(task) => task.instance.id}
        size="small"
        loading={loading}
        dataSource={tasks}
        columns={columns}
        tableLayout="fixed"
        scroll={{ x: 970 }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: "暂无审批任务" }}
        onRow={(task) => ({
          onClick: () => void openDetail(task),
          style: { cursor: "pointer" }
        })}
      />

      <Drawer
        title="审批详情"
        open={drawerOpen}
        size={720}
        loading={detailLoading}
        onClose={closeDrawer}
      >
        {detail ? (
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            <section>
              <Typography.Title level={5}>基础信息</Typography.Title>
              <Descriptions
                bordered
                size="small"
                column={2}
                items={[
                  { key: "type", label: "对象类型", children: objectTypeLabels[detail.instance.object_type] },
                  { key: "name", label: "对象名称", children: detail.instance.object_name },
                  { key: "status", label: "状态", children: statusTag(detail.instance.status) },
                  { key: "submitter", label: "提交人", children: detail.instance.submitted_by },
                  { key: "submittedAt", label: "提交时间", children: dateText(detail.instance.submitted_at) },
                  { key: "completedAt", label: "完成时间", children: dateText(detail.instance.completed_at) }
                ]}
              />
            </section>

            <section>
              <Typography.Title level={5}>审批节点</Typography.Title>
              <Timeline
                items={orderedNodes.map((node) => ({
                  color: node.status === "approved" ? "green" : node.status === "rejected" ? "red" : "blue",
                  content: (
                    <div>
                      <Space size={8} wrap>
                        <Typography.Text strong>{node.node_name}</Typography.Text>
                        {nodeStatusTag(node.status)}
                      </Space>
                      <div style={{ color: "rgba(0, 0, 0, 0.65)", marginTop: 4 }}>
                        {node.approver_role_name} · {node.handled_by ? `处理人 ${node.handled_by}` : "等待处理"} · {dateText(node.handled_at)}
                      </div>
                      {node.comment ? <div style={{ marginTop: 4 }}>{node.comment}</div> : null}
                    </div>
                  )
                }))}
              />
            </section>

            <section>
              <Typography.Title level={5}>操作历史与意见</Typography.Title>
              <div>
                {detail.actions.map((action) => (
                  <div
                    key={action.id}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "baseline",
                      gap: "6px 12px",
                      minWidth: 0,
                      maxWidth: "100%",
                      padding: "10px 0",
                      borderBottom: "1px solid #f0f0f0"
                    }}
                  >
                    <Typography.Text strong style={{ flex: "0 1 100px" }}>
                      {actionLabels[action.action]}
                    </Typography.Text>
                    <span style={{ flex: "0 1 110px" }}>用户 {action.actor_user_id}</span>
                    <span style={{ flex: "0 1 150px" }}>{dateText(action.action_at)}</span>
                    <span
                      style={{
                        flex: "1 1 180px",
                        minWidth: 0,
                        maxWidth: "100%",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {action.comment || "无意见"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            {canDecide ? (
              <section style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
                <Input.TextArea
                  aria-label="审批意见（选填）"
                  placeholder="审批意见（选填）"
                  value={approvalComment}
                  onChange={(event) => setApprovalComment(event.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <Space>
                    <Button
                      danger
                      icon={<XCircle size={16} />}
                      disabled={decisionLoading}
                      onClick={() => setRejectOpen(true)}
                    >
                      驳回
                    </Button>
                    <Button
                      type="primary"
                      icon={<CheckCircle2 size={16} />}
                      loading={decisionLoading}
                      onClick={() => void handleApprove()}
                    >
                      通过
                    </Button>
                  </Space>
                </div>
              </section>
            ) : null}
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title="驳回审批"
        open={rejectOpen}
        footer={null}
        destroyOnHidden
        onCancel={() => {
          setRejectOpen(false);
          rejectForm.resetFields();
        }}
      >
        <Form form={rejectForm} layout="vertical" onFinish={(values) => void handleReject(values)}>
          <Form.Item
            name="comment"
            label="驳回意见"
            rules={[{ required: true, whitespace: true, message: "请输入驳回意见" }]}
          >
            <Input.TextArea aria-label="驳回意见" rows={4} maxLength={500} showCount />
          </Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setRejectOpen(false)}>取消</Button>
            <Button danger type="primary" htmlType="submit" loading={decisionLoading} icon={<XCircle size={16} />}>
              确认驳回
            </Button>
          </div>
        </Form>
      </Modal>
    </section>
  );
}
