import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// Guided circulation paths: no private player data and no multiplayer presence.
export const tourNodes={home:[.7,0],middle:[.7,5],entry:[.7,13],east:[3.5,0],back:[3.5,-8],westBack:[-4,-8],west:[-4,0],functional:[-4,5],changing:[-4,13],pitch:[4,3],reception:[.7,16],strength:[-4,-6],recovery:[4,-8],hydration:[-1,-8]};
export const tourEdges=[['home','middle'],['middle','entry'],['home','east'],['east','back'],['back','westBack'],['westBack','strength'],['westBack','hydration'],['back','recovery'],['home','west'],['west','functional'],['middle','functional'],['entry','changing'],['middle','pitch'],['entry','reception']];
export function routeBetween(from,to){
 const queue=[[from]],seen=new Set([from]);
 while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===to)return path;for(const edge of tourEdges){const next=edge[0]===last?edge[1]:edge[1]===last?edge[0]:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next]);}}}
 return [from];
}
const destinations={athlete:'home',facility:'entry',strength:'strength',functional:'functional',sled:'functional',pitch:'pitch',recovery:'recovery',hydration:'hydration',reception:'reception',changing:'changing',leaderboard:'reception'};
function rig(root){const result={};const patterns={leftLeg:/leftupleg|leftthigh|j_bip_l_upperleg/,rightLeg:/rightupleg|rightthigh|j_bip_r_upperleg/,leftShin:/leftleg|leftcalf|j_bip_l_lowerleg/,rightShin:/rightleg|rightcalf|j_bip_r_lowerleg/,leftArm:/leftarm|leftupperarm|j_bip_l_upperarm/,rightArm:/rightarm|rightupperarm|j_bip_r_upperarm/};root.traverse(o=>{if(!o.isBone)return;const n=o.name.toLowerCase().replace(/^mixamorig:?/,'');for(const [key,re] of Object.entries(patterns))if(!result[key]&&re.test(n))result[key]={bone:o,base:o.quaternion.clone()};});return result;}
function gait(bones,time,moving){const swing=moving?Math.sin(time*7)*.32:0;for(const [key,item] of Object.entries(bones)){let angle=key==='leftLeg'?swing:key==='rightLeg'?-swing:key==='leftShin'?Math.max(0,-swing)*1.1:key==='rightShin'?Math.max(0,swing)*1.1:key==='leftArm'?-swing*.55:swing*.55;item.bone.quaternion.copy(item.base).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle));}}
export function createFacilityTour({world,holder,camera,controls,measure,onReset,announce}){
 let active=false,playerRig=null,node='home',steps=[],queued=null,homeY=.172,ambient=[];
 function select(name){const dest=destinations[name]||'home';if(!active)return false;if(steps.length){queued=dest;return true;}steps=routeBetween(node,dest).slice(1);announce(`Walking to ${name==='facility'?'the entrance':name}.`);return true;}
 function stop(){active=false;steps=[];queued=null;holder.position.set(.7,homeY,0);holder.rotation.y=0;controls.enableRotate=true;controls.enablePan=true;if(playerRig)gait(playerRig,0,false);onReset();}
 function toggle(){if(!playerRig){announce('Your athlete is still loading.');return false;}if(active){stop();return false;}active=true;node='home';homeY=holder.position.y;holder.position.y=homeY-.152;controls.enableRotate=true;controls.enablePan=false;camera.fov=42;camera.updateProjectionMatrix();controls.target.set(holder.position.x,1.15,holder.position.z);camera.position.copy(controls.target).add(new THREE.Vector3(0,2,5.5));camera.lookAt(controls.target);announce('Walk mode on. Choose a zone from the bottom bar.');return true;}
 function setupPlayer(model,y){playerRig=rig(model);homeY=y;}
 function addAmbient(source){
  for(let i=0;i<2;i++){
   const model=clone(source);model.position.set(0,0,0);const wrapper=new THREE.Group();wrapper.name='ambient-athlete';wrapper.add(model);world.add(wrapper);wrapper.updateMatrixWorld(true);
   let bounds=measure(model);const height=bounds.getSize(new THREE.Vector3()).y;if(!Number.isFinite(height)||height<.001){world.remove(wrapper);continue;}wrapper.scale.setScalar(1.8/height);wrapper.updateMatrixWorld(true);bounds=measure(model);const centre=bounds.getCenter(new THREE.Vector3());model.position.x-=centre.x/wrapper.scale.x;model.position.z-=centre.z/wrapper.scale.z;wrapper.position.y=.02-bounds.min.y;
   const start=i?'entry':'west';wrapper.position.x=tourNodes[start][0];wrapper.position.z=tourNodes[start][1];ambient.push({wrapper,bones:rig(model),node:start,steps:[],cycle:i,baseY:wrapper.position.y});
  }
 }
 function move(actor,delta){if(!actor.steps.length)return false;const next=actor.steps[0],[x,z]=tourNodes[next];const dx=x-actor.wrapper.position.x,dz=z-actor.wrapper.position.z,d=Math.hypot(dx,dz),travel=Math.min(d,delta*1.15);if(d>.001){actor.wrapper.position.x+=dx/d*travel;actor.wrapper.position.z+=dz/d*travel;actor.wrapper.rotation.y=Math.atan2(dx,dz);}if(d<.035||travel===d){actor.node=next;actor.steps.shift();}return true;}
 function update(delta,time,reducedMotion){
  if(active){const previous=holder.position.clone();const actor={wrapper:holder,node,steps};const moving=move(actor,delta);node=actor.node;holder.position.y=homeY-.152;holder.rotation.x=0;holder.rotation.z=0;gait(playerRig,time,moving);if(!steps.length&&queued){steps=routeBetween(node,queued).slice(1);queued=null;}
   const movement=holder.position.clone().sub(previous);movement.y=0;controls.target.add(movement);camera.position.add(movement);camera.lookAt(controls.target);
  }
  for(const actor of ambient){if(reducedMotion){gait(actor.bones,0,false);continue;}if(!actor.steps.length){const goals=['entry','west','reception','home'];const dest=goals[actor.cycle++%goals.length];actor.steps=routeBetween(actor.node,dest).slice(1);}const moving=move(actor,delta*.65);gait(actor.bones,time*.7,moving);actor.wrapper.position.y=actor.baseY;}
 }
 return {toggle,select,setupPlayer,addAmbient,update,stop,get active(){return active;}};
}
