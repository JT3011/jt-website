import {fail} from '../hub-integrations.mjs';
import {blankWeek,mealOptions,MEAL_SLOTS,mondayOf,plannerBasket} from '../../nutrition-planner-core.mjs';
export const emptyPlanner=()=>({favourites:[],weeks:{}});
export async function readPlanner(ctx,player) { return (await ctx.db('hub_nutrition_planner',{player_user_id:`eq.${player}`,select:'revision,data'},'GET',undefined,true))[0]||{revision:0,data:emptyPlanner()}; }
function validWeek(value,today) {
 const date=new Date(value+'T12:00:00Z'),delta=(date-new Date(mondayOf(today)+'T12:00:00Z'))/86400000;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')||!Number.isFinite(delta)||date.toISOString().slice(0,10)!==value||mondayOf(value)!==value||delta < -364||delta>84)fail(400,'Choose a Monday within the past year or the next 12 weeks.');
 return value;
}
export async function updatePlanner(ctx,player,record,intake,today) {
 const {body,action,db}=ctx;
 if(record.kind!=='nutrition'||record.status!=='published')fail(403,'Only shared nutrition plans can be used in your planner.');
 const saved=await readPlanner(ctx,player);
 if(body.planner_revision!==saved.revision)fail(409,'Your planner changed on another device. Refresh and try again.');
 const data=structuredClone(saved.data),key=record.id+':'+body.recipe_id;
 if(action==='planner_favourite'){
  if(!record.plan.recipes.some(r=>r.id===body.recipe_id))fail(400,'Choose a recipe from your shared plan.');
  data.favourites=data.favourites.filter(x=>x!==key);if(body.saved===true)data.favourites.push(key);
  if(data.favourites.length>240)fail(400,'Your recipe collection is full. Remove a favourite before adding another.');
 }else{
  if(record.intake_revision!==intake?.revision||intake.status!=='submitted')fail(409,'Your food preferences have changed. Your coach needs to share an updated plan before you edit meals.');
  const start=validWeek(body.week_start,today);
  if(start<mondayOf(today))fail(400,'Past weeks are kept as history. Choose this week or a future week to make changes.');
  let week=data.weeks[start]||blankWeek(record,intake.answers);
  if(week.plan_id!==record.id&&action!=='planner_replace')fail(409,'This week uses a different shared plan. Refresh before editing it.');
  if(action==='planner_replace'){
   week=blankWeek(record,intake.answers);
  }else if(action==='planner_meal'){
   if(!Number.isInteger(body.day)||body.day<0||body.day>6||!MEAL_SLOTS.includes(body.slot))fail(400,'Choose a day and meal.');
   if(!mealOptions(record.plan,body.slot).some(r=>r.id===body.recipe_id))fail(400,'Choose one of your coach-approved meal options.');
   if(!Number.isInteger(body.servings)||body.servings<1||body.servings>8)fail(400,'Choose one to eight people.');
   week.meals[body.day][body.slot]={recipe:body.recipe_id,servings:body.servings};week.checked=[];
  }else if(action==='planner_move'){
   if(!Number.isInteger(body.day)||!Number.isInteger(body.to_day)||body.day<0||body.day>6||body.to_day<0||body.to_day>6||!MEAL_SLOTS.includes(body.slot))fail(400,'Choose two days and a meal.');
   [week.meals[body.day][body.slot],week.meals[body.to_day][body.slot]]=[week.meals[body.to_day][body.slot],week.meals[body.day][body.slot]];
  }else if(action==='planner_pantry'||action==='planner_checked'){
   if(!plannerBasket(record,week).some(i=>i.id===body.ingredient_id))fail(400,'Choose an ingredient in this week’s shopping list.');
   if(action==='planner_pantry'){
    if(!Number.isFinite(body.quantity)||body.quantity<0||body.quantity>100000)fail(400,'Enter a cupboard quantity between 0 and 100000.');
    week.pantry[body.ingredient_id]=body.quantity;week.checked=week.checked.filter(x=>x!==body.ingredient_id);
   }else{week.checked=week.checked.filter(x=>x!==body.ingredient_id);if(body.checked===true)week.checked.push(body.ingredient_id);}
  }else if(action==='planner_copy'){
   const source=validWeek(body.source_week,today),previous=data.weeks[source];
   if(!previous||previous.plan_id!==record.id)fail(400,'Save a week with this plan before copying it.');
   if(data.weeks[start])fail(409,'There is already a saved plan for that week. Choose an empty week.');
   week={...structuredClone(previous),checked:[],pantry:{}};
  }else if(action==='planner_save'){
   // Save the original rotation as a dated week without changing any recipes.
  }else fail(404,'Planner action not found.');
  data.weeks[start]=week;
  if(Object.keys(data.weeks).length>80)fail(400,'Your planner is full. Contact JT to archive older weeks.');
 }
 const row={player_user_id:player,revision:saved.revision+1,data,updated_at:new Date().toISOString()};
 let result;
 try{result=await db('hub_nutrition_planner',saved.revision?{player_user_id:`eq.${player}`,revision:`eq.${saved.revision}`}:{},saved.revision?'PATCH':'POST',row,false,'return=representation');}
 catch(error){if(error.status===409||error.code==='23505')fail(409,'Your planner changed on another device. Refresh and try again.');throw error;}
 if(!result.length)fail(409,'Your planner changed on another device. Refresh and try again.');
 return {saved:true,planner:{revision:result[0].revision,data:result[0].data}};
}
