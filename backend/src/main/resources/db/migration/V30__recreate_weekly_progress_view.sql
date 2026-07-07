drop view if exists v_opportunity_weekly_progress;

create view v_opportunity_weekly_progress as
select
    opportunity_id,
    account_id,
    owner_department_id,
    owner_user_id,
    week_start_date,
    week_start_date + 6 as week_end_date,
    count(*) as activity_count,
    max(activity_time) as latest_activity_at
from (
    select
        opportunity_id,
        account_id,
        owner_department_id,
        owner_user_id,
        cast(date_trunc('week', activity_time) as date) as week_start_date,
        activity_time
    from crm_sales_activities
    where opportunity_id is not null
      and activity_status = 'completed'
      and include_in_weekly_progress = true
      and deleted_at is null
) weekly_source
group by
    opportunity_id,
    account_id,
    owner_department_id,
    owner_user_id,
    week_start_date;
