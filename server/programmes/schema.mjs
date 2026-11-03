const text=(maxLength=200)=>({type:'string',maxLength});
const num=(minimum=0,maximum=1000)=>({type:'number',minimum,maximum});
const choice=(...values)=>({type:'string',enum:values});
const list=(items,minItems=0,maxItems=30)=>({type:'array',items,minItems,maxItems});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const common={title:text(90),summary:text(220),focus:list(text(90),3,3),habits:list(obj({id:text(30),label:text(60),target:text(90)}),2,4),coach_notes:list(text(240),1,5)};
export const nutritionSchema=obj({...common,
 ingredients:list(obj({id:text(25),name:text(100),unit:choice('g','ml','each')}),8,35),
 recipes:list(obj({id:text(25),title:text(90),visual:choice('bowl','wrap','pasta','plate','oats','snack','smoothie','soup'),minutes:num(0,120),ingredients:list(obj({id:text(25),quantity:num(.1,2000)}),1,12),steps:list(text(180),2,5),tip:text(150)}),14,24),
 week:list(obj({day:choice(...DAYS),focus:text(80),breakfast:text(25),lunch:text(25),dinner:text(25),snack:text(25),timing:text(160)}),7,7),
 swaps:list(obj({from:text(25),to:text(25),reason:text(120)}),3,6),
 prep:list(text(160),2,5)
});
export const gymSchema=obj({...common,
 sessions:list(obj({id:text(25),title:text(80),focus:choice('full','upper','lower','core','mobility'),minutes:num(15,90),warmup:list(text(150),2,4),exercises:list(obj({id:text(25),name:text(90),pattern:choice('squat','hinge','push','pull','lunge','core','carry','mobility'),sets:num(1,4),reps:text(30),rest_seconds:num(20,180),effort:text(90),cue:text(160),easier:text(130),equipment:text(100)}),3,7),cooldown:list(text(130),1,3)}),1,4),
 week:list(obj({day:choice(...DAYS),session_id:text(25),focus:text(100)}),7,7),
 progression:list(obj({week:num(1,4),focus:text(200)}),4,4)
});
export const priceSchema=obj({items:list(obj({id:text(25),product:text(150),pack_size:num(.1,100000),unit:choice('g','ml','each'),price:{type:['number','null'],minimum:.01,maximum:500},url:text(1000),note:text(160)}),1,8)});
export function validateShape(value,schema,path='plan'){
 if(schema.type==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`${path}: invalid object`);
  for(const k of schema.required)if(!(k in value))throw Error(`${path}.${k}: missing`);
  if(Object.keys(value).some(k=>!schema.properties[k]))throw Error(`${path}: unexpected field`);
  for(const[k,s]of Object.entries(schema.properties))validateShape(value[k],s,`${path}.${k}`);
 }else if(schema.type==='array'){
  if(!Array.isArray(value)||value.length<schema.minItems||value.length>schema.maxItems)throw Error(`${path}: invalid list`);
  value.forEach((v,i)=>validateShape(v,schema.items,`${path}.${i}`));
 }else{
  const types=Array.isArray(schema.type)?schema.type:[schema.type];
  if(value===null&&types.includes('null'))return;
  if(!types.includes(typeof value))throw Error(`${path}: invalid value`);
  if(typeof value==='number'&&(!Number.isFinite(value)||value<schema.minimum||value>schema.maximum))throw Error(`${path}: outside range`);
  if(typeof value==='string'&&(value.length>schema.maxLength||schema.enum&&!schema.enum.includes(value)))throw Error(`${path}: invalid text`);
 }
 return value;
}
