import {DAYS,nutritionSchema,gymSchema,validateShape} from './schema.mjs';
export const SHOPS={Tesco:'tesco.com',Sainsburys:'sainsburys.co.uk',Asda:'asda.com',Morrisons:'morrisons.com',Aldi:'aldi.co.uk',Lidl:'lidl.co.uk',Waitrose:'waitrose.com',Ocado:'ocado.com',MarksSpencer:'marksandspencer.com',Coop:'coop.co.uk',Other:null};
const clean=(v,n=700)=>String(v??'').trim().slice(0,n);
const many=(v,values)=>Array.isArray(v)?[...new Set(v.filter(x=>values.includes(x)))]:[];
export function normaliseIntake(kind,input,profile,{submit=false}={}){
 if(!['nutrition','gym'].includes(kind))throw Error('Choose nutrition or gym.');
 const a={age:Number(input.age)||null,goal:clean(input.goal,180),routine:clean(input.routine),sport_days:many(input.sport_days,DAYS),match_days:many(input.match_days,DAYS),health:input.health==='none'?'none':'review',health_notes:clean(input.health_notes,1000),consent:input.consent===true,guardian:input.guardian===true};
 if(a.age&&(!Number.isInteger(a.age)||a.age<5||a.age>85))throw Error('Enter an age between 5 and 85.');
 if(profile.age_group?.startsWith('under-')&&a.age>=18)throw Error('The age does not match this player profile. Ask JT to check the profile.');
 if(kind==='nutrition')Object.assign(a,{diet:clean(input.diet,40),allergies:clean(input.allergies),likes:clean(input.likes),dislikes:clean(input.dislikes),cuisines:clean(input.cuisines,240),shop:Object.hasOwn(SHOPS,input.shop)?input.shop:'Other',shop_other:clean(input.shop_other,100),budget:Number(input.budget)||null,minutes:Number(input.minutes)||20,servings:Number(input.servings)||1,kitchen:clean(input.kitchen,350),variety:input.variety==='adventurous'?'adventurous':'familiar',school_work:clean(input.school_work,400),current_day:clean(input.current_day,900)});
 else Object.assign(a,{experience:clean(input.experience,30),days:many(input.days,DAYS),minutes:Number(input.minutes)||30,equipment:many(input.equipment,['Bodyweight','Bands','Dumbbells','Barbell','Machines','Cable','Bench','Pull-up bar']),location:clean(input.location,80),supervision:input.supervision===true,preferences:clean(input.preferences),baseline:clean(input.baseline,600)});
 if(kind==='nutrition'&&(a.budget!==null&&(a.budget<5||a.budget>1000)||a.servings<1||a.servings>8||!Number.isInteger(a.servings)))throw Error('Check the weekly budget and dinner portions.');
 if(a.minutes<(kind==='gym'?15:10)||a.minutes>90)throw Error('Choose between 10 and 90 minutes.');
 if(submit){
  if(!a.age||!a.goal||!a.routine||!a.consent)throw Error('Complete your goal, age and routine, then confirm consent.');
  if(a.age<18&&!a.guardian)throw Error('A parent or guardian must confirm this questionnaire.');
  if(a.health==='review'&&!a.health_notes)throw Error('Add a short note for your coach about what needs reviewing.');
  if(kind==='nutrition'&&(!a.diet||!a.likes||!a.allergies||!a.dislikes||!a.current_day||a.budget===null||a.shop==='Other'&&!a.shop_other))throw Error('Complete food preferences, allergies (or “none”), budget and shop.');
  if(kind==='gym'&&a.days.length&&a.days.every(d=>a.match_days.includes(d)))throw Error('Choose a gym day outside your match days.');
  if(kind==='gym'&&(!a.experience||!a.days.length||a.days.length>4||!a.equipment.length))throw Error('Choose your experience, equipment and one to four gym days.');
 }
 return a;
}
export function needsReview(kind,a){return a.health!=='none'||a.age<18&&/weight.?loss|lose weight|fat.?loss|slim|cutting|dieting/i.test(a.goal)||kind==='gym'&&a.age<18&&!a.supervision;}
export function validatePlan(kind,p,a){
 validateShape(p,kind==='nutrition'?nutritionSchema:gymSchema);
 if(p.week.some((d,i)=>d.day!==DAYS[i]))throw Error('Plan needs a complete Monday–Sunday week.');
 const s=JSON.stringify(p).toLowerCase();
 if(/\b(fasting|detox|fat burner|calorie deficit|weight loss|one.rep max|1rm|train to failure)\b/.test(s))throw Error('Plan needs a safety review.');
 if(a.age<18&&/\b(kcal|calories|macros|weigh.in|body fat|cutting|bulking)\b/.test(s))throw Error('Youth plan needs a growth-focused review.');
 const unique=(rows)=>{if(new Set(rows.map(r=>r.id)).size!==rows.length||rows.some(r=>!/^[a-z0-9_-]{1,25}$/.test(r.id)))throw Error('Invalid plan references.');};
 if(kind==='nutrition'){
  unique(p.ingredients);unique(p.recipes);const ids=new Set(p.ingredients.map(x=>x.id)),recipes=new Set(p.recipes.map(x=>x.id));
  if(p.recipes.some(r=>r.minutes>a.minutes||r.ingredients.some(x=>!ids.has(x.id))))throw Error('Recipe does not match preparation time or ingredients.');
  if(p.week.some(d=>['breakfast','lunch','dinner','snack'].some(k=>!recipes.has(d[k])))||p.swaps.some(x=>!recipes.has(x.from)||!recipes.has(x.to)))throw Error('Incomplete meal plan.');
  if(new Set(p.week.map(d=>d.dinner)).size<6)throw Error('Add more dinner variety.');
 }else{
  unique(p.sessions);unique(p.sessions.flatMap(x=>x.exercises));const ids=new Set(p.sessions.map(x=>x.id));
  if(p.week.some(d=>d.session_id&&(!ids.has(d.session_id)||!a.days.includes(d.day)||a.match_days.includes(d.day))))throw Error('Gym plan clashes with availability or match day.');
  if(!p.week.some(d=>d.session_id)||p.sessions.some(x=>x.minutes>a.minutes))throw Error('Gym plan does not fit available time.');
  if(p.sessions.some(x=>x.exercises.some(e=>!Number.isInteger(e.sets))))throw Error('Invalid gym sets.');
  if(p.progression.some((x,i)=>x.week!==i+1))throw Error('Incomplete progression.');
 }
 return p;
}
export function basketNeeds(plan,servings=1){
 const totals=new Map();
 for(const day of plan.week)for(const slot of ['breakfast','lunch','dinner','snack']){
  const r=plan.recipes.find(r=>r.id===day[slot]);
  for(const x of r.ingredients)totals.set(x.id,(totals.get(x.id)||0)+x.quantity*(slot==='dinner'?servings:1));
 }
 return plan.ingredients.filter(i=>totals.has(i.id)).map(i=>({...i,required:Math.round(totals.get(i.id)*100)/100}));
}
export function safeProductUrl(value,domain){try{const u=new URL(value);return u.protocol==='https:'&&domain&&(u.hostname===domain||u.hostname.endsWith('.'+domain))?u.href:null;}catch{return null;}}
export function checkedPrices(items,needs,domain,sources,checkedAt=new Date().toISOString()){
 const urls=new Set(sources.map(x=>{try{return new URL(x).href;}catch{return ''}}));
 return needs.map(n=>{const p=items.find(x=>x.id===n.id),url=safeProductUrl(p?.url,domain),ok=url&&urls.has(url)&&p.unit===n.unit&&Number.isFinite(p.price)&&p.price>0&&p.price<=500&&Number.isFinite(p.pack_size)&&p.pack_size>0;
  if(!ok)return{...n,price:null,note:'Price not confirmed',checked_at:checkedAt};
  const packs=Math.ceil(n.required/p.pack_size);return{...n,product:clean(p.product,150),pack_size:p.pack_size,price:p.price,packs,total:Math.round(packs*p.price*100)/100,used_cost:Math.round(n.required/p.pack_size*p.price*100)/100,url,checked_at:checkedAt,note:clean(p.note,160)};
 });
}
export function basketSummary(items){const priced=items.filter(x=>Number.isFinite(x.total));return{total:Math.round(priced.reduce((n,x)=>n+x.total,0)*100)/100,priced:priced.length,count:items.length,complete:items.length>0&&priced.length===items.length};}
export function cleanCheckin(kind,data,plan,age){
 const range=(v,min,max)=>v===''||v==null?null:Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):null;
 const result={energy:range(data.energy,1,5),sleep:range(data.sleep,0,16),water:range(data.water,0,30),hunger:range(data.hunger,1,5),soreness:range(data.soreness,1,5),notes:clean(data.notes,1000),done:[]};
 const allowed=kind==='nutrition'?['breakfast','lunch','dinner','snack',...plan.habits.map(x=>x.id)]:plan.sessions.map(x=>x.id);
 result.done=many(data.done,allowed);
 if(kind==='gym'){
  const exercises=new Set(plan.sessions.flatMap(x=>x.exercises.map(y=>y.id)));
  result.sets=(Array.isArray(data.sets)?data.sets:[]).slice(0,40).filter(x=>exercises.has(x.exercise)).map(x=>({exercise:x.exercise,set:range(x.set,1,4),reps:range(x.reps,0,100),load:range(x.load,0,500),rpe:range(x.rpe,1,10)}));
 }
 return result;
}
