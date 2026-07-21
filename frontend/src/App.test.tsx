import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { AiDraft } from "./api/crm";

const stylesCss = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "styles.css"), "utf8");
const appSource = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "App.tsx"), "utf8");

const apiData = {
  user: {
    id: 1001,
    name: "销售一号",
    permissions: [
      "account.read",
      "account.create",
      "dashboard.read",
      "dashboard.funnel.read",
      "dashboard.contracts.read",
      "dashboard.invoices.read",
      "dashboard.receivables.read",
      "dashboard.risks.read",
      "contact.read",
      "contact.create",
      "opportunity.read",
      "opportunity.create",
      "solution.read",
      "solution.create",
      "solution.update",
      "solution.void",
      "contract.read",
      "contract.create",
      "contract.update",
      "contract.terminate",
      "contract.milestone.manage",
      "invoice.read",
      "invoice.create",
      "invoice.update",
      "invoice.apply",
      "invoice.issue",
      "invoice.sign",
      "invoice.exception",
      "invoice.void",
      "receivable.read",
      "receivable.create",
      "receivable.update",
      "receivable.terminate",
      "receivable.follow_up",
      "payment.read",
      "payment.create",
      "payment.update",
      "payment.confirm",
      "payment.exception",
      "payment.refund",
      "reconciliation.read",
      "reconciliation.create",
      "reconciliation.void",
      "attachment.create",
      "attachment.read",
      "attachment.delete",
      "ai.context.read",
      "ai.draft.manage",
      "ai.weekly.manage",
      "ai.opportunity.analyze",
      "ai.visit.plan",
      "ai.communication.recommend",
      "ai.log.read",
      "activity.read",
      "activity.create",
      "activity.complete",
      "reminder.read",
      "weekly_progress.read",
      "system.audit.read",
      "system.dict.manage",
      "system.user.manage",
      "system.role.manage",
      "system.ai-config.manage",
      "approval.read",
      "approval.submit",
      "approval.approve",
      "approval.config.manage"
    ]
  },
  accounts: [
    {
      id: 1,
      account_name: "测试客户A",
      account_type: "enterprise",
      account_level: "A",
      account_status: "following",
      industry: "智能制造",
      region_province: "上海",
      region_city: "上海",
      last_activity_summary: "完成CRM V1试点需求确认会",
      last_activity_at: "2026-06-22T03:58:00+08:00",
      owner_department_id: 1,
      owner_user_id: 1001
    }
  ],
  contacts: [
    {
      id: 21,
      account_id: 1,
      name: "张决策",
      department: "信息化中心",
      title: "CIO",
      mobile: "13800000001",
      email: "cio@example.com",
      contact_type: "decision_maker",
      attitude: "supporter",
      relationship_heat: "trusted",
      last_communication_summary: "完成高层访谈，确认项目预算窗口",
      next_action: "跟进预算确认和试点范围",
      project_roles: ["decision_maker", "budget_promoter"]
    },
    {
      id: 22,
      account_id: 1,
      name: "李采购",
      title: "采购经理",
      attitude: "neutral",
      relationship_heat: "warm",
      project_roles: ["procurement_executor"]
    }
  ],
  opportunities: [
    {
      id: 10,
      account_id: 1,
      opportunity_name: "测试商机A",
      stage: "lead",
      status: "following",
      level: "A",
      source: "customer",
      risk_status: "normal",
      estimated_contract_amount: 620000,
      expected_close_date: "2026-07-31",
      current_progress: "已完成需求确认，进入试点方案细化。",
      next_plan: "提交V1试点方案和实施排期。",
      last_activity_summary: "完成CRM V1试点需求确认会",
      owner_department_id: 1,
      owner_user_id: 1001
    }
  ],
  solutions: [
    {
      id: 91,
      account_id: 1,
      opportunity_id: 10,
      document_name: "V2试点技术方案",
      document_type: "technical_solution",
      version_no: "V1.0",
      status: "drafting",
      owner_user_id: 1001,
      customer_requirement_summary: "客户关注权限、附件和验收闭环",
      technical_solution_summary: "CRM V2 模块化业务链路方案",
      quotation_amount: 880000,
      cost_amount: 620000,
      estimated_gross_margin_rate: 0.2955,
      bid_self_check_result: "risk",
      bid_risk_description: "附件材料待补齐"
    }
  ],
  solutionAttachments: [
    {
      id: 800,
      object_type: "solution_document",
      object_id: 91,
      file_name: "V2报价清单.xlsx",
      file_url: "oss://crm/solution/91/quotation.xlsx",
      file_type: "quotation",
      file_size: 8192,
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  ],
  contracts: [
    {
      id: 301,
      account_id: 1,
      opportunity_id: 10,
      contract_name: "V2试点项目合同",
      contract_no: "CRM-V2-20260629",
      contract_type: "project",
      contract_status: "performing",
      contract_amount: 1200000,
      tax_rate: 0.13,
      net_amount: 1061946.9,
      owner_user_id: 1001,
      business_owner_id: 1001,
      payment_terms: "30%预付款，40%上线，30%终验",
      invoice_terms: "按回款节点开票",
      delivery_scope: "CRM V2 销售到财务闭环",
      acceptance_criteria: "UAT 通过并完成上线交付",
      risk_level: "low",
      risk_description: "客户侧流程待最终确认"
    }
  ],
  contractChanges: [
    {
      id: 401,
      contract_id: 301,
      change_type: "amount",
      before_value: "1000000.00",
      after_value: "1200000.00",
      change_reason: "客户增加实施范围",
      changed_by: 1001,
      changed_at: "2026-06-29T10:00:00+08:00"
    }
  ],
  contractMilestones: [
    {
      id: 501,
      contract_id: 301,
      milestone_name: "项目启动会",
      milestone_type: "kickoff",
      status: "pending",
      remark: "合同签署后启动"
    }
  ],
  invoices: [
    {
      id: 401,
      account_id: 1,
      opportunity_id: 10,
      contract_id: 301,
      plan_name: "V2 UAT 首期开票",
      invoice_status: "invoiced",
      invoice_type: "vat_special",
      planned_invoice_date: "2026-07-15T10:00:00+08:00",
      planned_amount: 360000,
      applied_amount: 360000,
      applied_at: "2026-06-30T10:00:00+08:00",
      application_note: "按首付款节点申请开票",
      invoice_no: "INV-401",
      invoice_date: "2026-07-16T10:00:00+08:00",
      tax_rate: 0.13,
      net_amount: 318584.07,
      tax_amount: 41415.93,
      actual_invoice_amount: 360000,
      owner_user_id: 1001,
      contract_amount: 1200000,
      effective_invoiced_amount: 360000,
      remaining_invoice_amount: 840000,
      reconciled_amount: 0,
      unreconciled_amount: 360000,
      remark: "首期计划"
    }
  ],
  invoiceAttachments: [
    {
      id: 801,
      object_type: "invoice",
      object_id: 401,
      file_name: "发票扫描件.pdf",
      file_url: "oss://crm/invoice/401/scan.pdf",
      file_type: "invoice_scan",
      file_size: 16384,
      mime_type: "application/pdf"
    }
  ],
  receivablePlans: [
    {
      id: 601,
      account_id: 1,
      opportunity_id: 10,
      contract_id: 301,
      plan_name: "V2 UAT 首付款回款",
      plan_stage: "首付款",
      receivable_status: "planned",
      planned_receivable_date: "2026-07-20T10:00:00+08:00",
      planned_amount: 360000,
      owner_user_id: 1001,
      payment_terms_snapshot: "30%预付款",
      overdue_reason: "客户审批中",
      contract_amount: 1200000,
      effective_invoiced_amount: 360000,
      confirmed_received_amount: 120000,
      unreceived_amount: 240000,
      unreconciled_payment_amount: 120000,
      overdue_days: 0,
      remark: "首期回款计划"
    }
  ],
  payments: [
    {
      id: 701,
      account_id: 1,
      opportunity_id: 10,
      contract_id: 301,
      receivable_plan_id: 601,
      payment_name: "首付款到账",
      payment_status: "confirmed",
      received_at: "2026-07-22T10:00:00+08:00",
      received_amount: 120000,
      confirmed_amount: 120000,
      confirmed_at: "2026-07-22T11:00:00+08:00",
      confirmed_by: 1001,
      payment_method: "bank_transfer",
      payer_name: "测试客户A",
      bank_flow_no: "FLOW-701",
      reconciled_amount: 0,
      unreconciled_amount: 120000,
      owner_user_id: 1001,
      remark: "首笔到账"
    }
  ],
  receivableFollowUps: [
    {
      id: 901,
      account_id: 1,
      opportunity_id: 10,
      contract_id: 301,
      receivable_plan_id: 601,
      follow_up_at: "2026-07-21T10:00:00+08:00",
      follow_up_by: 1001,
      follow_up_content: "客户财务流程已提交",
      customer_feedback: "预计三日内付款",
      next_action: "跟进客户付款审批"
    }
  ],
  receivableAttachments: [
    {
      id: 802,
      object_type: "receivable_plan",
      object_id: 601,
      file_name: "银行回单.pdf",
      file_url: "oss://crm/receivable/601/receipt.pdf",
      file_type: "bank_receipt",
      file_size: 16384,
      mime_type: "application/pdf"
    }
  ],
  reconciliationWorkbench: {
    summary: {
      invoice_amount: 360000,
      payment_amount: 120000,
      reconciled_amount: 0,
      unreconciled_invoice_amount: 360000,
      unallocated_payment_amount: 120000
    },
    pending_invoices: [
      {
        id: 401,
        account_id: 1,
        opportunity_id: 10,
        contract_id: 301,
        plan_name: "V2 UAT 首期开票",
        invoice_no: "INV-401",
        invoice_status: "invoiced",
        actual_invoice_amount: 360000,
        reconciled_amount: 0,
        unreconciled_amount: 360000
      }
    ],
    pending_payments: [
      {
        id: 701,
        account_id: 1,
        opportunity_id: 10,
        contract_id: 301,
        payment_name: "首付款到账",
        payment_status: "confirmed",
        received_at: "2026-07-22T10:00:00+08:00",
        confirmed_amount: 120000,
        reconciled_amount: 0,
        unreconciled_amount: 120000
      }
    ],
    recent_reconciliations: []
  },
  dashboardOverview: {
    filters: {},
    metric_cards: [
      { key: "forecast_amount", label: "预测金额", value: 620000, unit: "CNY", drilldown_url: "/opportunities" },
      { key: "contract_amount", label: "合同金额", value: 1200000, unit: "CNY", drilldown_url: "/contracts" },
      { key: "invoiced_amount", label: "已开票金额", value: 360000, unit: "CNY", drilldown_url: "/invoices" },
      { key: "received_amount", label: "已回款金额", value: 120000, unit: "CNY", drilldown_url: "/receivables" },
      { key: "overdue_amount", label: "逾期金额", value: 240000, unit: "CNY", drilldown_url: "/receivables?overdue=true" },
      { key: "risk_count", label: "风险数", value: 2, unit: "count", drilldown_url: "/dashboard?view=risks" }
    ],
    business_flow: [
      { key: "opportunity_forecast", label: "商机预测", amount: 620000, count: 1, risk_count: 0, drilldown_url: "/opportunities" },
      { key: "contract", label: "合同", amount: 1200000, count: 1, risk_count: 0, drilldown_url: "/contracts" },
      { key: "invoice", label: "开票", amount: 360000, count: 1, risk_count: 0, drilldown_url: "/invoices" },
      { key: "receivable", label: "回款", amount: 120000, count: 1, risk_count: 1, drilldown_url: "/receivables" },
      { key: "reconciliation", label: "核销", amount: 120000, count: 1, risk_count: 1, drilldown_url: "/reconciliations" }
    ],
    risk_summary: [
      {
        risk_type: "receivable_overdue",
        label: "回款逾期",
        count: 1,
        amount: 240000,
        highest_level: "high",
        drilldown_url: "/receivables?overdue=true"
      },
      {
        risk_type: "unreconciled_payment",
        label: "未核销回款",
        count: 1,
        amount: 120000,
        highest_level: "medium",
        drilldown_url: "/reconciliations"
      }
    ],
    top_risks: [
      {
        risk_type: "receivable_overdue",
        risk_level: "high",
        title: "V2 UAT 首付款回款逾期",
        amount: 240000,
        object_type: "receivable_plan",
        object_id: 601,
        owner_user_id: 1001,
        account_id: 1,
        opportunity_id: 10,
        occurred_at: "2026-07-23T10:00:00+08:00",
        drilldown_url: "/receivables?overdue=true"
      }
    ]
  },
  aiContextSummary: {
    generation_mode: "rules_fallback",
    generation_notice: "当前版本由业务规则辅助生成，未调用远程模型；AI配置仅用于连接测试。",
    accounts: [
      {
        id: 1,
        account_name: "测试客户A",
        account_type: "enterprise",
        account_level: "A",
        account_status: "following",
        owner_department_id: 1,
        owner_user_id: 1001,
        last_activity_summary: "完成CRM V1试点需求确认会"
      }
    ],
    opportunities: [
      {
        id: 10,
        account_id: 1,
        opportunity_name: "测试商机A",
        stage: "lead",
        status: "following",
        risk_status: "normal",
        estimated_contract_amount: 620000,
        owner_department_id: 1,
        owner_user_id: 1001,
        current_progress: "已完成需求确认，进入试点方案细化。",
        next_plan: "提交V1试点方案和实施排期。"
      }
    ],
    recent_activities: [
      {
        id: 88,
        account_id: 1,
        opportunity_id: 10,
        subject: "完成CRM V1试点需求确认会",
        activity_type: "meeting",
        activity_status: "completed",
        activity_result: "aligned",
        activity_time: "2026-06-22T03:58:00+08:00",
        owner_department_id: 1,
        owner_user_id: 1001
      }
    ],
    risk_signals: [
      {
        risk_type: "receivable_overdue",
        title: "V2 UAT 首付款回款逾期",
        drilldown_url: "/receivables?overdue=true"
      }
    ],
    evidence: [
      {
        object_type: "activity",
        object_id: 88,
        title: "完成CRM V1试点需求确认会",
        summary: "双方确认进入试点方案细化阶段。",
        occurred_at: "2026-06-22T03:58:00+08:00",
        drilldown_url: "/activities?activity_id=88"
      }
    ]
  },
  aiDrafts: [
    {
      id: 7001,
      input_record_id: 9001,
      draft_type: "account",
      status: "pending_confirmation",
      target_action: "create",
      source_text: "客户：测试客户AI，行业：制造业",
      payload: {
        account_name: "测试客户AI",
        account_type: "enterprise",
        owner_user_id: 1001
      },
      missing_fields: [],
      conflicts: [],
      confidence_status: "high"
    },
    {
      id: 7002,
      input_record_id: 9001,
      draft_type: "contact",
      status: "pending_confirmation",
      target_action: "create",
      source_text: "联系人：王采购，客户：测试客户A",
      payload: {
        name: "王采购",
        account_id: 1,
        title: "采购经理"
      },
      missing_fields: [],
      conflicts: [],
      confidence_status: "high"
    }
  ] satisfies AiDraft[],
  aiWeeklyReports: [
    {
      id: 8101,
      status: "pending_confirmation",
      week_start_date: "2026-07-06",
      week_end_date: "2026-07-12",
      personal_summary: {
        headline: "本周跟进 1 个商机，沉淀 2 条有效行动。",
        highlights: ["客户认可试点目标"],
        risks: ["预算审批链路未明确"],
        next_week_plan: ["补充 ROI 测算并约技术评审"]
      },
      opportunity_progress: [
        {
          opportunity_id: 10,
          account_id: 1,
          owner_department_id: 1,
          owner_user_id: 1001,
          opportunity_name: "测试商机A",
          account_name: "测试客户A",
          activity_count: 2,
          summary: "客户认可试点目标",
          risk_summary: "预算审批链路未明确",
          next_week_plan: "补充 ROI 测算并约技术评审",
          evidence: [
            {
              object_type: "activity",
              object_id: 88,
              title: "完成CRM V1试点需求确认会",
              summary: "双方确认进入试点方案细化阶段。",
              occurred_at: "2026-06-22T03:58:00+08:00",
              drilldown_url: "/activities?activity_id=88"
            }
          ]
        }
      ],
      evidence: [
        {
          object_type: "activity",
          object_id: 88,
          title: "完成CRM V1试点需求确认会",
          summary: "双方确认进入试点方案细化阶段。",
          occurred_at: "2026-06-22T03:58:00+08:00",
          drilldown_url: "/activities?activity_id=88"
        }
      ],
      source_activity_count: 2,
      write_activity_ids: []
    }
  ],
  aiOpportunityAnalyses: [
    {
      id: 8201,
      status: "pending_confirmation",
      opportunity_id: 10,
      account_id: 1,
      opportunity_name: "测试商机A",
      account_name: "测试客户A",
      stage_health: ["当前阶段 proposal，状态 following，预计成交日 2026-07-31。"],
      relationship_gaps: ["财务审批人未明确，需要补齐预算、采购或财务角色。"],
      risks: ["预算审批链路未明确"],
      blockers: ["预算审批链路是当前阻塞点，需要确认财务审批人、审批材料和预算口径。"],
      win_factors: ["客户认可AI助手价值"],
      next_actions: ["确认财务审批人、预算口径和审批材料清单。"],
      evidence: [
        {
          object_type: "activity",
          object_id: 88,
          title: "完成CRM V1试点需求确认会",
          summary: "双方确认进入试点方案细化阶段。",
          occurred_at: "2026-06-22T03:58:00+08:00",
          drilldown_url: "/activities?activity_id=88"
        }
      ],
      source_activity_count: 2,
      source_evidence_count: 1,
      write_activity_id: undefined as number | undefined
    }
  ],
  aiVisitPlans: [
    {
      id: 8301,
      status: "pending_confirmation",
      opportunity_id: 10,
      account_id: 1,
      opportunity_name: "测试商机A",
      account_name: "测试客户A",
      visit_objectives: ["明确AI助手试点范围、ROI材料和下一步评审安排。"],
      attendees: ["张决策 / 信息化中心 / 角色：decision_maker、budget_promoter"],
      agenda: ["复盘当前阶段与客户反馈，确认AI助手试点范围。", "对齐预算、财务审批路径和技术集成边界。"],
      materials: ["AI助手试点范围说明", "ROI测算材料"],
      questions: ["财务审批人是谁，财务审批材料和预算口径是否已经明确？"],
      expected_outcomes: ["形成下一步评审安排、责任人和时间表。"],
      follow_up_actions: ["拜访后24小时内整理会议纪要，安排业务、技术和财务评审并记录反馈。"],
      evidence: [
        {
          object_type: "activity",
          object_id: 88,
          title: "完成CRM V1试点需求确认会",
          summary: "双方确认进入试点方案细化阶段。",
          occurred_at: "2026-06-22T03:58:00+08:00",
          drilldown_url: "/activities?activity_id=88"
        }
      ],
      source_activity_count: 2,
      source_evidence_count: 1
    }
  ],
  aiCommunicationRecommendations: [
    {
      id: 8401,
      status: "pending_confirmation",
      opportunity_id: 10,
      account_id: 1,
      contact_id: 21,
      opportunity_name: "测试商机A",
      account_name: "测试客户A",
      contact_name: "张决策",
      contact_title: "CIO",
      recommended_channels: ["优先微信同步AI助手试点范围和ROI材料，降低首次沟通压力。", "通过电话确认评审时间、关键诉求和决策链路。"],
      tone: ["保持专业、简洁、以业务价值为先。"],
      key_messages: ["明确ROI口径、试点范围和评审材料，方便客户内部同步。"],
      timing: ["建议在评审前同步材料，给客户预留内部转发和问题收集时间。"],
      escalation_path: ["先与张决策确认业务价值和ROI材料，再请其牵引内部评审。"],
      do_not_say: ["不要在预算审批路径未明确前承诺最终价格、上线日期或客户侧收益。"],
      opening_message: "您好张决策，我想把AI助手试点范围、ROI材料和评审前需要确认的问题同步给您。",
      evidence: [
        {
          object_type: "activity",
          object_id: 88,
          title: "完成CRM V1试点需求确认会",
          summary: "双方确认进入试点方案细化阶段。",
          occurred_at: "2026-06-22T03:58:00+08:00",
          drilldown_url: "/activities?activity_id=88"
        }
      ],
      source_activity_count: 2,
      source_evidence_count: 1
    }
  ],
  dashboardReceivables: {
    filters: {},
    metric_cards: [
      { key: "planned_receivable_amount", label: "计划应收金额", value: 360000, unit: "CNY", drilldown_url: "/receivables" },
      { key: "confirmed_received_amount", label: "已确认回款", value: 180000, unit: "CNY", drilldown_url: "/receivables?received=true" },
      { key: "unreceived_amount", label: "未收金额", value: 180000, unit: "CNY", drilldown_url: "/receivables?unreceived=true" },
      { key: "pending_reconciliation_amount", label: "待核销到账", value: 60000, unit: "CNY", drilldown_url: "/reconciliations?pending_only=true" }
    ],
    status_distribution: [
      { status: "overdue", label: "已逾期", count: 1, planned_amount: 260000, received_amount: 180000, unreceived_amount: 80000, drilldown_url: "/receivables?receivable_status=overdue" },
      { status: "planned", label: "计划中", count: 1, planned_amount: 100000, received_amount: 0, unreceived_amount: 100000, drilldown_url: "/receivables?receivable_status=planned" }
    ],
    gap_trend: [
      { period: "2026-07", planned_amount: 360000, received_amount: 180000, gap_amount: 180000, receivable_count: 2 }
    ],
    reconciliation_summary: [
      { key: "confirmed_unreconciled", label: "待核销到账", count: 1, amount: 60000, level: "medium", drilldown_url: "/reconciliations?pending_only=true" },
      { key: "payment_exception", label: "异常到账", count: 0, amount: 0, level: "none", drilldown_url: "/payments?exception_only=true" }
    ],
    attention_receivables: [
      {
        object_type: "receivable_plan",
        object_id: 601,
        title: "V2 UAT 首付款回款",
        account_id: 1,
        opportunity_id: 10,
        contract_id: 301,
        owner_user_id: 1001,
        status: "overdue",
        amount: 80000,
        planned_at: "2026-07-20T10:00:00+08:00",
        reason: "大额逾期未收",
        drilldown_url: "/receivables?receivable_plan_id=601"
      }
    ]
  },
  dashboardRisks: {
    filters: {},
    metric_cards: [
      { key: "risk_count", label: "风险总数", value: 2, unit: "COUNT", drilldown_url: "/dashboard/risks" },
      { key: "high_risk_count", label: "高风险", value: 1, unit: "COUNT", drilldown_url: "/dashboard/risks?risk_level=high" },
      { key: "risk_amount", label: "风险金额", value: 200000, unit: "CNY", drilldown_url: "/dashboard/risks" }
    ],
    risk_summary: [
      {
        risk_type: "receivable_overdue",
        label: "回款逾期",
        count: 1,
        amount: 80000,
        highest_level: "high",
        drilldown_url: "/dashboard/risks?risk_type=receivable_overdue"
      },
      {
        risk_type: "unreconciled_payment",
        label: "未核销回款",
        count: 1,
        amount: 120000,
        highest_level: "medium",
        drilldown_url: "/dashboard/risks?risk_type=unreconciled_payment"
      }
    ],
    risk_trend: [
      { period: "2026-07", count: 2, amount: 200000, high_count: 1, drilldown_url: "/dashboard/risks?date_from=2026-07-01&date_to=2026-07-31" }
    ],
    owner_ranking: [
      {
        owner_user_id: 1001,
        owner_name: "销售一号",
        count: 2,
        amount: 200000,
        highest_priority_score: 343,
        drilldown_url: "/dashboard/risks?owner_id=1001"
      }
    ],
    risk_items: [
      {
        risk_type: "receivable_overdue",
        risk_label: "回款逾期",
        risk_level: "high",
        title: "V2 UAT 首付款回款",
        amount: 80000,
        object_type: "receivable_plan",
        object_id: 601,
        owner_user_id: 1001,
        owner_name: "销售一号",
        account_id: 1,
        account_name: "测试客户A",
        opportunity_id: 10,
        priority_score: 343,
        suggested_action: "跟进客户回款安排，补充回款跟进记录",
        occurred_at: "2026-07-20T10:00:00+08:00",
        drilldown_url: "/receivables?receivable_plan_id=601"
      }
    ]
  },
  dashboardFunnel: {
    filters: {},
    metric_cards: [
      { key: "forecast_amount", label: "预测金额", value: 900000, unit: "CNY", drilldown_url: "/opportunities" },
      { key: "weighted_forecast_amount", label: "加权预测", value: 405000, unit: "CNY", drilldown_url: "/opportunities" },
      { key: "active_count", label: "推进中商机", value: 1, unit: "count", drilldown_url: "/opportunities" },
      { key: "stalled_count", label: "停滞商机", value: 1, unit: "count", drilldown_url: "/opportunities" }
    ],
    stages: [
      {
        key: "proposal",
        label: "商业方案",
        count: 1,
        amount: 900000,
        weighted_amount: 405000,
        conversion_rate: 0.45,
        drilldown_url: "/opportunities?stage=proposal"
      },
      {
        key: "contract",
        label: "合同推进",
        count: 0,
        amount: 0,
        weighted_amount: 0,
        conversion_rate: 0.9,
        drilldown_url: "/opportunities?stage=contract"
      }
    ],
    forecast_trend: [
      { period: "2026-07", forecast_amount: 900000, weighted_forecast_amount: 405000, count: 1 }
    ],
    attention_opportunities: [
      {
        opportunity_id: 10,
        opportunity_name: "CRM AI 预测商机",
        account_id: 1,
        owner_user_id: 1001,
        stage: "proposal",
        risk_status: "warning",
        amount: 900000,
        expected_close_date: "2026-07-20",
        last_activity_at: "2026-06-01T00:00:00+08:00",
        reason: "停滞超过14天",
        drilldown_url: "/opportunities?opportunity_id=10"
      }
    ]
  },
  dashboardContracts: {
    filters: {},
    metric_cards: [
      { key: "contract_amount", label: "合同总额", value: 1200000, unit: "CNY", drilldown_url: "/contracts" },
      { key: "performing_amount", label: "执行中金额", value: 900000, unit: "CNY", drilldown_url: "/contracts?contract_status=performing" },
      { key: "overdue_milestone_count", label: "逾期节点", value: 1, unit: "count", drilldown_url: "/contracts?milestone_status=overdue" }
    ],
    status_distribution: [
      { status: "performing", label: "执行中", count: 1, amount: 900000, drilldown_url: "/contracts?contract_status=performing" },
      { status: "completed", label: "已完成", count: 1, amount: 300000, drilldown_url: "/contracts?contract_status=completed" }
    ],
    milestone_summary: [
      { key: "overdue", label: "逾期节点", count: 1, drilldown_url: "/contracts?milestone_status=overdue" },
      { key: "due_soon", label: "30天内到期", count: 2, drilldown_url: "/contracts?milestone_due=soon" }
    ],
    change_trend: [
      { period: "2026-07", change_count: 2 }
    ],
    attention_contracts: [
      {
        contract_id: 301,
        contract_name: "CRM AI V3 实施合同",
        account_id: 1,
        opportunity_id: 10,
        owner_user_id: 1001,
        contract_status: "performing",
        risk_level: "high",
        contract_amount: 900000,
        next_milestone_name: "上线验收",
        next_milestone_planned_at: "2026-07-20T10:00:00+08:00",
        reason: "节点逾期",
        drilldown_url: "/contracts?contract_id=301"
      }
    ]
  },
  dashboardInvoices: {
    filters: {},
    metric_cards: [
      { key: "planned_invoice_amount", label: "计划开票金额", value: 360000, unit: "CNY", drilldown_url: "/invoices" },
      { key: "applied_invoice_amount", label: "已申请金额", value: 360000, unit: "CNY", drilldown_url: "/invoices?invoice_status=applied" },
      { key: "invoice_gap_amount", label: "开票缺口金额", value: 120000, unit: "CNY", drilldown_url: "/invoices" },
      { key: "exception_count", label: "异常开票", value: 1, unit: "count", drilldown_url: "/invoices?exception_only=true" }
    ],
    status_distribution: [
      { status: "invoiced", label: "已开票", count: 1, planned_amount: 240000, actual_amount: 240000, drilldown_url: "/invoices?invoice_status=invoiced" },
      { status: "exception", label: "异常", count: 1, planned_amount: 120000, actual_amount: 0, drilldown_url: "/invoices?invoice_status=exception" }
    ],
    gap_trend: [
      { period: "2026-07", planned_amount: 360000, invoiced_amount: 240000, gap_amount: 120000, count: 2 }
    ],
    risk_summary: [
      { key: "exception", label: "异常开票", count: 1, amount: 120000, level: "medium", drilldown_url: "/invoices?exception_only=true" },
      { key: "unsigned", label: "开票未签收", count: 1, amount: 240000, level: "medium", drilldown_url: "/invoices?invoice_risk=unsigned" }
    ],
    attention_invoices: [
      {
        invoice_id: 401,
        plan_name: "V2 UAT 首期开票",
        account_id: 1,
        opportunity_id: 10,
        contract_id: 301,
        owner_user_id: 1001,
        invoice_status: "exception",
        planned_amount: 120000,
        actual_amount: 0,
        planned_invoice_date: "2026-07-15T10:00:00+08:00",
        invoice_date: "2026-07-16T10:00:00+08:00",
        reason: "开票异常",
        drilldown_url: "/invoices?invoice_id=401"
      }
    ]
  },
  reconciliations: [
    {
      id: 902,
      account_id: 1,
      opportunity_id: 10,
      contract_id: 301,
      invoice_id: 401,
      payment_id: 701,
      invoice_no: "INV-401",
      payment_name: "首付款到账",
      reconciliation_no: "REC-902",
      reconciliation_status: "active",
      reconciled_amount: 120000,
      reconciled_at: "2026-07-23T10:00:00+08:00",
      reconciled_by: 1001,
      reconcile_note: "首付款核销",
      invoice_actual_amount: 360000,
      invoice_reconciled_amount: 120000,
      invoice_unreconciled_amount: 240000,
      payment_confirmed_amount: 120000,
      payment_reconciled_amount: 120000,
      payment_unreconciled_amount: 0
    }
  ],
  activities: [
    {
      id: 88,
      account_id: 1,
      opportunity_id: 10,
      subject: "完成CRM V1试点需求确认会",
      activity_type: "meeting",
      activity_status: "completed",
      activity_result: "aligned",
      activity_time: "2026-06-22T03:58:00+08:00",
      next_follow_up_at: "2026-06-25T10:00:00+08:00",
      owner_department_id: 1,
      owner_user_id: 1001,
      communication_content: "围绕CRM V1试点目标、角色权限、客户档案和商机推进节奏完成确认。",
      customer_feedback: "客户希望先以重点客户团队试点，验证周进展和提醒机制。",
      conclusion: "双方确认进入试点方案细化阶段。",
      next_plan: "三日内提交试点方案和演示账号。",
      risk_description: "需在方案中明确历史数据导入范围。",
      include_in_weekly_progress: true,
      weekly_period: "current_week",
      contact_ids: [21],
      risk_types: ["data_migration"]
    }
  ],
  reminders: [],
  weeklyProgress: [
    {
      opportunity_id: 10,
      account_id: 1,
      owner_user_id: 1001,
      week_start_date: "2026-06-15",
      week_end_date: "2026-06-21",
      activity_count: 1,
      latest_activity_at: "2026-06-22T03:58:00+08:00",
      progress_items: [
        {
          activity_id: 88,
          subject: "完成CRM V1试点需求确认会",
          activity_time: "2026-06-22T03:58:00+08:00",
          conclusion: "双方确认进入试点方案细化阶段。",
          next_plan: "三日内提交试点方案和演示账号。",
          risk_description: "需在方案中明确历史数据导入范围。",
          activity_result: "aligned"
        }
      ]
    }
  ],
  dictionaries: [
    {
      id: 501,
      dict_code: "account_level",
      dict_name: "客户等级",
      items: [{ id: 9001, item_code: "A", item_name: "A级", is_active: true }]
    }
  ],
  auditLogs: [
    {
      id: 7001,
      actor_user_id: 1001,
      module_code: "account",
      action_code: "account.create",
      object_type: "crm_account",
      object_id: 1,
      result: "success",
      trace_id: "trace-001",
      occurred_at: "2026-06-18T10:00:00+08:00"
    }
  ],
  aiLogs: [
    {
      id: 9101,
      event_type: "generated",
      ai_module: "weekly_report",
      operation: "generate",
      status: "pending_confirmation",
      source_type: "weekly_report",
      source_id: 8101,
      title: "AI周报",
      summary: "本周跟进 1 个商机，沉淀 2 条有效行动。",
      business_url: "/ai-assistant/weekly-report",
      actor_user_id: 1001,
      occurred_at: "2026-07-08T09:30:00+08:00"
    },
    {
      id: 9102,
      event_type: "write",
      ai_module: "draft",
      operation: "confirm",
      status: "success",
      source_type: "draft",
      source_id: 7001,
      object_type: "account",
      object_id: 1,
      title: "确认并写入",
      summary: "确认并写入：客户 #1",
      business_url: "/accounts?account_id=1",
      actor_user_id: 1001,
      trace_id: "ai-write-trace-001",
      occurred_at: "2026-07-08T10:00:00+08:00"
    }
  ],
  users: [
    {
      id: 1001,
      department_id: 1,
      name: "销售一号",
      login_username: "sales",
      email: "sales@example.com",
      status: "active",
      roles: [{ id: 3001, code: "sales_admin", name: "销售管理员" }]
    }
  ],
  departments: [
    {
      id: 1,
      code: "sales-cn",
      name: "华东销售部",
      region_code: "CN-31",
      status: "active"
    }
  ],
  roles: [
    {
      id: 3001,
      code: "sales_admin",
      name: "销售管理员",
      description: "V1 销售管理员",
      permission_codes: ["account.read"]
    }
  ],
  permissions: [
    {
      id: 4101,
      permission_code: "account.read",
      permission_name: "查看客户",
      permission_type: "operation",
      module_code: "account"
    },
    {
      id: 4102,
      permission_code: "account.create",
      permission_name: "新建客户",
      permission_type: "operation",
      module_code: "account"
    },
    {
      id: 4201,
      permission_code: "contract.terminate",
      permission_name: "终止合同",
      permission_type: "operation",
      module_code: "contract"
    },
    {
      id: 4202,
      permission_code: "invoice.issue",
      permission_name: "登记发票",
      permission_type: "operation",
      module_code: "invoice"
    },
    {
      id: 4203,
      permission_code: "reconciliation.void",
      permission_name: "撤销核销",
      permission_type: "operation",
      module_code: "reconciliation"
    },
    {
      id: 4103,
      permission_code: "system.audit.read",
      permission_name: "查看审计日志",
      permission_type: "operation",
      module_code: "system"
    },
    {
      id: 4301,
      permission_code: "ai.context.read",
      permission_name: "查看AI上下文",
      permission_type: "operation",
      module_code: "ai"
    },
    {
      id: 4302,
      permission_code: "ai.draft.manage",
      permission_name: "管理AI草稿",
      permission_type: "operation",
      module_code: "ai"
    },
    {
      id: 4303,
      permission_code: "ai.weekly.manage",
      permission_name: "管理AI周报",
      permission_type: "operation",
      module_code: "ai"
    },
    {
      id: 4304,
      permission_code: "ai.opportunity.analyze",
      permission_name: "分析AI商机",
      permission_type: "operation",
      module_code: "ai"
    },
    {
      id: 4305,
      permission_code: "ai.visit.plan",
      permission_name: "生成AI拜访计划",
      permission_type: "operation",
      module_code: "ai"
    },
    {
      id: 4306,
      permission_code: "ai.communication.recommend",
      permission_name: "生成AI沟通建议",
      permission_type: "operation",
      module_code: "ai"
    },
    {
      id: 4307,
      permission_code: "ai.log.read",
      permission_name: "查看AI日志",
      permission_type: "operation",
      module_code: "ai"
    },
    {
      id: 4104,
      permission_code: "system.ai-config.manage",
      permission_name: "管理AI配置",
      permission_type: "operation",
      module_code: "system"
    }
  ],
  aiModelConfigs: [
    {
      id: 9101,
      provider: "openai",
      base_url: "https://api.openai.com/v1",
      model_name: "gpt-4.1-mini",
      api_key_masked: "sk-t...cdef",
      enabled: true,
      last_test_status: "success",
      last_test_message: "OpenAI模型连接成功：gpt-4.1-mini",
      last_test_at: "2026-07-09T12:00:00+08:00",
      created_by: 1001,
      created_at: "2026-07-09T11:59:00+08:00"
    }
  ]
};

describe("CRM frontend V1 workflow", () => {
  it("uses the supported Ant Design Alert title API", () => {
    expect(appSource).not.toMatch(/<Alert[^>]*\bmessage=/);
  });

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the real login form before authentication", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "项目型大客户 CRM" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /登\s*录/ })).toBeInTheDocument();
  });

  it("logs in, unwraps unified responses, and renders the V1 navigation", async () => {
    mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("用户名"), "sales");
    await user.type(screen.getByLabelText("密码"), "S3cure!123");
    await user.click(screen.getByRole("button", { name: /登\s*录/ }));

    expect(await screen.findByText("销售一号")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "客户池" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "商机" })).toBeInTheDocument();
    expect(await screen.findByText("我的商机")).toBeInTheDocument();
    expect(localStorage.getItem("crm.access_token")).toBe("token-001");
  });

  it("keeps the sidebar fixed while the business content scrolls independently", async () => {
    mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    const shell = document.querySelector(".app-shell");
    const sidebar = document.querySelector(".app-sidebar");
    const content = document.querySelector(".app-content");

    expect(shell).toBeInTheDocument();
    expect(sidebar).toBeInTheDocument();
    expect(content).toBeInTheDocument();

    expect(stylesCss).toMatch(/\.app-shell\s*{[^}]*height:\s*100vh;[^}]*overflow:\s*hidden;[^}]*}/s);
    expect(stylesCss).toMatch(/\.app-sidebar\s*{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*height:\s*100vh;[^}]*overflow-y:\s*auto;[^}]*}/s);
    expect(stylesCss).toMatch(/\.app-shell\s*>\s*\.ant-layout\s*{[^}]*height:\s*100vh;[^}]*overflow:\s*hidden;[^}]*}/s);
    expect(stylesCss).toMatch(/\.app-content\s*{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;[^}]*}/s);
  });

  it("uses a drawer navigation instead of stacking the full sidebar on mobile", async () => {
    mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("button", { name: "打开导航" }));

    expect(await screen.findByRole("dialog", { name: "导航菜单" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "工作台" })).toHaveLength(2);
    expect(stylesCss).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*?\.app-sidebar\s*{[^}]*display:\s*none\s*!important;/s);
  });

  it("shows a dashboard command center with priority and quick entries", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "今日优先处理" })).toBeInTheDocument();
    expect(screen.getByText("先查看 1 个在办商机，确认阶段、风险和下一步计划。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新建客户" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新建商机" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新建行动" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看周进展" })).toBeInTheDocument();
  });

  it("renders the V4 AI assistant workbench context preview", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI销售作战助手" })).toBeInTheDocument();
    expect(screen.getByText("当前版本由业务规则辅助生成，未调用远程模型；AI配置仅用于连接测试。"))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "待确认队列" })).toBeInTheDocument();
    expect(screen.getByText("6 项待确认")).toBeInTheDocument();
    expect(screen.getAllByText("草稿确认").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("周报生成").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("商机分析").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("拜访计划").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("沟通建议").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "快捷任务" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "录入销售事实" })).toHaveAttribute("href", "#ai-text-input");
    expect(screen.getByRole("link", { name: "生成周报" })).toHaveAttribute("href", "/ai-assistant/weekly-report");
    expect(screen.getByRole("link", { name: "分析商机" })).toHaveAttribute("href", "/ai-assistant/opportunities");
    expect(screen.getByRole("link", { name: "准备拜访" })).toHaveAttribute("href", "/ai-assistant/visit-plans");
    expect(screen.getByRole("link", { name: "推荐沟通方式" })).toHaveAttribute("href", "/ai-assistant/communication");
    expect(screen.getByRole("heading", { name: "最近AI建议" })).toBeInTheDocument();
    expect(screen.getAllByText(/优先微信同步AI助手试点范围和ROI材料/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "文本录入" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "客户上下文" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "商机上下文" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "近期销售行动" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "风险信号" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "证据链" })).toBeInTheDocument();
    expect(screen.getAllByText("测试客户A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("测试商机A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("完成CRM V1试点需求确认会").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("V2 UAT 首付款回款逾期")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-context/summary"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-drafts?status=pending_confirmation"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-weekly-reports"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-opportunity-analyses"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-visit-plans"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-communication-recommendations"), expect.anything());
    });
  });

  it("renders V4 AI logs with filters and business links", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant/logs");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI日志" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AI日志" })).toHaveAttribute("href", "/ai-assistant/logs");
    expect(screen.getByText("AI周报")).toBeInTheDocument();
    expect(screen.getByText("确认并写入：客户 #1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看业务对象" })).toHaveAttribute("href", "/accounts?account_id=1");

    await user.click(screen.getByRole("button", { name: "详情 确认并写入" }));
    const detailDrawer = await screen.findByRole("dialog", { name: "AI日志详情" });
    expect(within(detailDrawer).getByText("ai-write-trace-001")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));

    await user.click(screen.getByLabelText("事件类型"));
    await user.click(await screen.findByTitle("写入/确认"));
    await user.click(screen.getByLabelText("对象类型"));
    await user.click(await screen.findByTitle("客户"));
    await user.type(screen.getByLabelText("对象ID"), "1");
    await user.click(screen.getByRole("button", { name: /筛\s*选/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-logs?event_type=write"), expect.anything());
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("object_type=account"), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("object_id=1"), expect.anything());
  });

  it("generates AI drafts from workbench text input", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant");

    render(<App />);
    await loginThroughUi(user);

    await user.type(
      await screen.findByPlaceholderText(/客户：星河制造/),
      "客户：测试客户AI，行业：制造业"
    );
    await user.click(screen.getByRole("button", { name: "生成草稿" }));

    expect((await screen.findAllByText("客户草稿")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("联系人草稿").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("测试客户AI")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-drafts/parse"), expect.anything());
    });
  });

  it("shows business labels for AI draft missing fields instead of technical keys", async () => {
    const unknownDrafts: AiDraft[] = [
      {
        id: 7010,
        input_record_id: 9010,
        draft_type: "unknown",
        status: "need_more_info",
        target_action: "create",
        source_text: "今天客户沟通情况先记录一下",
        payload: {
          source_text: "今天客户沟通情况先记录一下"
        },
        missing_fields: ["draft_type"],
        conflicts: ["未识别出客户、联系人、商机或行动"],
        confidence_status: "low"
      }
    ];
    mockCrmFetch({
      aiDrafts: unknownDrafts as unknown as typeof apiData.aiDrafts
    });
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant/drafts");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByText("业务对象类型")).toBeInTheDocument();
    expect(screen.queryByText("draft_type")).not.toBeInTheDocument();
  });

  it("confirms pending AI draft from draft queue", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant/drafts");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "草稿确认" })).toBeInTheDocument();
    expect(screen.getByText("测试客户AI")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "确认写入" })[0]);

    expect(await screen.findByText("已写入")).toBeInTheDocument();
    expect(screen.getByText("account #2")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-drafts/7001/confirm"), expect.anything());
    });
  });

  it("generates and confirms AI weekly report from weekly assistant page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant/weekly-report");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI周报" })).toBeInTheDocument();
    expect(screen.getByText("本周跟进 1 个商机，沉淀 2 条有效行动。")).toBeInTheDocument();
    expect(screen.getByText("测试商机A")).toBeInTheDocument();
    expect(screen.getAllByText("预算审批链路未明确").length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole("button", { name: "生成周报" }));

    expect(await screen.findByText("周报已生成，确认前不会写入周进展")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认写入周进展" }));

    expect(await screen.findByText("周报已确认写入周进展")).toBeInTheDocument();
    expect(screen.getByText("已写入 1 条周进展行动")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看周进展" })).toHaveAttribute("href", "/weekly-progress");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-weekly-reports/generate"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-weekly-reports/8101/confirm"), expect.anything());
    });
  });

  it("generates and confirms AI opportunity analysis from assistant page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant/opportunities");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI商机分析" })).toBeInTheDocument();
    expect(screen.getByText("测试商机A")).toBeInTheDocument();
    expect(screen.getByText("预算审批链路未明确")).toBeInTheDocument();
    expect(screen.getByText("确认财务审批人、预算口径和审批材料清单。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "生成商机分析" }));

    expect(await screen.findByText("商机分析已生成，确认前不会写入销售行动")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认写入行动" }));

    expect(await screen.findByText("商机分析已确认写入销售行动")).toBeInTheDocument();
    expect(screen.getByText("已写入销售行动 #8802")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看写入行动" })).toHaveAttribute("href", "/activities?activity_id=8802");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-opportunity-analyses/generate"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-opportunity-analyses/8201/confirm"), expect.anything());
    });
  });

  it("generates and confirms AI visit plan from assistant page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant/visit-plans");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI拜访计划" })).toBeInTheDocument();
    expect(screen.getByText("测试商机A")).toBeInTheDocument();
    expect(screen.getByText("明确AI助手试点范围、ROI材料和下一步评审安排。")).toBeInTheDocument();
    expect(screen.getByText("财务审批人是谁，财务审批材料和预算口径是否已经明确？")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "生成拜访计划" }));

    expect(await screen.findByText("拜访计划已生成，确认前不会写入销售行动")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认写入行动" }));

    expect(await screen.findByText("拜访计划已确认写入销售行动")).toBeInTheDocument();
    expect(screen.getByText("已写入销售行动 #8803")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看写入行动" })).toHaveAttribute("href", "/activities?activity_id=8803");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-visit-plans/generate"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-visit-plans/8301/confirm"), expect.anything());
    });
  });

  it("generates and confirms AI communication recommendation from assistant page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/ai-assistant/communication");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI沟通建议" })).toBeInTheDocument();
    expect(await screen.findByText("测试客户A · 测试商机A")).toBeInTheDocument();
    expect(await screen.findByText("张决策")).toBeInTheDocument();
    expect(await screen.findByText("优先微信同步AI助手试点范围和ROI材料，降低首次沟通压力。")).toBeInTheDocument();
    expect(screen.getByText("不要在预算审批路径未明确前承诺最终价格、上线日期或客户侧收益。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "生成沟通建议" }));

    expect(await screen.findByText("沟通建议已生成，确认前不会写入销售行动")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认写入行动" }));

    expect(await screen.findByText("沟通建议已确认写入销售行动")).toBeInTheDocument();
    expect(screen.getByText("已写入销售行动 #8804")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看写入行动" })).toHaveAttribute("href", "/activities?activity_id=8804");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-communication-recommendations/generate"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-communication-recommendations/8401/confirm"), expect.anything());
    });
  });

  it("renders the V3 dashboard overview with metrics risks and drilldowns", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/dashboard");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "经营总览" })).toBeInTheDocument();
    expect(screen.getByText("预测金额")).toBeInTheDocument();
    expect(screen.getByText("合同金额")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "销售到财务链路" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "风险摘要" })).toBeInTheDocument();
    expect(screen.getByText("V2 UAT 首付款回款逾期")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看逾期回款" })).toHaveAttribute("href", "/receivables?overdue=true");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/overview"), expect.anything());
    });
  });

  it("renders the V3 sales funnel forecast page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/dashboard/funnel");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "销售漏斗" })).toBeInTheDocument();
    expect(screen.getByText("加权预测")).toBeInTheDocument();
    expect(screen.getByText("商业方案")).toBeInTheDocument();
    expect(screen.getByText("2026-07")).toBeInTheDocument();
    expect(screen.getByText("CRM AI 预测商机")).toBeInTheDocument();
    expect(screen.getByText("停滞超过14天")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/funnel"), expect.anything());
    });
  });

  it("renders the V3 contract dashboard page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/dashboard/contracts");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "合同看板" })).toBeInTheDocument();
    expect(screen.getByText("合同总额")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "合同状态分布" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "履约节点概览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "变更趋势" })).toBeInTheDocument();
    expect(screen.getByText("CRM AI V3 实施合同")).toBeInTheDocument();
    expect(screen.getByText("节点逾期")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/contracts"), expect.anything());
    });
  });

  it("renders the V3 invoice dashboard page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/dashboard/invoices");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "开票看板" })).toBeInTheDocument();
    expect(screen.getByText("计划开票金额")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "开票状态分布" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "开票缺口趋势" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "签收与异常概览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "重点关注开票" })).toBeInTheDocument();
    expect(screen.getByText("V2 UAT 首期开票")).toBeInTheDocument();
    expect(screen.getByText("开票异常")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/invoices"), expect.anything());
    });
  });

  it("renders the V3 receivable dashboard page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/dashboard/receivables");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "回款看板" })).toBeInTheDocument();
    expect(screen.getByText("计划应收金额")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "回款状态分布" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "回款缺口趋势" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "到账与核销概览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "重点关注回款" })).toBeInTheDocument();
    expect(screen.getByText("V2 UAT 首付款回款")).toBeInTheDocument();
    expect(screen.getByText("大额逾期未收")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/receivables"), expect.anything());
    });
  });

  it("renders the V3 risk warning dashboard page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/dashboard/risks");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "风险预警" })).toBeInTheDocument();
    expect(screen.getByText("风险总数")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "风险类型" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "风险趋势" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "责任人排行" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "风险处置清单" })).toBeInTheDocument();
    expect(screen.getAllByText("销售一号").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("跟进客户回款安排，补充回款跟进记录")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/dashboard/risks"), expect.anything());
    });
  });

  it("opens receivable drilldown links with the plan detail selected", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/receivables?account_id=1&contract_id=301&receivable_plan_id=601");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "回款管理" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "回款详情" })).toBeInTheDocument();
    expect(screen.getByText("首付款到账")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/receivable-plans?account_id=1&contract_id=301"),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/receivable-plans/601"), expect.anything());
    });
  });

  it("opens opportunity drilldown links with the opportunity detail selected", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/opportunities?opportunity_id=10");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "商机" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "商机推进入口" })).toBeInTheDocument();
    expect(screen.getAllByText("测试商机A").length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/opportunities/10"), expect.anything());
    });
  });

  it("opens a contact detail from the contact_id deep link", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "联系人经营入口" })).toBeInTheDocument();
    expect(screen.getAllByText(/张决策/).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts?account_id=1", expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/contacts/21"), expect.anything());
    });
  });

  it("keeps the contact list visible when a contact deep link fails", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({}, { failPaths: ["/api/contacts/21"] });
    window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByText("/api/contacts/21 加载失败")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "联系人" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "张决策" })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts?account_id=1", expect.anything());
    });
    expect(screen.queryByRole("heading", { name: "联系人经营入口" })).not.toBeInTheDocument();
  });

  it("synchronizes contact filters and closes detail when same-route query parameters change", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

    render(<App />);
    await loginThroughUi(user);
    expect(await screen.findByText(/张决策 ·/)).toBeInTheDocument();

    act(() => {
      window.history.pushState({}, "", "/contacts?account_id=2&contact_id=22");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(await screen.findByText(/李采购 ·/)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts?account_id=2", expect.anything());
    });

    act(() => {
      window.history.pushState({}, "", "/contacts?account_id=2");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "联系人经营入口" })).not.toBeInTheDocument();
    });
  });

  it("ignores an older contact detail response after a newer deep link resolves", async () => {
    const contact21Response = deferred<Response>();
    const contact22Response = deferred<Response>();
    const fetchMock = mockCrmFetch();
    const defaultFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) => {
      const path = String(input).split("?")[0];
      if (path.endsWith("/api/contacts/21")) {
        return contact21Response.promise;
      }
      if (path.endsWith("/api/contacts/22")) {
        return contact22Response.promise;
      }
      return defaultFetch!(input, init);
    });
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

    render(<App />);
    await loginThroughUi(user);

    act(() => {
      window.history.pushState({}, "", "/contacts?account_id=1&contact_id=22");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts/22", expect.anything());
    });

    await act(async () => {
      contact22Response.resolve(jsonResponse({ code: "OK", data: apiData.contacts[1] }));
      await contact22Response.promise;
    });
    expect(await screen.findByText(/李采购 ·/)).toBeInTheDocument();

    await act(async () => {
      contact21Response.resolve(jsonResponse({ code: "OK", data: apiData.contacts[0] }));
      await contact21Response.promise;
    });

    expect(latestDialog().getByText(/李采购 ·/)).toBeInTheDocument();
    expect(latestDialog().queryByText(/张决策 ·/)).not.toBeInTheDocument();
  });

  it("closes a query-selected contact when the replacement detail fails", async () => {
    const fetchMock = mockCrmFetch();
    const defaultFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) => {
      if (String(input).split("?")[0].endsWith("/api/contacts/22")) {
        return Promise.resolve(jsonResponse({ code: "ERROR", message: "联系人详情失败" }, 500));
      }
      return defaultFetch!(input, init);
    });
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

    render(<App />);
    await loginThroughUi(user);
    expect(await screen.findByText(/张决策 ·/)).toBeInTheDocument();

    act(() => {
      window.history.pushState({}, "", "/contacts?account_id=1&contact_id=22");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(await screen.findByText("联系人详情失败")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "联系人经营入口" })).not.toBeInTheDocument();
    expect(screen.queryByText(/张决策 ·/)).not.toBeInTheDocument();
  });

  it("ignores a stale contact list after the account filter changes", async () => {
    const account1Response = deferred<Response>();
    const account2Response = deferred<Response>();
    const account2Contact = {
      ...apiData.contacts[1],
      id: 23,
      account_id: 2,
      name: "王新客户"
    };
    const fetchMock = mockCrmFetch();
    const defaultFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.endsWith("/api/contacts") && url.searchParams.get("account_id") === "1") {
        return account1Response.promise;
      }
      if (url.pathname.endsWith("/api/contacts") && url.searchParams.get("account_id") === "2") {
        return account2Response.promise;
      }
      return defaultFetch!(input, init);
    });
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contacts?account_id=1");

    render(<App />);
    await loginThroughUi(user);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts?account_id=1", expect.anything());
    });

    act(() => {
      window.history.pushState({}, "", "/contacts?account_id=2");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts?account_id=2", expect.anything());
    });

    await act(async () => {
      account2Response.resolve(jsonResponse({ code: "OK", data: [account2Contact] }));
      await account2Response.promise;
    });
    expect(await screen.findByRole("button", { name: "王新客户" })).toBeInTheDocument();

    await act(async () => {
      account1Response.resolve(jsonResponse({ code: "OK", data: [apiData.contacts[0]] }));
      await account1Response.promise;
    });

    expect(screen.getByRole("button", { name: "王新客户" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "张决策" })).not.toBeInTheDocument();
  });

  it("keeps a manual contact selection when a pending deep link resolves", async () => {
    const contact21Response = deferred<Response>();
    const fetchMock = mockCrmFetch();
    const defaultFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) => {
      if (String(input).split("?")[0].endsWith("/api/contacts/21")) {
        return contact21Response.promise;
      }
      return defaultFetch!(input, init);
    });
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

    render(<App />);
    await loginThroughUi(user);
    await user.click(await screen.findByRole("button", { name: "李采购" }));
    expect(await screen.findByText(/李采购 ·/)).toBeInTheDocument();

    await act(async () => {
      contact21Response.resolve(jsonResponse({ code: "OK", data: apiData.contacts[0] }));
      await contact21Response.promise;
    });

    expect(latestDialog().getByText(/李采购 ·/)).toBeInTheDocument();
    expect(latestDialog().queryByText(/张决策 ·/)).not.toBeInTheDocument();
  });

  it("keeps the contact drawer closed when a pending deep link resolves", async () => {
    const contact22Response = deferred<Response>();
    const fetchMock = mockCrmFetch();
    const defaultFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) => {
      if (String(input).split("?")[0].endsWith("/api/contacts/22")) {
        return contact22Response.promise;
      }
      return defaultFetch!(input, init);
    });
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contacts?account_id=1");

    render(<App />);
    await loginThroughUi(user);
    await user.click(await screen.findByRole("button", { name: "张决策" }));
    expect(await screen.findByText(/张决策 ·/)).toBeInTheDocument();

    act(() => {
      window.history.pushState({}, "", "/contacts?account_id=1&contact_id=22");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts/22", expect.anything());
    });
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "联系人经营入口" })).not.toBeInTheDocument();
    });

    await act(async () => {
      contact22Response.resolve(jsonResponse({ code: "OK", data: apiData.contacts[1] }));
      await contact22Response.promise;
    });

    expect(screen.queryByRole("heading", { name: "联系人经营入口" })).not.toBeInTheDocument();
  });

  it("clears a contact detail error when a contact is selected manually", async () => {
    const fetchMock = mockCrmFetch();
    const defaultFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) => {
      if (String(input).split("?")[0].endsWith("/api/contacts/21")) {
        return Promise.resolve(jsonResponse({ code: "ERROR", message: "联系人详情失败" }, 500));
      }
      return defaultFetch!(input, init);
    });
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contacts?account_id=1&contact_id=21");

    render(<App />);
    await loginThroughUi(user);
    expect(await screen.findByText("联系人详情失败")).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "李采购" }));

    expect(await screen.findByText(/李采购 ·/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("联系人详情失败")).not.toBeInTheDocument();
    });
  });

  it("opens contract drilldown links with the contract detail selected", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contracts?contract_id=301");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "合同" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "合同执行台" })).toBeInTheDocument();
    expect(screen.getAllByText("CRM-V2-20260629").length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/contracts/301"), expect.anything());
    });
  });

  it("opens invoice drilldown links with the invoice detail selected", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/invoices?invoice_id=401");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "开票管理" })).toBeInTheDocument();
    expect(await screen.findByText("V2 UAT 首期开票")).toBeInTheDocument();
    expect(screen.getAllByText("INV-401").length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/invoices/401"), expect.anything());
    });
  });

  it("renders the payment list drilldown with query filters", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/payments?account_id=1&contract_id=301&payment_status=confirmed");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "到账流水" })).toBeInTheDocument();
    expect(screen.getByText("首付款到账")).toBeInTheDocument();
    expect(screen.getByText("FLOW-701")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/payments?account_id=1&contract_id=301&payment_status=confirmed"),
        expect.anything()
      );
    });
  });

  it("keeps reconciliation drilldown filters and selected payment", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/reconciliations?account_id=1&payment_id=701&reconciliation_status=active");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "核销工作台" })).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /首付款到账/ })).toBeChecked();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/reconciliations?account_id=1&payment_id=701&reconciliation_status=active"),
        expect.anything()
      );
    });
  });

  it("shows dashboard navigation only with dashboard read permission", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    expect(screen.getByRole("link", { name: "驾驶舱" })).toHaveAttribute("href", "/dashboard");
  });

  it("shows the dashboard parent menu for a child-dashboard-only permission", async () => {
    const user = userEvent.setup();
    mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: ["dashboard.funnel.read"]
      }
    });

    render(<App />);
    await loginThroughUi(user);

    expect(screen.getByRole("menuitem", { name: "驾驶舱" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "销售漏斗" })).toHaveAttribute("href", "/dashboard/funnel");
    expect(screen.queryByRole("link", { name: "经营总览" })).not.toBeInTheDocument();
  });

  it("shows login errors from the unified API layer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ code: "UNAUTHORIZED", message: "用户名或密码错误" }, 401)
    );
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("用户名"), "bad");
    await user.type(screen.getByLabelText("密码"), "bad");
    await user.click(screen.getByRole("button", { name: /登\s*录/ }));

    expect(await screen.findByText("用户名或密码错误")).toBeInTheDocument();
  });

  it("creates an account from the customer list page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    expect(await screen.findByText("测试客户A")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建客户" }));
    await user.type(screen.getByLabelText("客户名称"), "新增客户B");
    await user.click(screen.getByRole("button", { name: "保存客户" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/accounts",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("新增客户B")
        })
      );
    });
  });

  it("filters accounts with backend query parameters", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.type(screen.getByPlaceholderText("客户名称/简称"), "测试");
    await user.click(screen.getByRole("button", { name: /筛\s*选/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/accounts?keyword="), expect.anything());
    });
  });

  it("shows the customer operation entry from the account list", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.click(screen.getByRole("button", { name: /查看经营/ }));

    expect(await screen.findByRole("heading", { name: "客户经营入口" })).toBeInTheDocument();
    expect(screen.getByText("客户摘要")).toBeInTheDocument();
    expect(screen.getAllByText("企业客户").length).toBeGreaterThan(0);
    expect(screen.getAllByText("跟进中").length).toBeGreaterThan(0);
    expect(screen.getAllByText("最近跟进").length).toBeGreaterThan(0);
    expect(screen.getAllByText("完成CRM V1试点需求确认会").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "维护联系人" })).toHaveAttribute("href", "/contacts");
    expect(screen.getByRole("link", { name: "推进商机" })).toHaveAttribute("href", "/opportunities");
    expect(screen.getByRole("link", { name: "记录销售行动" })).toHaveAttribute("href", "/activities");
    expect(screen.getByText("下一步建议")).toBeInTheDocument();
  });

  it("shows related contacts and opportunities with detail links", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.click(screen.getByRole("button", { name: /查看经营/ }));

    const relatedRecords = await screen.findByRole("region", { name: "客户关联记录" });
    const contactHeading = within(relatedRecords).getByRole("heading", { name: "关联联系人" });
    expect(contactHeading.closest(".section-title-row")).toBeInTheDocument();
    expect(await within(relatedRecords).findByText("2 人")).toBeInTheDocument();
    expect(await within(relatedRecords).findByRole("link", { name: "查看联系人 张决策" })).toHaveAttribute(
      "href",
      "/contacts?account_id=1&contact_id=21"
    );
    expect(await within(relatedRecords).findByRole("link", { name: "查看联系人 李采购" })).toHaveAttribute(
      "href",
      "/contacts?account_id=1&contact_id=22"
    );
    expect(within(relatedRecords).getByRole("link", { name: "查看全部联系人" })).toHaveAttribute(
      "href",
      "/contacts?account_id=1"
    );

    const opportunityHeading = within(relatedRecords).getByRole("heading", { name: "关联商机" });
    expect(opportunityHeading.closest(".section-title-row")).toBeInTheDocument();
    expect(await within(relatedRecords).findByText("1 个")).toBeInTheDocument();
    expect(await within(relatedRecords).findByRole("link", { name: "查看商机 测试商机A" })).toHaveAttribute(
      "href",
      "/opportunities?account_id=1&opportunity_id=10"
    );
    expect(within(relatedRecords).getByRole("link", { name: "查看全部商机" })).toHaveAttribute(
      "href",
      "/opportunities?account_id=1"
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts?account_id=1", expect.anything());
      expect(fetchMock).toHaveBeenCalledWith("/api/opportunities?account_id=1", expect.anything());
    });
  });

  it("does not load account relations without relation permissions", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: { ...apiData.user, permissions: ["account.read"] }
    });

    render(<App />);
    await loginThroughUi(user);
    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");

    fetchMock.mockClear();
    await user.click(screen.getByRole("button", { name: /查看经营/ }));

    expect(await screen.findByRole("heading", { name: "客户经营入口" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "客户关联记录" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/contacts"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/opportunities"), expect.anything());
  });

  it("shows independent empty states for account relations", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({ contacts: [], opportunities: [] });

    render(<App />);
    await loginThroughUi(user);
    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.click(screen.getByRole("button", { name: /查看经营/ }));

    const relatedRecords = await screen.findByRole("region", { name: "客户关联记录" });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts?account_id=1", expect.anything());
      expect(fetchMock).toHaveBeenCalledWith("/api/opportunities?account_id=1", expect.anything());
    });
    expect(await within(relatedRecords).findByText("暂无关联联系人")).toBeInTheDocument();
    expect(await within(relatedRecords).findByText("暂无关联商机")).toBeInTheDocument();
  });

  it("does not show stale account relations after switching customers", async () => {
    const account1Contacts = deferred<Response>();
    const account1Opportunities = deferred<Response>();
    const account2Contacts = deferred<Response>();
    const account2Opportunities = deferred<Response>();
    const account2 = { ...apiData.accounts[0], id: 2, account_name: "测试客户B" };
    const account2Contact = { ...apiData.contacts[0], id: 23, account_id: 2, name: "王新客户" };
    const account2Opportunity = { ...apiData.opportunities[0], id: 11, account_id: 2, opportunity_name: "测试商机B" };
    const fetchMock = mockCrmFetch({ accounts: [apiData.accounts[0], account2] });
    const defaultFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input, init) => {
      const url = new URL(String(input), "http://localhost");
      const accountId = url.searchParams.get("account_id");
      if (url.pathname.endsWith("/api/contacts") && accountId === "1") {
        return account1Contacts.promise;
      }
      if (url.pathname.endsWith("/api/opportunities") && accountId === "1") {
        return account1Opportunities.promise;
      }
      if (url.pathname.endsWith("/api/contacts") && accountId === "2") {
        return account2Contacts.promise;
      }
      if (url.pathname.endsWith("/api/opportunities") && accountId === "2") {
        return account2Opportunities.promise;
      }
      return defaultFetch!(input, init);
    });
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);
    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户B");
    await user.click(screen.getAllByRole("button", { name: /查看经营/ })[0]);

    await act(async () => {
      account1Contacts.resolve(jsonResponse({ code: "OK", data: [apiData.contacts[0]] }));
      await account1Contacts.promise;
    });
    expect(await screen.findByRole("link", { name: "查看联系人 张决策" })).toHaveAttribute(
      "href",
      "/contacts?account_id=1&contact_id=21"
    );

    await user.click(screen.getAllByRole("button", { name: /查看经营/ })[1]);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contacts?account_id=2", expect.anything());
      expect(fetchMock).toHaveBeenCalledWith("/api/opportunities?account_id=2", expect.anything());
    });
    expect(screen.queryByRole("link", { name: "查看联系人 张决策" })).not.toBeInTheDocument();

    await act(async () => {
      account2Contacts.resolve(jsonResponse({ code: "OK", data: [account2Contact] }));
      account2Opportunities.resolve(jsonResponse({ code: "OK", data: [account2Opportunity] }));
      await Promise.all([account2Contacts.promise, account2Opportunities.promise]);
    });
    expect(await screen.findByRole("link", { name: "查看联系人 王新客户" })).toHaveAttribute(
      "href",
      "/contacts?account_id=2&contact_id=23"
    );
    expect(await screen.findByRole("link", { name: "查看商机 测试商机B" })).toHaveAttribute(
      "href",
      "/opportunities?account_id=2&opportunity_id=11"
    );

    await act(async () => {
      account1Opportunities.resolve(jsonResponse({ code: "OK", data: [apiData.opportunities[0]] }));
      await account1Opportunities.promise;
    });
    expect(screen.queryByRole("link", { name: "查看商机 测试商机A" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看商机 测试商机B" })).toBeInTheDocument();
  });

  it("keeps opportunities usable when related contacts fail", async () => {
    mockCrmFetch({}, { failPaths: ["/api/contacts"] });
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);
    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.click(screen.getByRole("button", { name: /查看经营/ }));

    const relatedRecords = await screen.findByRole("region", { name: "客户关联记录" });
    const contactPanel = within(relatedRecords).getByRole("heading", { name: "关联联系人" }).closest("section")!;
    const contactAlert = await within(contactPanel).findByRole("alert");
    expect(within(contactAlert).getByText("关联联系人加载失败")).toBeInTheDocument();
    expect(within(contactAlert).getByText("/api/contacts 加载失败")).toBeInTheDocument();
    expect(within(contactPanel).getByText("暂无关联联系人")).toBeInTheDocument();

    expect(await within(relatedRecords).findByRole("link", { name: "查看商机 测试商机A" })).toHaveAttribute(
      "href",
      "/opportunities?account_id=1&opportunity_id=10"
    );
    const opportunityPanel = within(relatedRecords).getByRole("heading", { name: "关联商机" }).closest("section")!;
    expect(within(opportunityPanel).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the customer V2 business snapshot with scoped links", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.click(screen.getByRole("button", { name: /查看经营/ }));

    expect(await screen.findByRole("heading", { name: "V2 业务闭环" })).toBeInTheDocument();
    expect(screen.getByText("合同金额")).toBeInTheDocument();
    expect(screen.getByText("待核销发票")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看方案标书" })).toHaveAttribute("href", "/solutions?account_id=1");
    expect(screen.getByRole("link", { name: "查看合同" })).toHaveAttribute("href", "/contracts?account_id=1");
    expect(screen.getByRole("link", { name: "查看开票" })).toHaveAttribute("href", "/invoices?account_id=1");
    expect(screen.getByRole("link", { name: "查看回款" })).toHaveAttribute("href", "/receivables?account_id=1");
    expect(screen.getByRole("link", { name: "查看核销" })).toHaveAttribute("href", "/reconciliations?account_id=1");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/solutions?account_id=1"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/contracts?account_id=1"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/invoices?account_id=1"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/receivable-plans?account_id=1"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/reconciliations/workbench?account_id=1"), expect.anything());
    });
  });

  it("updates an account from the customer list page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "客户池" }));
    await screen.findByText("测试客户A");
    await user.click(screen.getByRole("button", { name: /编\s*辑/ }));
    await user.type(screen.getByLabelText("备注"), "重点推进");
    await user.click(screen.getByRole("button", { name: /保存\s*修改/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/accounts/1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("重点推进")
        })
      );
    });
  });

  it("shows a grouped relationship view for contacts", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "联系人" }));

    expect(await screen.findByText("关键关系判断")).toBeInTheDocument();
    expect(screen.getByText("项目角色覆盖")).toBeInTheDocument();
    expect(screen.getByText("态度判断")).toBeInTheDocument();
    expect(screen.getAllByText("关系热度").length).toBeGreaterThan(0);
    expect(screen.getAllByText("决策人").length).toBeGreaterThan(0);
    expect(screen.getAllByText("预算推动人").length).toBeGreaterThan(0);
    expect(screen.getAllByText("支持者").length).toBeGreaterThan(1);
    expect(screen.getAllByText("张决策").length).toBeGreaterThan(1);
  });

  it("shows the contact relationship operation entry from the contact list", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "联系人" }));
    await screen.findByRole("button", { name: "张决策" });
    await user.click(screen.getByRole("button", { name: "张决策" }));

    expect(await screen.findByRole("heading", { name: "联系人经营入口" })).toBeInTheDocument();
    expect(screen.getByText("关系判断")).toBeInTheDocument();
    expect(screen.getAllByText("测试客户A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("决策人").length).toBeGreaterThan(0);
    expect(screen.getAllByText("支持者").length).toBeGreaterThan(0);
    expect(screen.getAllByText("可信赖").length).toBeGreaterThan(0);
    expect(screen.getAllByText("预算推动人").length).toBeGreaterThan(0);
    expect(screen.getByText("完成高层访谈，确认项目预算窗口")).toBeInTheDocument();
    expect(screen.getByText("跟进预算确认和试点范围")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看客户" })).toHaveAttribute("href", "/accounts");
    expect(screen.getByRole("link", { name: "推进商机" })).toHaveAttribute("href", "/opportunities");
    expect(screen.getByRole("link", { name: "记录销售行动" })).toHaveAttribute("href", "/activities");
  });

  it("shows the opportunity progress operation entry from the opportunity list", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "商机" }));
    await screen.findByRole("button", { name: "测试商机A" });
    await user.click(screen.getByRole("button", { name: "测试商机A" }));

    expect(await screen.findByRole("heading", { name: "商机推进入口" })).toBeInTheDocument();
    expect(screen.getByText("推进判断")).toBeInTheDocument();
    expect(screen.getAllByText("测试客户A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("商业线索").length).toBeGreaterThan(0);
    expect(screen.getAllByText("跟进中").length).toBeGreaterThan(0);
    expect(screen.getAllByText("正常").length).toBeGreaterThan(0);
    expect(screen.getByText("已完成需求确认，进入试点方案细化。")).toBeInTheDocument();
    expect(screen.getByText("提交V1试点方案和实施排期。")).toBeInTheDocument();
    expect(screen.getAllByText("完成CRM V1试点需求确认会").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "查看客户" })).toHaveAttribute("href", "/accounts");
    expect(screen.getByRole("link", { name: "经营联系人" })).toHaveAttribute("href", "/contacts");
    expect(screen.getByRole("link", { name: "记录销售行动" })).toHaveAttribute("href", "/activities");
    expect(screen.getByRole("link", { name: "查看周进展" })).toHaveAttribute("href", "/weekly-progress");
  });

  it("shows the opportunity V2 execution snapshot with account and opportunity scoped links", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "商机" }));
    await screen.findByRole("button", { name: "测试商机A" });
    await user.click(screen.getByRole("button", { name: "测试商机A" }));

    expect(await screen.findByRole("heading", { name: "成交执行闭环" })).toBeInTheDocument();
    expect(screen.getByText("报价合计")).toBeInTheDocument();
    expect(screen.getByText("已确认回款")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看方案标书" })).toHaveAttribute(
      "href",
      "/solutions?account_id=1&opportunity_id=10"
    );
    expect(screen.getByRole("link", { name: "查看合同" })).toHaveAttribute(
      "href",
      "/contracts?account_id=1&opportunity_id=10"
    );
    expect(screen.getByRole("link", { name: "查看开票" })).toHaveAttribute(
      "href",
      "/invoices?account_id=1&opportunity_id=10"
    );
    expect(screen.getByRole("link", { name: "查看回款" })).toHaveAttribute(
      "href",
      "/receivables?account_id=1&opportunity_id=10"
    );
    expect(screen.getByRole("link", { name: "查看核销" })).toHaveAttribute(
      "href",
      "/reconciliations?account_id=1&opportunity_id=10"
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/solutions?account_id=1&opportunity_id=10"),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/contracts?account_id=1&opportunity_id=10"),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/invoices?account_id=1&opportunity_id=10"),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/receivable-plans?account_id=1&opportunity_id=10"),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/reconciliations/workbench?account_id=1&opportunity_id=10"),
        expect.anything()
      );
    });
  });

  it("renders the solution document module and loads the V2 solution list", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "方案标书" }));

    expect(await screen.findByRole("heading", { name: "方案标书" })).toBeInTheDocument();
    expect(screen.getByText("V2试点技术方案")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建方案" })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/solutions"), expect.anything());
    });
  });

  it("opens the solution detail drawer with quotation attachments", async () => {
    mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "方案标书" }));
    await screen.findByRole("button", { name: "V2试点技术方案" });
    await user.click(screen.getByRole("button", { name: "V2试点技术方案" }));

    expect(await screen.findByText("方案详情")).toBeInTheDocument();
    expect(screen.getAllByText("报价").length).toBeGreaterThan(0);
    expect(screen.getByText("V2报价清单.xlsx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加附件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上传附件" })).toBeInTheDocument();
    expect(screen.getByText("选择文件")).toBeInTheDocument();
  });

  it("renders the contract module and loads the V2 contract list", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "合同" }));

    expect(await screen.findByRole("heading", { name: "合同" })).toBeInTheDocument();
    expect(screen.getByText("V2试点项目合同")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建合同" })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/contracts"), expect.anything());
    });
  });

  it("uses URL query parameters as initial V2 list filters", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();
    window.history.pushState({}, "", "/contracts?account_id=1&opportunity_id=10");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "合同" })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/contracts?account_id=1&opportunity_id=10"),
        expect.anything()
      );
    });
  });

  it("opens the contract execution drawer with changes milestones and attachments", async () => {
    mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "合同" }));
    await screen.findByRole("button", { name: "V2试点项目合同" });
    await user.click(screen.getByRole("button", { name: "V2试点项目合同" }));

    expect(await screen.findByRole("heading", { name: "合同执行台" })).toBeInTheDocument();
    expect(screen.getAllByText("CRM-V2-20260629").length).toBeGreaterThan(0);
    expect(screen.getByText("客户增加实施范围")).toBeInTheDocument();
    expect(screen.getByText("项目启动会")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加附件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增节点" })).toBeInTheDocument();
  });

  it("renders the invoice module and loads the V2 invoice list", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "开票管理" }));

    expect(await screen.findByRole("heading", { name: "开票管理" })).toBeInTheDocument();
    expect(screen.getByText("V2 UAT 首期开票")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建计划" })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/invoices"), expect.anything());
    });
  });

  it("opens the invoice detail drawer with amount summary and attachments", async () => {
    mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "开票管理" }));
    await screen.findByRole("button", { name: "V2 UAT 首期开票" });
    await user.click(screen.getByRole("button", { name: "V2 UAT 首期开票" }));

    expect(await screen.findByText("开票详情")).toBeInTheDocument();
    expect(screen.getByText("合同额度")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交申请" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登记发票" })).toBeInTheDocument();
    expect(screen.getByText("发票扫描件.pdf")).toBeInTheDocument();
    expect(screen.getByText("选择文件")).toBeInTheDocument();
    expect(screen.queryByText("附件地址")).not.toBeInTheDocument();
  });

  it("renders the receivable module and loads the V2 receivable list", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "回款管理" }));

    expect(await screen.findByRole("heading", { name: "回款管理" })).toBeInTheDocument();
    expect(screen.getByText("V2 UAT 首付款回款")).toBeInTheDocument();
    expect(screen.getByText("已收 ¥120,000.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建计划" })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/receivable-plans"), expect.anything());
    });
  });

  it("opens the receivable detail drawer with payments follow-ups and attachments", async () => {
    mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "回款管理" }));
    await screen.findByRole("button", { name: "V2 UAT 首付款回款" });
    await user.click(screen.getByRole("button", { name: "V2 UAT 首付款回款" }));

    expect(await screen.findByRole("heading", { name: "回款详情" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "到账流水" })).toBeInTheDocument();
    expect(screen.getByText("首付款到账")).toBeInTheDocument();
    expect(screen.getByText("客户财务流程已提交")).toBeInTheDocument();
    expect(screen.getByText("银行回单.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登记到账" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加附件" })).toBeInTheDocument();
  });

  it("renders the reconciliation workbench with pending invoices and payments", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "核销工作台" }));

    expect(await screen.findByRole("heading", { name: "核销工作台" })).toBeInTheDocument();
    expect(screen.getByText("待核销发票")).toBeInTheDocument();
    expect(screen.getByText("待分配回款")).toBeInTheDocument();
    expect(screen.getByText("V2 UAT 首期开票")).toBeInTheDocument();
    expect(screen.getByText("首付款到账")).toBeInTheDocument();
    expect(screen.getByText("待核销发票金额")).toBeInTheDocument();
    expect(screen.getByText("待分配回款金额")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/reconciliations/workbench"), expect.anything());
    });
  });

  it("creates a reconciliation from selected invoice and payment", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "核销工作台" }));
    await screen.findByText("V2 UAT 首期开票");

    await user.click(screen.getByRole("radio", { name: /V2 UAT 首期开票/ }));
    await user.click(screen.getByRole("radio", { name: /首付款到账/ }));
    await user.clear(screen.getByLabelText("本次核销金额"));
    await user.type(screen.getByLabelText("本次核销金额"), "120000");
    await user.type(screen.getByLabelText("核销备注"), "首付款核销");
    await user.click(screen.getByRole("button", { name: "确认核销" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/reconciliations"),
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => {
      expect(screen.getByText("REC-902")).toBeInTheDocument();
    });
  });

  it("shows the sales activity execution entry from the activity list", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "销售行动" }));
    await screen.findByRole("button", { name: "完成CRM V1试点需求确认会" });
    expect(screen.getByText("张决策 / CIO")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "完成CRM V1试点需求确认会" }));

    expect(await screen.findByRole("heading", { name: "行动执行入口" })).toBeInTheDocument();
    expect(screen.getByText("执行判断")).toBeInTheDocument();
    expect(screen.getAllByText("测试客户A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("测试商机A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);
    expect(screen.getAllByText("会议沟通").length).toBeGreaterThan(0);
    expect(screen.getAllByText("拜访对象").length).toBeGreaterThan(0);
    expect(screen.getAllByText("张决策 / CIO").length).toBeGreaterThan(0);
    expect(screen.getByText("围绕CRM V1试点目标、角色权限、客户档案和商机推进节奏完成确认。")).toBeInTheDocument();
    expect(screen.getByText("客户希望先以重点客户团队试点，验证周进展和提醒机制。")).toBeInTheDocument();
    expect(screen.getByText("双方确认进入试点方案细化阶段。")).toBeInTheDocument();
    expect(screen.getByText("三日内提交试点方案和演示账号。")).toBeInTheDocument();
    expect(screen.getByText("需在方案中明确历史数据导入范围。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看客户" })).toHaveAttribute("href", "/accounts");
    expect(screen.getByRole("link", { name: "推进商机" })).toHaveAttribute("href", "/opportunities");
    expect(screen.getByRole("link", { name: "查看周进展" })).toHaveAttribute("href", "/weekly-progress");

    await user.click(screen.getByRole("button", { name: "新建行动" }));
    expect(await screen.findByLabelText("拜访对象")).toBeInTheDocument();
  });

  it("filters weekly progress by owner and natural week", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "周进展" }));
    expect(await screen.findByText("2026-06-15 至 2026-06-21")).toBeInTheDocument();
    await user.type(screen.getByLabelText("负责人ID"), "1001");
    await user.type(screen.getByLabelText("周开始"), "2026-06-15");
    await user.type(screen.getByLabelText("周结束"), "2026-06-21");
    await user.click(screen.getByRole("button", { name: /筛\s*选/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/weekly-progress/opportunities?"),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("owner_user_id=1001"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("week_start=2026-06-15"), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("week_end=2026-06-21"), expect.anything());
    });
  });

  it("shows the weekly progress review entry from the weekly progress list", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "周进展" }));
    await screen.findByRole("button", { name: "测试商机A" });
    await user.click(screen.getByRole("button", { name: "测试商机A" }));

    expect(await screen.findByRole("heading", { name: "周进展复盘入口" })).toBeInTheDocument();
    expect(screen.getByText("复盘摘要")).toBeInTheDocument();
    expect(screen.getAllByText("测试客户A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("测试商机A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026-06-15 至 2026-06-21").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 次行动").length).toBeGreaterThan(0);
    expect(screen.getByText("完成CRM V1试点需求确认会")).toBeInTheDocument();
    expect(screen.getByText("双方确认进入试点方案细化阶段。")).toBeInTheDocument();
    expect(screen.getByText("三日内提交试点方案和演示账号。")).toBeInTheDocument();
    expect(screen.getByText("需在方案中明确历史数据导入范围。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看客户" })).toHaveAttribute("href", "/accounts");
    expect(screen.getByRole("link", { name: "推进商机" })).toHaveAttribute("href", "/opportunities");
    expect(screen.getByRole("link", { name: "查看销售行动" })).toHaveAttribute("href", "/activities");
  });

  it("shows business guidance and Chinese empty state on empty business lists", async () => {
    const user = userEvent.setup();
    mockCrmFetch({ activities: [] });

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "销售行动" }));

    expect(await screen.findByRole("heading", { name: "销售行动" })).toBeInTheDocument();
    expect(screen.getByText("当前页面怎么用")).toBeInTheDocument();
    expect(screen.getByText("先看计划、逾期和风险行动；进入行动执行入口确认沟通内容、客户反馈、结论和下一步计划。")).toBeInTheDocument();
    expect(screen.getByText("暂无销售行动")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建行动" })).toBeInTheDocument();
  });

  it("changes the current user's password", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("button", { name: "修改密码" }));
    await user.type(screen.getByLabelText("原密码"), "Old!23456");
    await user.type(screen.getByLabelText("新密码"), "New!23456");
    await user.type(screen.getByLabelText("确认新密码"), "New!23456");
    await user.click(screen.getByRole("button", { name: "保存密码" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/change-password",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ old_password: "Old!23456", new_password: "New!23456" })
        })
      );
    });
  });

  it("creates a dictionary type from dictionary management", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "字典管理" }));
    expect(await screen.findByRole("heading", { name: "字典管理" })).toBeInTheDocument();
    expect(await screen.findByText("客户等级 (account_level)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "新建字典" }));
    await user.type(screen.getByLabelText("字典编码"), "risk_level");
    await user.type(screen.getByLabelText("字典名称"), "风险等级");
    await user.click(screen.getByRole("button", { name: "保存字典" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/dicts/types",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("risk_level")
        })
      );
    });
  });

  it("renders system as one top-level menu with professional child modules", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    expect(screen.getByRole("menuitem", { name: "系统" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /系统管理/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "系统概览" }));
    expect(await screen.findByRole("heading", { name: "系统概览" })).toBeInTheDocument();

    expect(screen.getAllByRole("link", { name: "组织管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "用户管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "角色权限" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "审计日志" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "字典管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "AI配置" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "审批配置" }).length).toBeGreaterThan(0);
  });

  it("routes approval center and approval configuration as independent work pages", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "审批中心" }));
    expect(await screen.findByRole("heading", { name: "审批中心" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "待我审批" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "我发起的" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "已处理" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "审批配置" })[0]);
    expect(await screen.findByRole("heading", { name: "审批配置" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/approval-templates", expect.anything());
  });

  it("shows approval configuration without exposing system overview to a config-only user", async () => {
    const user = userEvent.setup();
    mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: ["approval.config.manage"]
      }
    });

    render(<App />);
    await loginThroughUi(user);

    expect(screen.getByRole("menuitem", { name: "系统" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "审批配置" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "系统概览" })).not.toBeInTheDocument();
  });

  it("redirects direct approval routes when the required permission is missing", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: ["account.read"]
      }
    });
    window.history.pushState({}, "", "/approvals");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/approvals/tasks"), expect.anything());

    act(() => {
      window.history.pushState({}, "", "/system/approval-templates");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/approval-templates", expect.anything());
  });

  it("redirects a direct system user route before protected content loads", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: ["account.read"]
      }
    });
    window.history.pushState({}, "", "/system/users");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "用户管理" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/system/users", expect.anything());
  });

  it("keeps the fallback workbench quiet for a user with only account read permission", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: ["account.read"]
      }
    });
    window.history.pushState({}, "", "/system/users");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/reminders"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/opportunities"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/activities"), expect.anything());
  });

  it("redirects a direct business route before its protected content loads", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: ["account.read"]
      }
    });
    window.history.pushState({}, "", "/contacts");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "联系人" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/contacts"), expect.anything());
  });

  it.each([
    { path: "/contacts", permission: "contact.read", heading: "联系人", target: "/api/contacts", denied: ["/api/accounts"] },
    { path: "/opportunities", permission: "opportunity.read", heading: "商机", target: "/api/opportunities", denied: ["/api/accounts"] },
    { path: "/solutions", permission: "solution.read", heading: "方案标书", target: "/api/solutions", denied: ["/api/accounts", "/api/opportunities"] },
    { path: "/contracts", permission: "contract.read", heading: "合同", target: "/api/contracts", denied: ["/api/accounts", "/api/opportunities"] },
    { path: "/invoices", permission: "invoice.read", heading: "开票管理", target: "/api/invoices", denied: ["/api/accounts", "/api/opportunities", "/api/contracts"] },
    { path: "/receivables", permission: "receivable.read", heading: "回款管理", target: "/api/receivable-plans", denied: ["/api/accounts", "/api/contracts"] },
    { path: "/payments", permission: "payment.read", heading: "到账流水", target: "/api/payments", denied: ["/api/accounts", "/api/contracts", "/api/receivable-plans"] },
    { path: "/reconciliations", permission: "reconciliation.read", heading: "核销工作台", target: "/api/reconciliations", denied: ["/api/accounts", "/api/contracts"] },
    { path: "/activities", permission: "activity.read", heading: "销售行动", target: "/api/activities", denied: ["/api/accounts", "/api/contacts", "/api/opportunities"] },
    { path: "/weekly-progress", permission: "weekly_progress.read", heading: "周进展", target: "/api/weekly-progress/opportunities", denied: ["/api/accounts", "/api/opportunities"] },
    { path: "/ai-assistant/opportunities", permission: "ai.opportunity.analyze", heading: "AI商机分析", target: "/api/ai-opportunity-analyses", denied: ["/api/opportunities"] },
    { path: "/ai-assistant/visit-plans", permission: "ai.visit.plan", heading: "AI拜访计划", target: "/api/ai-visit-plans", denied: ["/api/opportunities"] },
    { path: "/ai-assistant/communication", permission: "ai.communication.recommend", heading: "AI沟通建议", target: "/api/ai-communication-recommendations", denied: ["/api/opportunities", "/api/contacts"] }
  ])("loads $path without cross-module requests for its minimum permission", async ({ path, permission, heading, target, denied }) => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: [permission]
      }
    });
    window.history.pushState({}, "", path);

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    const requestedPaths = fetchMock.mock.calls.map(([url]) => new URL(String(url), "http://localhost").pathname);
    expect(requestedPaths).toContain(target);
    denied.forEach((endpoint) => expect(requestedPaths).not.toContain(endpoint));
  });

  it.each([
    {
      path: "/contracts?contract_id=301",
      permission: "contract.read",
      heading: "合同",
      required: ["/api/contracts/301", "/api/contracts/301/changes", "/api/contracts/301/milestones"],
      denied: ["/api/attachments"]
    },
    {
      path: "/invoices?invoice_id=401",
      permission: "invoice.read",
      heading: "开票管理",
      required: ["/api/invoices/401"],
      denied: ["/api/attachments"]
    },
    {
      path: "/receivables?receivable_plan_id=601",
      permission: "receivable.read",
      heading: "回款管理",
      required: ["/api/receivable-plans/601", "/api/receivable-plans/601/follow-ups"],
      denied: ["/api/payments", "/api/attachments"]
    }
  ])("opens $path without unauthorized detail requests", async ({ path, permission, heading, required, denied }) => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({ user: { ...apiData.user, permissions: [permission] } });
    window.history.pushState({}, "", path);

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    await waitFor(() => {
      const requestedPaths = fetchMock.mock.calls.map(([url]) => new URL(String(url), "http://localhost").pathname);
      required.forEach((endpoint) => expect(requestedPaths).toContain(endpoint));
      denied.forEach((endpoint) => expect(requestedPaths).not.toContain(endpoint));
    });
  });

  it("does not request solution attachments without attachment read permission", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({ user: { ...apiData.user, permissions: ["solution.read"] } });
    window.history.pushState({}, "", "/solutions");

    render(<App />);
    await loginThroughUi(user);
    await user.click(await screen.findByRole("button", { name: apiData.solutions[0].document_name }));

    await screen.findByText("方案详情");
    const requestedPaths = fetchMock.mock.calls.map(([url]) => new URL(String(url), "http://localhost").pathname);
    expect(requestedPaths).not.toContain("/api/attachments");
  });

  it.each([
    { path: "/ai-assistant/opportunities", permission: "ai.opportunity.analyze", heading: "AI商机分析", button: "生成商机分析" },
    { path: "/ai-assistant/visit-plans", permission: "ai.visit.plan", heading: "AI拜访计划", button: "生成拜访计划" },
    { path: "/ai-assistant/communication", permission: "ai.communication.recommend", heading: "AI沟通建议", button: "生成沟通建议" }
  ])("hides unavailable AI generation controls on $path", async ({ path, permission, heading, button }) => {
    const user = userEvent.setup();
    mockCrmFetch({ user: { ...apiData.user, permissions: [permission] } });
    window.history.pushState({}, "", path);

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: button })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/activities"]')).not.toBeInTheDocument();
  });

  it("links the dashboard parent to the first permitted child page", async () => {
    const user = userEvent.setup();
    mockCrmFetch({ user: { ...apiData.user, permissions: ["dashboard.funnel.read"] } });
    window.history.pushState({}, "", "/");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("link", { name: "驾驶舱" })).toHaveAttribute("href", "/dashboard/funnel");
  });

  it("hides the weekly progress link without weekly progress read permission", async () => {
    const user = userEvent.setup();
    mockCrmFetch({
      user: { ...apiData.user, permissions: ["ai.weekly.manage"] },
      aiWeeklyReports: [{ ...apiData.aiWeeklyReports[0], status: "confirmed" }]
    });
    window.history.pushState({}, "", "/ai-assistant/weekly-report");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI周报" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "查看周进展" })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/activities"]')).not.toBeInTheDocument();
  });

  it("hides the written activity link without activity read permission", async () => {
    const user = userEvent.setup();
    mockCrmFetch({
      user: { ...apiData.user, permissions: ["ai.opportunity.analyze"] },
      aiOpportunityAnalyses: [{ ...apiData.aiOpportunityAnalyses[0], status: "confirmed", write_activity_id: 88 }]
    });
    window.history.pushState({}, "", "/ai-assistant/opportunities");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI商机分析" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "查看写入行动" })).not.toBeInTheDocument();
  });

  it("loads only the permitted AI workbench resources", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: ["ai.context.read"]
      }
    });
    window.history.pushState({}, "", "/ai-assistant");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "AI销售作战助手" })).toBeInTheDocument();
    [
      "/api/ai-drafts",
      "/api/ai-weekly-reports",
      "/api/ai-opportunity-analyses",
      "/api/ai-visit-plans",
      "/api/ai-communication-recommendations"
    ].forEach((endpoint) => {
      const requestedPaths = fetchMock.mock.calls.map(([url]) => new URL(String(url), "http://localhost").pathname);
      expect(requestedPaths).not.toContain(endpoint);
    });
    expect(screen.queryByRole("button", { name: "生成草稿" })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/accounts"]')).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/opportunities"]')).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/activities"]')).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/receivables"]')).not.toBeInTheDocument();
  });

  it.each([
    {
      path: "/system/departments",
      permission: "system.user.manage",
      heading: "组织管理",
      allowedEndpoints: ["/api/system/departments"]
    },
    {
      path: "/system/users",
      permission: "system.user.manage",
      heading: "用户管理",
      allowedEndpoints: ["/api/system/users", "/api/system/departments"]
    },
    {
      path: "/system/roles",
      permission: "system.role.manage",
      heading: "角色权限",
      allowedEndpoints: ["/api/system/roles", "/api/system/permissions"]
    },
    {
      path: "/system/audit-logs",
      permission: "system.audit.read",
      heading: "审计日志",
      allowedEndpoints: ["/api/system/audit-logs"]
    },
    {
      path: "/system/dictionaries",
      permission: "system.dict.manage",
      heading: "字典管理",
      allowedEndpoints: ["/api/system/dicts"]
    },
    {
      path: "/system/ai-config",
      permission: "system.ai-config.manage",
      heading: "AI配置",
      allowedEndpoints: ["/api/system/ai-model-configs"]
    }
  ])("loads only authorized resources for $path with its minimum permission", async ({ path, permission, heading, allowedEndpoints }) => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: [permission]
      }
    });
    window.history.pushState({}, "", path);

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    await waitFor(() => {
      allowedEndpoints.forEach((endpoint) => {
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(endpoint), expect.anything());
      });
    });

    const systemEndpoints = [
      "/api/system/dicts",
      "/api/system/audit-logs",
      "/api/system/users",
      "/api/system/departments",
      "/api/system/roles",
      "/api/system/permissions",
      "/api/system/ai-model-configs"
    ];
    systemEndpoints
      .filter((endpoint) => !allowedEndpoints.includes(endpoint))
      .forEach((endpoint) => {
        expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining(endpoint), expect.anything());
      });
  });

  it("limits the system overview to resources allowed by its minimum permission", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch({
      user: {
        ...apiData.user,
        permissions: ["system.dict.manage"]
      }
    });
    window.history.pushState({}, "", "/system");

    render(<App />);
    await loginThroughUi(user);

    expect(await screen.findByRole("heading", { name: "系统概览" })).toBeInTheDocument();
    expect((await screen.findAllByRole("link", { name: "字典管理" })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "用户管理" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/system/dicts"), expect.anything());
    });
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/system/users"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/system/departments"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/system/roles"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/system/permissions"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/system/audit-logs"), expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/api/system/ai-model-configs"), expect.anything());
  });

  it("shows approval status inside a quotation detail drawer", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "方案标书" }));
    await user.click(await screen.findByRole("button", { name: "V2试点技术方案" }));

    expect(await screen.findByText("尚未提交审批")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交审批" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/approvals/object/quotation/91", expect.anything());
  });

  it("renders approval lifecycle solution statuses in Chinese", async () => {
    const user = userEvent.setup();
    mockCrmFetch({
      solutions: [
        { ...apiData.solutions[0], status: "approving" },
        { ...apiData.solutions[0], id: 92, document_name: "已审批方案", status: "approved" }
      ]
    });

    render(<App />);
    await loginThroughUi(user);
    await user.click(screen.getByRole("link", { name: "方案标书" }));

    expect(await screen.findByText("审批中")).toBeInTheDocument();
    expect(screen.getByText("已通过")).toBeInTheDocument();
    expect(screen.queryByText("approving")).not.toBeInTheDocument();
    expect(screen.queryByText("approved")).not.toBeInTheDocument();
  });

  it("renders OpenAI model configuration under system AI config", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getAllByRole("link", { name: "AI配置" })[0]);

    expect(await screen.findByRole("heading", { name: "AI配置" })).toBeInTheDocument();
    expect(screen.getByText("模型配置")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("gpt-4.1-mini")).toBeInTheDocument();
    expect(screen.getByText("sk-t...cdef")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "测试连接" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/ai-model-configs/9101/test"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("maintains dictionaries from an independent dictionary management page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统概览" }));
    expect(await screen.findByRole("heading", { name: "系统概览" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "字典管理" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("客户等级 (account_level)")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "字典管理" })[0]);
    expect(await screen.findByRole("heading", { name: "字典管理" })).toBeInTheDocument();
    expect(screen.getByText("客户等级 (account_level)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建字典" }));
    await user.type(screen.getByLabelText("字典编码"), "risk_level");
    await user.type(screen.getByLabelText("字典名称"), "风险等级");
    await user.click(screen.getByRole("button", { name: "保存字典" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/dicts/types",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("risk_level")
        })
      );
    });
  });

  it("renders system management as independent professional modules", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统概览" }));

    expect(await screen.findByRole("heading", { name: "系统概览" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "组织管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "用户管理" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "角色权限" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "审计日志" }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("link", { name: "组织管理" })[0]);
    expect(await screen.findByRole("heading", { name: "组织管理" })).toBeInTheDocument();
    expect(screen.getByText("华东销售部")).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "用户管理" })[0]);
    expect(await screen.findByRole("heading", { name: "用户管理" })).toBeInTheDocument();
    expect((await screen.findAllByText("销售一号")).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("link", { name: "角色权限" })[0]);
    expect(await screen.findByRole("heading", { name: "角色权限" })).toBeInTheDocument();
    expect((await screen.findAllByText("销售管理员")).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("link", { name: "审计日志" })[0]);
    expect(await screen.findByRole("heading", { name: "审计日志" })).toBeInTheDocument();
    expect(await screen.findByText("account.create")).toBeInTheDocument();
  });

  it("updates role permissions from the dedicated roles page", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统概览" }));
    await user.click(screen.getAllByRole("link", { name: "角色权限" })[0]);
    expect((await screen.findAllByText("销售管理员")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "授权" }));
    await user.click(await screen.findByLabelText("新建客户"));
    await user.click(screen.getByLabelText("查看审计日志"));
    await user.click(screen.getByRole("button", { name: "保存授权" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/roles/3001/permissions",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("system.audit.read")
        })
      );
    });
  });

  it("creates roles and shows user login account for authorized system admins", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getAllByRole("link", { name: "用户管理" })[0]);
    expect(await screen.findByText("sales")).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "角色权限" })[0]);
    await user.click(await screen.findByRole("button", { name: "新建角色" }));
    const roleDialog = latestDialog();
    await user.type(roleDialog.getByLabelText("角色编码"), "solution_reviewer");
    await user.type(roleDialog.getByLabelText("角色名称"), "方案评审员");
    await user.type(roleDialog.getByLabelText("角色说明"), "负责方案和报价评审");
    await user.click(roleDialog.getByRole("button", { name: "保存角色" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/roles",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("solution_reviewer")
        })
      );
    });
  });

  it("shows V2 system governance coverage on overview and role authorization", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统概览" }));

    expect(await screen.findByText("V2治理覆盖")).toBeInTheDocument();
    expect(screen.getByText("V2权限点")).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "角色权限" })[0]);
    await user.click(screen.getByRole("button", { name: "授权" }));

    expect(await screen.findByText("V2 合同")).toBeInTheDocument();
    expect(screen.getByLabelText("终止合同")).toBeInTheDocument();
    expect(screen.getByText("V2 开票")).toBeInTheDocument();
    expect(screen.getByLabelText("登记发票")).toBeInTheDocument();
    expect(screen.getByText("V2 核销")).toBeInTheDocument();
    expect(screen.getByLabelText("撤销核销")).toBeInTheDocument();
  });

  it("shows AI permissions in role authorization", async () => {
    const user = userEvent.setup();
    mockCrmFetch();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getAllByRole("link", { name: "角色权限" })[0]);
    await user.click(screen.getByRole("button", { name: "授权" }));

    expect(await screen.findByText("AI 助手")).toBeInTheDocument();
    expect(screen.getByLabelText("查看AI上下文")).toBeInTheDocument();
    expect(screen.getByLabelText("管理AI草稿")).toBeInTheDocument();
    expect(screen.getByLabelText("管理AI周报")).toBeInTheDocument();
    expect(screen.getByLabelText("分析AI商机")).toBeInTheDocument();
    expect(screen.getByLabelText("生成AI拜访计划")).toBeInTheDocument();
    expect(screen.getByLabelText("生成AI沟通建议")).toBeInTheDocument();
  });

  it("filters audit logs by V2 quick actions", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统概览" }));
    await user.click(screen.getAllByRole("link", { name: "审计日志" })[0]);
    await user.click(await screen.findByRole("button", { name: "核销审计" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/audit-logs?module_code=reconciliation"),
        expect.anything()
      );
    });
  });

  it("creates departments and maintains users from dedicated system pages", async () => {
    const fetchMock = mockCrmFetch();
    const user = userEvent.setup();

    render(<App />);
    await loginThroughUi(user);

    await user.click(screen.getByRole("link", { name: "系统概览" }));
    await user.click(screen.getAllByRole("link", { name: "组织管理" })[0]);
    expect(await screen.findByText("华东销售部")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新建组织" }));
    const departmentDialog = latestDialog();
    expect(departmentDialog.getByLabelText("上级组织")).toBeInTheDocument();
    expect(departmentDialog.queryByLabelText("上级组织ID")).not.toBeInTheDocument();
    await user.type(departmentDialog.getByLabelText("组织编码"), "sales-south");
    await user.type(departmentDialog.getByLabelText("组织名称"), "华南销售部");
    await user.type(departmentDialog.getByLabelText("区域编码"), "CN-44");
    await user.click(departmentDialog.getByRole("button", { name: "保存组织" }));

    await user.click(screen.getAllByRole("link", { name: "用户管理" })[0]);
    await user.click(screen.getByRole("button", { name: "新增用户" }));
    const userCreateDialog = latestDialog();
    expect(userCreateDialog.getByLabelText("所属部门")).toBeInTheDocument();
    expect(userCreateDialog.queryByLabelText("部门ID")).not.toBeInTheDocument();
    await user.type(userCreateDialog.getByLabelText("姓名"), "新增销售");
    await user.type(userCreateDialog.getByLabelText("邮箱"), "new-sales@example.com");
    await user.type(userCreateDialog.getByLabelText("登录账号"), "new_sales");
    await user.type(userCreateDialog.getByLabelText("初始密码"), "S3cure!123");
    await user.click(userCreateDialog.getByLabelText("销售管理员"));
    await user.click(userCreateDialog.getByRole("button", { name: "保存用户" }));

    await user.click(screen.getByRole("button", { name: "编辑用户" }));
    const userEditDialog = latestDialog();
    await user.clear(userEditDialog.getByLabelText("姓名"));
    await user.type(userEditDialog.getByLabelText("姓名"), "销售一号更新");
    await user.click(userEditDialog.getByLabelText("销售管理员"));
    await user.click(userEditDialog.getByRole("button", { name: "保存用户" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/departments",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("sales-south")
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/users",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("role_ids")
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/users/1001",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("role_ids")
        })
      );
    });
  });
});

function latestDialog() {
  const dialogs = screen.getAllByRole("dialog");
  const dialog = dialogs[dialogs.length - 1];
  return within(dialog);
}

async function loginThroughUi(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("用户名"), "sales");
  await user.type(screen.getByLabelText("密码"), "S3cure!123");
  await user.click(screen.getByRole("button", { name: /登\s*录/ }));
  await screen.findByRole("link", { name: "工作台" });
}

type MockCrmFetchOptions = { failPaths?: string[] };

function mockCrmFetch(overrides: Partial<typeof apiData> = {}, options: MockCrmFetchOptions = {}) {
  const data = { ...apiData, ...overrides };
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const path = url.split("?")[0];
    if (options.failPaths?.includes(path)) {
      throw new Error(`${path} 加载失败`);
    }
    const method = init?.method ?? "GET";
    if (path.endsWith("/api/auth/login")) {
      return jsonResponse({ code: "OK", data: { access_token: "token-001", token_type: "Bearer", user: data.user } });
    }
    if (path.endsWith("/api/auth/logout")) {
      return jsonResponse({ code: "OK", data: { logged_out: true } });
    }
    if (path.endsWith("/api/auth/me")) {
      return jsonResponse({ code: "OK", data: data.user });
    }
    if (path.endsWith("/api/auth/change-password")) {
      return jsonResponse({ code: "OK", data: { password_changed: true } });
    }
    if (path.endsWith("/api/auth/reset-password")) {
      return jsonResponse({ code: "OK", data: { force_password_change: true } });
    }
    if (path.endsWith("/api/dashboard/overview")) {
      return jsonResponse({ code: "OK", data: data.dashboardOverview });
    }
    if (path.endsWith("/api/dashboard/funnel")) {
      return jsonResponse({ code: "OK", data: data.dashboardFunnel });
    }
    if (path.endsWith("/api/dashboard/contracts")) {
      return jsonResponse({ code: "OK", data: data.dashboardContracts });
    }
    if (path.endsWith("/api/dashboard/invoices")) {
      return jsonResponse({ code: "OK", data: data.dashboardInvoices });
    }
    if (path.endsWith("/api/dashboard/receivables")) {
      return jsonResponse({ code: "OK", data: data.dashboardReceivables });
    }
    if (path.endsWith("/api/dashboard/risks")) {
      return jsonResponse({ code: "OK", data: data.dashboardRisks });
    }
    if (path.endsWith("/api/ai-drafts/parse") && method === "POST") {
      return jsonResponse({ code: "OK", data: { input_record_id: 9001, drafts: data.aiDrafts } });
    }
    if (path.endsWith("/api/ai-drafts/7001/confirm") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: { ...data.aiDrafts[0], status: "confirmed", write_object_type: "account", write_object_id: 2 }
      });
    }
    if (path.endsWith("/api/ai-drafts/7002/reject") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: { ...data.aiDrafts[1], status: "rejected", rejection_reason: "页面拒绝" }
      });
    }
    if (path.endsWith("/api/ai-drafts")) {
      return jsonResponse({ code: "OK", data: data.aiDrafts });
    }
    if (path.endsWith("/api/ai-weekly-reports/generate") && method === "POST") {
      return jsonResponse({ code: "OK", data: data.aiWeeklyReports[0] });
    }
    if (path.endsWith("/api/ai-weekly-reports/8101/confirm") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: { ...data.aiWeeklyReports[0], status: "confirmed", write_activity_ids: [8801], confirmed_at: "2026-07-06T18:00:00+08:00" }
      });
    }
    if (path.endsWith("/api/ai-weekly-reports/8101/reject") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: { ...data.aiWeeklyReports[0], status: "rejected", rejection_reason: "页面拒绝" }
      });
    }
    if (path.endsWith("/api/ai-weekly-reports")) {
      return jsonResponse({ code: "OK", data: data.aiWeeklyReports });
    }
    if (path.endsWith("/api/ai-opportunity-analyses/generate") && method === "POST") {
      return jsonResponse({ code: "OK", data: data.aiOpportunityAnalyses[0] });
    }
    if (path.endsWith("/api/ai-opportunity-analyses/8201/confirm") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: {
          ...data.aiOpportunityAnalyses[0],
          status: "confirmed",
          write_activity_id: 8802,
          confirmed_at: "2026-07-07T10:00:00+08:00"
        }
      });
    }
    if (path.endsWith("/api/ai-opportunity-analyses/8201/reject") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: { ...data.aiOpportunityAnalyses[0], status: "rejected", rejection_reason: "页面拒绝" }
      });
    }
    if (path.endsWith("/api/ai-opportunity-analyses")) {
      return jsonResponse({ code: "OK", data: data.aiOpportunityAnalyses });
    }
    if (path.endsWith("/api/ai-visit-plans/generate") && method === "POST") {
      return jsonResponse({ code: "OK", data: data.aiVisitPlans[0] });
    }
    if (path.endsWith("/api/ai-visit-plans/8301/confirm") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: {
          ...data.aiVisitPlans[0],
          status: "confirmed",
          write_activity_id: 8803,
          confirmed_at: "2026-07-07T11:00:00+08:00"
        }
      });
    }
    if (path.endsWith("/api/ai-visit-plans/8301/reject") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: { ...data.aiVisitPlans[0], status: "rejected", rejection_reason: "页面拒绝" }
      });
    }
    if (path.endsWith("/api/ai-visit-plans")) {
      return jsonResponse({ code: "OK", data: data.aiVisitPlans });
    }
    if (path.endsWith("/api/ai-communication-recommendations/generate") && method === "POST") {
      return jsonResponse({ code: "OK", data: data.aiCommunicationRecommendations[0] });
    }
    if (path.endsWith("/api/ai-communication-recommendations/8401/confirm") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: {
          ...data.aiCommunicationRecommendations[0],
          status: "confirmed",
          write_activity_id: 8804,
          confirmed_at: "2026-07-07T12:00:00+08:00"
        }
      });
    }
    if (path.endsWith("/api/ai-communication-recommendations/8401/reject") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: { ...data.aiCommunicationRecommendations[0], status: "rejected", rejection_reason: "页面拒绝" }
      });
    }
    if (path.endsWith("/api/ai-communication-recommendations")) {
      return jsonResponse({ code: "OK", data: data.aiCommunicationRecommendations });
    }
    if (path.endsWith("/api/ai-logs")) {
      return jsonResponse({ code: "OK", data: data.aiLogs });
    }
    if (path.endsWith("/api/ai-context/summary")) {
      return jsonResponse({ code: "OK", data: data.aiContextSummary });
    }
    if (path.endsWith("/api/accounts/1") && method === "PATCH") {
      return jsonResponse({ code: "OK", data: { ...data.accounts[0], remark: "重点推进" } });
    }
    if (path.endsWith("/api/accounts") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.accounts[0], id: 2, account_name: "新增客户B" } });
    }
    if (path.endsWith("/api/accounts")) {
      return jsonResponse({ code: "OK", data: data.accounts });
    }
    if (path.endsWith("/api/contacts/21")) {
      return jsonResponse({ code: "OK", data: data.contacts[0] });
    }
    if (path.endsWith("/api/contacts/22")) {
      return jsonResponse({ code: "OK", data: data.contacts[1] });
    }
    if (path.endsWith("/api/contacts")) {
      return jsonResponse({ code: "OK", data: data.contacts });
    }
    if (path.endsWith("/api/opportunities/10")) {
      return jsonResponse({ code: "OK", data: data.opportunities[0] });
    }
    if (path.endsWith("/api/opportunities")) {
      return jsonResponse({ code: "OK", data: data.opportunities });
    }
    if (path.endsWith("/api/solutions")) {
      return jsonResponse({ code: "OK", data: data.solutions });
    }
    if (path.endsWith("/api/contracts/301/changes")) {
      return jsonResponse({ code: "OK", data: data.contractChanges });
    }
    if (path.endsWith("/api/contracts/301/milestones")) {
      return jsonResponse({ code: "OK", data: data.contractMilestones });
    }
    if (path.endsWith("/api/contracts/301")) {
      return jsonResponse({ code: "OK", data: data.contracts[0] });
    }
    if (path.endsWith("/api/contracts")) {
      return jsonResponse({ code: "OK", data: data.contracts });
    }
    if (path.endsWith("/api/invoices/401")) {
      return jsonResponse({ code: "OK", data: data.invoices[0] });
    }
    if (path.endsWith("/api/invoices/401/apply") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.invoices[0], invoice_status: "applied" } });
    }
    if (path.endsWith("/api/invoices/401/issue") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.invoices[0], invoice_status: "invoiced" } });
    }
    if (path.endsWith("/api/invoices/401/sign") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.invoices[0], invoice_status: "signed" } });
    }
    if (path.endsWith("/api/invoices/401/exception") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.invoices[0], invoice_status: "exception" } });
    }
    if (path.endsWith("/api/invoices/401/void") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.invoices[0], invoice_status: "voided" } });
    }
    if (path.endsWith("/api/invoices")) {
      return jsonResponse({ code: "OK", data: data.invoices });
    }
    if (path.endsWith("/api/receivable-plans/601/follow-ups")) {
      return jsonResponse({ code: "OK", data: data.receivableFollowUps });
    }
    if (path.endsWith("/api/receivable-plans/601")) {
      return jsonResponse({ code: "OK", data: data.receivablePlans[0] });
    }
    if (path.endsWith("/api/receivable-plans")) {
      return jsonResponse({ code: "OK", data: data.receivablePlans });
    }
    if (path.endsWith("/api/payments/701/confirm") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.payments[0], payment_status: "confirmed" } });
    }
    if (path.endsWith("/api/payments/701/exception") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.payments[0], payment_status: "exception" } });
    }
    if (path.endsWith("/api/payments/701/refund") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.payments[0], payment_status: "refunded", confirmed_amount: 0 } });
    }
    if (path.endsWith("/api/payments")) {
      return jsonResponse({ code: "OK", data: data.payments });
    }
    if (path.endsWith("/api/reconciliations/workbench")) {
      return jsonResponse({ code: "OK", data: data.reconciliationWorkbench });
    }
    if (path.endsWith("/api/reconciliations") && method === "POST") {
      const mutableWorkbench = data.reconciliationWorkbench as Omit<typeof data.reconciliationWorkbench, "recent_reconciliations"> & {
        recent_reconciliations: typeof data.reconciliations;
      };
      mutableWorkbench.recent_reconciliations = data.reconciliations;
      data.reconciliationWorkbench.pending_payments = [];
      return jsonResponse({ code: "OK", data: data.reconciliations[0] });
    }
    if (path.endsWith("/api/reconciliations")) {
      return jsonResponse({ code: "OK", data: data.reconciliations });
    }
    if (path.includes("/api/attachments")) {
      if (url.includes("object_type=solution_document")) {
        return jsonResponse({ code: "OK", data: data.solutionAttachments });
      }
      if (url.includes("object_type=receivable_plan")) {
        return jsonResponse({ code: "OK", data: data.receivableAttachments });
      }
      if (url.includes("object_type=invoice")) {
        return jsonResponse({ code: "OK", data: data.invoiceAttachments });
      }
      return jsonResponse({ code: "OK", data: [] });
    }
    if (path.endsWith("/api/activities")) {
      return jsonResponse({ code: "OK", data: data.activities });
    }
    if (path.endsWith("/api/reminders")) {
      return jsonResponse({ code: "OK", data: data.reminders });
    }
    if (path.endsWith("/api/weekly-progress/opportunities")) {
      return jsonResponse({ code: "OK", data: data.weeklyProgress });
    }
    if (path.endsWith("/api/system/dicts")) {
      return jsonResponse({ code: "OK", data: data.dictionaries });
    }
    if (path.endsWith("/api/approvals/tasks")) {
      return jsonResponse({ code: "OK", data: [] });
    }
    if (path.endsWith("/api/approvals/object/quotation/91")) {
      return jsonResponse({
        code: "OK",
        data: { object_type: "quotation", object_id: 91, instance: null, history: [] }
      });
    }
    if (path.endsWith("/api/approval-templates")) {
      return jsonResponse({ code: "OK", data: [] });
    }
    if (path.endsWith("/api/system/audit-logs")) {
      return jsonResponse({ code: "OK", data: data.auditLogs });
    }
    if (path.endsWith("/api/system/ai-model-configs/9101/test") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: {
          ...data.aiModelConfigs[0],
          last_test_status: "success",
          last_test_message: "OpenAI模型连接成功：gpt-4.1-mini"
        }
      });
    }
    if (path.endsWith("/api/system/ai-model-configs")) {
      return jsonResponse({ code: "OK", data: data.aiModelConfigs });
    }
    if (path.endsWith("/api/system/departments") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.departments[0], id: 2, code: "sales-south", name: "华南销售部" } });
    }
    if (path.endsWith("/api/system/departments")) {
      return jsonResponse({ code: "OK", data: data.departments });
    }
    if (path.endsWith("/api/system/users") && method === "POST") {
      return jsonResponse({ code: "OK", data: { ...data.users[0], id: 1002, name: "新增销售" } });
    }
    if (path.endsWith("/api/system/users")) {
      return jsonResponse({ code: "OK", data: data.users });
    }
    if (path.endsWith("/api/system/users/1001") && method === "PUT") {
      return jsonResponse({ code: "OK", data: { ...data.users[0], name: "销售一号更新" } });
    }
    if (path.endsWith("/api/system/roles") && method === "POST") {
      return jsonResponse({
        code: "OK",
        data: {
          id: 3003,
          code: "solution_reviewer",
          name: "方案评审员",
          description: "负责方案和报价评审",
          permission_codes: []
        }
      });
    }
    if (path.endsWith("/api/system/roles")) {
      return jsonResponse({ code: "OK", data: data.roles });
    }
    if (path.endsWith("/api/system/permissions")) {
      return jsonResponse({ code: "OK", data: data.permissions });
    }
    if (path.endsWith("/api/system/roles/3001/permissions") && method === "PUT") {
      return jsonResponse({
        code: "OK",
        data: {
          ...data.roles[0],
          permission_codes: ["account.read", "account.create", "system.audit.read"]
        }
      });
    }
    if (path.endsWith("/api/system/dicts/types") && method === "POST") {
      return jsonResponse({ code: "OK", data: { id: 502, dict_code: "risk_level", dict_name: "风险等级", items: [] } });
    }
    if (path.includes("/api/system/dicts/types/") && path.endsWith("/items") && method === "POST") {
      return jsonResponse({ code: "OK", data: data.dictionaries[0] });
    }
    if (path.includes("/api/system/dicts/items/") && method === "PATCH") {
      return jsonResponse({ code: "OK", data: data.dictionaries[0] });
    }
    return jsonResponse({ code: "NOT_FOUND", message: "not found" }, 404);
  });
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
