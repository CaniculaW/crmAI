create view v_opportunity_weekly_progress as
select
    opportunity_id,
    account_id,
    owner_department_id,
    owner_user_id,
    cast(date_trunc('week', activity_time) as date) as week_start_date,
    cast(date_trunc('week', activity_time) as date) + 6 as week_end_date,
    count(*) as activity_count,
    max(activity_time) as latest_activity_at
from crm_sales_activities
where opportunity_id is not null
  and activity_status = 'completed'
  and include_in_weekly_progress = true
  and deleted_at is null
group by
    opportunity_id,
    account_id,
    owner_department_id,
    owner_user_id,
    cast(date_trunc('week', activity_time) as date);
