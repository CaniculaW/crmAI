insert into sys_dict_types (dict_code, dict_name, description)
select v.dict_code, v.dict_name, v.description
from (
    values
        ('solution_doc_type', '方案材料类型', 'V2 方案与标书材料分类'),
        ('solution_status', '方案状态', 'V2 方案与标书状态'),
        ('solution_self_check_result', '方案自评结果', 'V2 标书自评和方案自查结果'),
        ('solution_risk_level', '方案风险等级', 'V2 方案与标书风险等级'),
        ('contract_type', '合同类型', 'V2 合同分类'),
        ('contract_status', '合同状态', 'V2 合同生命周期状态'),
        ('contract_change_type', '合同变更类型', 'V2 合同变更分类'),
        ('contract_milestone_status', '合同节点状态', 'V2 合同节点履约状态'),
        ('invoice_status', '开票状态', 'V2 开票计划和发票状态'),
        ('invoice_type', '发票类型', 'V2 发票类型'),
        ('invoice_exception_type', '开票异常类型', 'V2 开票异常分类'),
        ('receivable_plan_status', '回款计划状态', 'V2 回款计划状态'),
        ('payment_status', '到账状态', 'V2 回款流水状态'),
        ('payment_method', '回款方式', 'V2 到账方式'),
        ('receivable_follow_up_result', '回款跟进结果', 'V2 回款跟进结论'),
        ('reconciliation_status', '核销状态', 'V2 发票回款核销状态'),
        ('reconciliation_source', '核销来源', 'V2 核销创建来源')
) as v(dict_code, dict_name, description)
where not exists (
    select 1
    from sys_dict_types t
    where t.dict_code = v.dict_code
      and t.deleted_at is null
);

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order, is_active)
select t.id, v.item_code, v.item_name, v.sort_order, true
from sys_dict_types t
join (
    values
        ('solution_doc_type', 'proposal', '商业方案', 10),
        ('solution_doc_type', 'bid', '投标文件', 20),
        ('solution_doc_type', 'quotation', '报价测算', 30),
        ('solution_doc_type', 'self_check', '标书自评', 40),
        ('solution_doc_type', 'customer_feedback', '客户反馈', 50),
        ('solution_status', 'draft', '草稿', 10),
        ('solution_status', 'reviewing', '评审中', 20),
        ('solution_status', 'approved', '已通过', 30),
        ('solution_status', 'rejected', '未通过', 40),
        ('solution_status', 'voided', '已作废', 50),
        ('solution_self_check_result', 'pass', '通过', 10),
        ('solution_self_check_result', 'risk', '有风险', 20),
        ('solution_self_check_result', 'failed', '不通过', 30),
        ('solution_self_check_result', 'not_required', '无需自评', 40),
        ('solution_risk_level', 'low', '低风险', 10),
        ('solution_risk_level', 'medium', '中风险', 20),
        ('solution_risk_level', 'high', '高风险', 30),
        ('contract_type', 'sales', '销售合同', 10),
        ('contract_type', 'framework', '框架协议', 20),
        ('contract_type', 'supplement', '补充协议', 30),
        ('contract_type', 'service', '服务合同', 40),
        ('contract_status', 'draft', '草稿', 10),
        ('contract_status', 'active', '履约中', 20),
        ('contract_status', 'closed', '已结清', 30),
        ('contract_status', 'terminated', '已终止', 40),
        ('contract_change_type', 'amount', '金额变更', 10),
        ('contract_change_type', 'schedule', '周期变更', 20),
        ('contract_change_type', 'scope', '范围变更', 30),
        ('contract_change_type', 'terms', '条款变更', 40),
        ('contract_milestone_status', 'pending', '待完成', 10),
        ('contract_milestone_status', 'achieved', '已完成', 20),
        ('contract_milestone_status', 'delayed', '已延期', 30),
        ('contract_milestone_status', 'waived', '已豁免', 40),
        ('invoice_status', 'planned', '计划中', 10),
        ('invoice_status', 'applied', '已申请', 20),
        ('invoice_status', 'invoiced', '已开票', 30),
        ('invoice_status', 'signed', '已签收', 40),
        ('invoice_status', 'exception', '异常', 50),
        ('invoice_status', 'voided', '已作废', 60),
        ('invoice_type', 'special_vat', '增值税专票', 10),
        ('invoice_type', 'normal_vat', '增值税普票', 20),
        ('invoice_type', 'receipt', '收据', 30),
        ('invoice_exception_type', 'info_error', '信息错误', 10),
        ('invoice_exception_type', 'amount_error', '金额错误', 20),
        ('invoice_exception_type', 'customer_reject', '客户拒收', 30),
        ('invoice_exception_type', 'system_issue', '系统问题', 40),
        ('receivable_plan_status', 'planned', '计划中', 10),
        ('receivable_plan_status', 'partial', '部分回款', 20),
        ('receivable_plan_status', 'received', '已回款', 30),
        ('receivable_plan_status', 'overdue', '已逾期', 40),
        ('receivable_plan_status', 'terminated', '已终止', 50),
        ('payment_status', 'unconfirmed', '待确认', 10),
        ('payment_status', 'confirmed', '已确认', 20),
        ('payment_status', 'exception', '异常', 30),
        ('payment_status', 'refunded', '已退款', 40),
        ('payment_method', 'bank_transfer', '银行转账', 10),
        ('payment_method', 'bill', '承兑汇票', 20),
        ('payment_method', 'cash', '现金', 30),
        ('payment_method', 'other', '其他', 40),
        ('receivable_follow_up_result', 'promised', '承诺付款', 10),
        ('receivable_follow_up_result', 'disputed', '存在争议', 20),
        ('receivable_follow_up_result', 'escalated', '升级处理', 30),
        ('receivable_follow_up_result', 'closed', '已关闭', 40),
        ('reconciliation_status', 'active', '有效', 10),
        ('reconciliation_status', 'voided', '已撤销', 20),
        ('reconciliation_source', 'manual', '手工核销', 10),
        ('reconciliation_source', 'imported', '导入核销', 20)
) as v(dict_code, item_code, item_name, sort_order) on v.dict_code = t.dict_code
where t.deleted_at is null
  and not exists (
      select 1
      from sys_dict_items i
      where i.dict_type_id = t.id
        and i.item_code = v.item_code
        and i.deleted_at is null
  );
