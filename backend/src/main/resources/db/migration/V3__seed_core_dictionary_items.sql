insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'enterprise', '企业客户', 10
from sys_dict_types
where dict_code = 'account_type';

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'government', '政府客户', 20
from sys_dict_types
where dict_code = 'account_type';

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'partner', '渠道伙伴', 30
from sys_dict_types
where dict_code = 'account_type';

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'lead', '商业线索', 10
from sys_dict_types
where dict_code = 'opportunity_stage';

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'validation', '商业验证', 20
from sys_dict_types
where dict_code = 'opportunity_stage';

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'proposal', '方案报价', 30
from sys_dict_types
where dict_code = 'opportunity_stage';

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'visit', '客户拜访', 10
from sys_dict_types
where dict_code = 'activity_type';

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'call', '电话沟通', 20
from sys_dict_types
where dict_code = 'activity_type';

insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
select id, 'meeting', '项目会议', 30
from sys_dict_types
where dict_code = 'activity_type';
