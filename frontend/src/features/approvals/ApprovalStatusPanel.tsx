import { Alert, Button, Descriptions, Empty, Space, Spin, Tag, Timeline, Typography } from "antd";
import { useEffect, useState } from "react";
import { crmApi } from "../../api/crm";
import type { ApprovalObjectStatus, ApprovalObjectType } from "../../api/crm";

export type ApprovalStatusPanelProps = {
  objectType: ApprovalObjectType;
  objectId: number;
  canRead?: boolean;
  canSubmit: boolean;
  isPending: boolean;
  onSubmitted?: () => void | Promise<void>;
};

const approvalStatusMeta = {
  pending: { color: "processing", text: "审批中" },
  approved: { color: "success", text: "已通过" },
  rejected: { color: "error", text: "已驳回" }
} as const;

const nodeStatusMeta = {
  waiting: { color: "gray", text: "等待中" },
  pending: { color: "blue", text: "待审批" },
  approved: { color: "green", text: "已通过" },
  rejected: { color: "red", text: "已驳回" }
} as const;

const actionText = {
  submit: "提交审批",
  approve: "通过",
  reject: "驳回"
} as const;

function formatDateTime(value: string | null) {
  return value ? value.replace("T", " ").replace(/(?:Z|[+-]\d{2}:\d{2})$/, "") : "-";
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}

export function ApprovalStatusPanel({
  objectType,
  objectId,
  canRead = true,
  canSubmit,
  isPending,
  onSubmitted
}: ApprovalStatusPanelProps) {
  const [status, setStatus] = useState<ApprovalObjectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!canRead) {
      setLoading(false);
      setError(null);
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);
    void crmApi.approvals
      .objectStatus(objectType, objectId)
      .then((nextStatus) => {
        if (active) {
          setStatus(nextStatus);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(`审批状态加载失败：${errorText(loadError)}`);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [canRead, objectId, objectType]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      if (objectType === "contract") {
        await crmApi.contracts.submitApproval(objectId);
      } else {
        await crmApi.solutions.submitApproval(objectId);
      }
    } catch (submitError) {
      setError(`提交审批失败：${errorText(submitError)}`);
      setSubmitting(false);
      return;
    }

    let refreshFailed = false;
    if (canRead) {
      try {
        const nextStatus = await crmApi.approvals.objectStatus(objectType, objectId);
        setStatus(nextStatus);
      } catch {
        refreshFailed = true;
      }
    }

    try {
      await onSubmitted?.();
    } catch {
      refreshFailed = true;
    }

    if (refreshFailed) {
      setError("审批已提交，状态刷新失败");
    }
    setSubmitting(false);
  }

  const canSubmitNow =
    canSubmit &&
    !isPending &&
    status?.instance?.instance.status !== "pending";

  return (
    <Spin spinning={loading}>
      {error ? <Alert type="error" showIcon title={error} /> : null}
      {!canRead ? (
        isPending ? (
          <Descriptions
            size="small"
            column={1}
            items={[
              {
                key: "status",
                label: "当前状态",
                children: <Tag color="processing">审批中</Tag>
              }
            ]}
          />
        ) : canSubmitNow ? (
          <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
            提交审批
          </Button>
        ) : null
      ) : status && !status.instance ? (
        <Empty description="尚未提交审批">
          {canSubmitNow ? (
            <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
              提交审批
            </Button>
          ) : null}
        </Empty>
      ) : status?.instance ? (
        <>
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 3 }}
            extra={
              canSubmitNow ? (
                <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
                  提交审批
                </Button>
              ) : undefined
            }
            items={[
              {
                key: "status",
                label: "当前状态",
                children: (
                  <Tag color={approvalStatusMeta[status.instance.instance.status].color}>
                    {approvalStatusMeta[status.instance.instance.status].text}
                  </Tag>
                )
              },
              {
                key: "template",
                label: "审批模板",
                children: `模板 #${status.instance.instance.template_id}`
              },
              {
                key: "submittedAt",
                label: "提交时间",
                children: formatDateTime(status.instance.instance.submitted_at)
              }
            ]}
          />

          <Typography.Title level={5}>审批节点</Typography.Title>
          <Timeline
            items={[...status.instance.nodes]
              .sort((left, right) => left.step_order - right.step_order)
              .map((node) => ({
                key: node.id,
                color: nodeStatusMeta[node.status].color,
                content: (
                  <div>
                    <Space size={6} wrap>
                      <Typography.Text strong>
                        {node.step_order}. {node.node_name}
                      </Typography.Text>
                      <Tag color={nodeStatusMeta[node.status].color}>
                        {nodeStatusMeta[node.status].text}
                      </Tag>
                      <Typography.Text type="secondary">{node.approver_role_name}</Typography.Text>
                    </Space>
                    {node.comment ? <div>意见：{node.comment}</div> : null}
                    {node.handled_at ? (
                      <Typography.Text type="secondary">
                        {formatDateTime(node.handled_at)}
                      </Typography.Text>
                    ) : null}
                  </div>
                )
              }))}
          />

          <Typography.Title level={5}>历史操作</Typography.Title>
          <Timeline
            items={status.history.flatMap((detail) =>
              detail.actions.map((action) => ({
                key: `${detail.instance.id}-${action.id}`,
                color:
                  action.action === "reject"
                    ? "red"
                    : action.action === "approve"
                      ? "green"
                      : "blue",
                content: (
                  <div>
                    <Typography.Text strong>
                      {actionText[action.action]} · 用户 #{action.actor_user_id}
                    </Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        审批 #{detail.instance.id} · {formatDateTime(action.action_at)}
                      </Typography.Text>
                    </div>
                    {action.comment ? <div>意见：{action.comment}</div> : null}
                  </div>
                )
              }))
            )}
          />
        </>
      ) : null}
    </Spin>
  );
}
