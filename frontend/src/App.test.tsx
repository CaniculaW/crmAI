import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

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
      "activity.read",
      "activity.create",
      "activity.complete",
      "reminder.read",
      "weekly_progress.read",
      "system.audit.read",
      "system.dict.manage",
      "system.user.manage",
      "system.role.manage"
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
  users: [
    {
      id: 1001,
      department_id: 1,
      name: "销售一号",
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
    }
  ]
};

describe("CRM frontend V1 workflow", () => {
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

    expect(await screen.findByRole("heading", { name: "AI助手" })).toBeInTheDocument();
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
    });
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

    expect(await screen.findByText("客户草稿")).toBeInTheDocument();
    expect(screen.getByText("联系人草稿")).toBeInTheDocument();
    expect(screen.getByText("测试客户AI")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/ai-drafts/parse"), expect.anything());
    });
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
    await user.click(screen.getByRole("button", { name: "完成CRM V1试点需求确认会" }));

    expect(await screen.findByRole("heading", { name: "行动执行入口" })).toBeInTheDocument();
    expect(screen.getByText("执行判断")).toBeInTheDocument();
    expect(screen.getAllByText("测试客户A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("测试商机A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);
    expect(screen.getAllByText("会议沟通").length).toBeGreaterThan(0);
    expect(screen.getByText("围绕CRM V1试点目标、角色权限、客户档案和商机推进节奏完成确认。")).toBeInTheDocument();
    expect(screen.getByText("客户希望先以重点客户团队试点，验证周进展和提醒机制。")).toBeInTheDocument();
    expect(screen.getByText("双方确认进入试点方案细化阶段。")).toBeInTheDocument();
    expect(screen.getByText("三日内提交试点方案和演示账号。")).toBeInTheDocument();
    expect(screen.getByText("需在方案中明确历史数据导入范围。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看客户" })).toHaveAttribute("href", "/accounts");
    expect(screen.getByRole("link", { name: "推进商机" })).toHaveAttribute("href", "/opportunities");
    expect(screen.getByRole("link", { name: "查看周进展" })).toHaveAttribute("href", "/weekly-progress");
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
    await user.type(departmentDialog.getByLabelText("组织编码"), "sales-south");
    await user.type(departmentDialog.getByLabelText("组织名称"), "华南销售部");
    await user.type(departmentDialog.getByLabelText("区域编码"), "CN-44");
    await user.click(departmentDialog.getByRole("button", { name: "保存组织" }));

    await user.click(screen.getAllByRole("link", { name: "用户管理" })[0]);
    await user.click(screen.getByRole("button", { name: "新增用户" }));
    const userCreateDialog = latestDialog();
    await user.type(userCreateDialog.getByLabelText("部门ID"), "1");
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
          body: expect.stringContaining("new_sales")
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/system/users/1001",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("销售一号更新")
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

function mockCrmFetch(overrides: Partial<typeof apiData> = {}) {
  const data = { ...apiData, ...overrides };
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const path = url.split("?")[0];
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
    if (path.endsWith("/api/system/audit-logs")) {
      return jsonResponse({ code: "OK", data: data.auditLogs });
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
