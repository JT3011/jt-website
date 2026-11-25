export const MEAL_SLOTS = ['breakfast','lunch','dinner','snack'];
export const MEAL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const roundQuantity = n => Math.round((n + Number.EPSILON) * 100) / 100;
export function mondayOf(date) {
 const d = new Date(date+'T12:00:00Z');
 if (!Number.isFinite(d.getTime())) throw Error('Choose a valid week.');
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 return d.toISOString().slice(0,10);
}
export function shiftWeek(date, amount) { const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount*7);return d.toISOString().slice(0,10); }
export function blankWeek(record, answers={}) {
 return {plan_id:record.id,meals:record.plan.week.map(d=>Object.fromEntries(MEAL_SLOTS.map(slot=>[slot,{recipe:d[slot],servings:slot==='dinner'?answers.servings||1:1}]))),pantry:{},checked:[]};
}
export function mealOptions(plan,slot) {
 const base=new Set(plan.week.map(d=>d[slot]));
 const allowed=new Set([...base,...(plan.swaps||[]).filter(s=>base.has(s.from)).map(s=>s.to)]);
 return plan.recipes.filter(r=>allowed.has(r.id));
}
export function aisleFor(name) {
 const n=name.toLowerCase();
 if(/frozen/.test(n))return 'Frozen';
 if(/chicken|turkey|beef|pork|lamb|salmon|tuna|prawn|fish|cod|haddock|meat/.test(n))return 'Meat & fish';
 if(/milk|yogh?urt|cheese|egg|butter|cream|kefir/.test(n))return 'Dairy, eggs & chilled';
 if(/bread|wrap|pitta|pita|bagel|tortilla/.test(n))return 'Bakery';
 if(/apple|banana|berr|orange|lemon|lime|avocado|potato|onion|garlic|carrot|spinach|broccoli|pepper|cucumber|lettuce|courgette|mushroom|fruit|vegetable|tomato|squash|ginger|herb|salad/.test(n)&&!/tinned|canned|dried|powder|passata/.test(n))return 'Fruit & vegetables';
 return 'Cupboard & other';
}
export function plannerBasket(record, week) {
 const totals=new Map();
 for(const day of week.meals)for(const slot of MEAL_SLOTS){const meal=day[slot],recipe=record.plan.recipes.find(r=>r.id===meal.recipe);if(!recipe)throw Error('A saved recipe is unavailable.');for(const i of recipe.ingredients)totals.set(i.id,(totals.get(i.id)||0)+i.quantity*meal.servings);}
 return record.plan.ingredients.filter(i=>totals.has(i.id)).map(i=>{
  const required=roundQuantity(totals.get(i.id)),pantry=Math.min(required,Math.max(0,Number(week.pantry?.[i.id])||0)),needed=roundQuantity(Math.max(0,required-pantry));
  const price=(record.prices||[]).find(p=>p.id===i.id&&p.unit===i.unit);
  const verified=price&&Number.isFinite(price.price)&&price.price>0&&Number.isFinite(price.pack_size)&&price.pack_size>0&&/^https:\/\//.test(price.url||'');
  const packs=verified?Math.ceil(needed/price.pack_size):null;
  return {...i,required,pantry,needed,aisle:aisleFor(i.name),checked:(week.checked||[]).includes(i.id),product:verified?price.product:null,price:verified?price.price:null,pack_size:verified?price.pack_size:null,packs,total:needed===0?0:verified?roundQuantity(packs*price.price):null,url:verified?price.url:null,checked_at:verified?price.checked_at:null};
 });
}
export function plannerTotal(rows) {
 const needed=rows.filter(r=>r.needed>0),priced=needed.filter(r=>Number.isFinite(r.total));
 return {total:roundQuantity(priced.reduce((n,r)=>n+r.total,0)),complete:priced.length===needed.length,priced:priced.length,count:needed.length,collected:needed.filter(r=>r.checked).length};
}
export function shoppingText(rows,label='JT Nutrition shopping list') {
 const needed=rows.filter(r=>r.needed>0&&!r.checked),aisles=[...new Set(needed.map(r=>r.aisle))].sort();
 return label+'\n\n'+aisles.map(aisle=>aisle+'\n'+needed.filter(r=>r.aisle===aisle).map(r=>'□ '+r.name+' — '+r.needed+' '+r.unit+(r.packs!==null?' ('+r.packs+' pack'+(r.packs===1?'':'s')+')':'')).join('\n')).join('\n\n');
}
