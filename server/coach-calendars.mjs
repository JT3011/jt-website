import {fail} from './hub-integrations.mjs';

export function coachDirectory(ctx,staff,hosts,profiles,calendars){
  const ids=new Set(staff.map(s=>s.user_id));
  const rows=calendars.filter(c=>c.enabled!==false&&(ctx.manager||c.coach_user_id===ctx.user.id&&ids.has(ctx.user.id))).map(c=>({
    id:c.id,name:c.display_name,user_id:ids.has(c.coach_user_id)?c.coach_user_id:null,
    booking_url:c.booking_url,host_uri:c.calendly_host_uri,
    account_status:ids.has(c.coach_user_id)?'ready':c.account_email?'awaiting_signup':'email_needed',
    ...(ctx.owner?{email:c.account_email||''}:{})
  }));
  // Existing coaches outside the four named calendars keep their own schedule.
  for(const s of staff){if(rows.some(c=>c.user_id===s.user_id))continue;
    const host=hosts.find(h=>h.coach_user_id===s.user_id),profile=profiles.find(p=>p.id===s.user_id);
    rows.push({id:s.user_id,user_id:s.user_id,name:profile?.player_name||profile?.first_name||host?.calendly_name||'JT coach',booking_url:host?.scheduling_url,host_uri:host?.calendly_user_uri,account_status:'ready'});
  }
  return rows;
}
export function chooseCalendar(ctx,coaches){
  let selected=ctx.params.get('coach')||(ctx.manager?'all':coaches.find(c=>c.user_id===ctx.user.id)?.id);
  if(selected!=='all'&&!coaches.some(c=>c.id===selected))selected=coaches.find(c=>c.user_id===selected)?.id||selected;
  const calendar=coaches.find(c=>c.id===selected);
  if(selected==='all'?!ctx.manager:!calendar||(!ctx.manager&&calendar.user_id!==ctx.user.id))fail(403,'This coach calendar is not available to your account.');
  return{selected,calendar};
}
export async function calendarRows(db,table,query){
  const rows=[];
  for(let offset=0;offset<10000;offset+=500){
    const batch=await db(table,{...query,limit:'500',offset:String(offset)});rows.push(...batch);
    if(batch.length<500)return rows;
  }
  fail(503,'This schedule is too large to display completely. Choose a later start date.');
}
