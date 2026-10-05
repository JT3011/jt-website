import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

export const tourNodes={home:[.7,0],middle:[.7,5],entry:[.7,13],east:[3.4,0],back:[3.4,-7],westBack:[-3,-7],west:[-3.2,0],functionalApproach:[-3.2,5],functionalGate:[-4,5],functionalAisle:[-4.8,5],functionalBack:[-4.8,10.8],functional:[-8.7,10.8],sledBack:[-15.35,10.8],sled:[-15.35,6.8],changingGate:[-9.8,13],changing:[-9.8,19],pitchGate:[4,1],pitchInside:[8,1],pitch:[12.1,.5],lounge:[.7,16],reception:[.7,17.5],loungeAisle:[17.8,16],hydration:[18,19.7],leaderboard:[6,17.7],strengthGate:[-3,-6],strengthInside:[-6.3,-6],strength:[-6.3,-8.8],recoveryGate:[2.8,-10.5],recoveryInside:[5.2,-10.5],recovery:[8.4,-11.7],iceBath:[10.25,-12.3],saunaApproach:[13.05,-12.3],sauna:[13.05,-13.0]};
export const tourEdges=[['home','middle'],['middle','entry'],['home','east'],['east','back'],['back','westBack'],['westBack','strengthGate'],['strengthGate','strengthInside'],['strengthInside','strength'],['back','recoveryGate'],['recoveryGate','recoveryInside'],['recoveryInside','recovery'],['recovery','iceBath'],['iceBath','saunaApproach'],['saunaApproach','sauna'],['home','west'],['west','functionalApproach'],['functionalApproach','functionalGate'],['middle','functionalGate'],['functionalGate','functionalAisle'],['functionalAisle','functionalBack'],['functionalBack','functional'],['functional','sledBack'],['sledBack','sled'],['entry','changingGate'],['changingGate','changing'],['east','pitchGate'],['pitchGate','pitchInside'],['pitchInside','pitch'],['entry','lounge'],['lounge','reception'],['lounge','loungeAisle'],['loungeAisle','hydration'],['lounge','leaderboard']];
export function routeBetween(from,to){const queue=[[from]],seen=new Set([from]);while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===to)return path;for(const edge of tourEdges){const next=edge[0]===last?edge[1]:edge[1]===last?edge[0]:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next]);}}}return [from];}
const destinations={athlete:'home',facility:'entry',strength:'strength',functional:'functional',sled:'sled',pitch:'pitch',recovery:'recovery',hydration:'hydration',reception:'reception',changing:'changing',leaderboard:'leaderboard',compression:'recovery',iceBath:'iceBath',sauna:'sauna'};
const axis=new THREE.Vector3(1,0,0),rotation=new THREE.Quaternion();
export function rig(root){
 const result={},patterns={hips:/^(hips|pelvis|j_bip_c_hips)$/,leftFoot:/^(leftfoot|j_bip_l_foot)$/,rightFoot:/^(rightfoot|j_bip_r_foot)$/,leftLeg:/^(leftupleg|leftthigh|j_bip_l_upperleg)$/,rightLeg:/^(rightupleg|rightthigh|j_bip_r_upperleg)$/,leftShin:/^(leftleg|leftcalf|j_bip_l_lowerleg)$/,rightShin:/^(rightleg|rightcalf|j_bip_r_lowerleg)$/,leftArm:/^(leftarm|leftupperarm|j_bip_l_upperarm)$/,rightArm:/^(rightarm|rightupperarm|j_bip_r_upperarm)$/,leftForeArm:/^(leftforearm|j_bip_l_lowerarm)$/,rightForeArm:/^(rightforearm|j_bip_r_lowerarm)$/,leftHand:/^(lefthand|j_bip_l_hand)$/,rightHand:/^(righthand|j_bip_r_hand)$/};
 root.traverse(o=>{if(!o.isBone)return;const n=o.name.toLowerCase().replace(/^mixamorig:?/,'');for(const [key,re] of Object.entries(patterns))if(!result[key]&&re.test(n))result[key]={bone:o,base:o.quaternion.clone()};});
 // Lower upper arms in world space; works for both the donor and personalised rig axes.
 for(const side of ['left','right']){const upper=result[side+'Arm']?.bone,fore=result[side+'ForeArm']?.bone;if(!upper||!fore)continue;root.updateWorldMatrix(true,true);const from=upper.getWorldPosition(new THREE.Vector3()),to=fore.getWorldPosition(new THREE.Vector3()).sub(from).normalize();const desired=new THREE.Vector3(side==='left'?.12:-.12,-1,.05).normalize();const world=upper.getWorldQuaternion(new THREE.Quaternion());const parent=upper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();upper.quaternion.copy(parent.multiply(new THREE.Quaternion().setFromUnitVectors(to,desired)).multiply(world));result[side+'Arm'].base.copy(upper.quaternion);}
 return result;
}
function angle(bones,key,value){const item=bones?.[key];if(item)item.bone.quaternion.copy(item.base).multiply(rotation.setFromAxisAngle(axis,value));}
// Aim the bone toward an actor-space direction, independent of each export's local bone axes.
export function aim(bones,key,childKey,direction,actor){
 const bone=bones[key]?.bone,child=bones[childKey]?.bone;if(!bone||!child)return;
 bone.updateWorldMatrix(true,true);const origin=bone.getWorldPosition(new THREE.Vector3()),current=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
 const desired=new THREE.Vector3(...direction).normalize().applyQuaternion(actor.getWorldQuaternion(new THREE.Quaternion()));
 const world=bone.getWorldQuaternion(new THREE.Quaternion()),parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
 bone.quaternion.copy(parent.multiply(new THREE.Quaternion().setFromUnitVectors(current,desired)).multiply(world));bone.updateWorldMatrix(false,true);
}
export function gait(bones,time,moving,actor){
 for(const item of Object.values(bones))item.bone.quaternion.copy(item.base);
 const swing=moving?Math.sin(time*7)*.42:0;
 for(const side of ['left','right']){const sign=side==='left'?1:-1,leg=swing*sign,arm=-leg;
  aim(bones,side+'Leg',side+'Shin',[sign*.035,-Math.cos(leg),Math.sin(leg)],actor);
  const knee=leg-Math.max(0,-leg)*1.35;aim(bones,side+'Shin',side+'Foot',[0,-Math.cos(knee),Math.sin(knee)],actor);
  aim(bones,side+'Arm',side+'ForeArm',[sign*.09,-Math.cos(arm),Math.sin(arm)],actor);
  aim(bones,side+'ForeArm',side+'Hand',[sign*.035,-Math.cos(arm+.16),Math.sin(arm+.16)],actor);
 }
}
export function ropePose(bones,time,actor){
 for(const side of ['left','right']){const sign=side==='left'?1:-1,pitch=.85+Math.sin(time*6)*sign*.55;
  aim(bones,side+'Arm',side+'ForeArm',[sign*.12,-Math.cos(pitch),Math.sin(pitch)],actor);
  aim(bones,side+'ForeArm',side+'Hand',[0,-Math.cos(pitch+.4),Math.sin(pitch+.4)],actor);
 }
}
const recoverySeats={compression:{position:[8.4,.76,-13.35],thigh:[0,-.10,1],shin:[0,-.30,1]},iceBath:{position:[10.25,.46,-13.7],thigh:[0,.72,.69],shin:[0,-.98,-.2]},sauna:{position:[13.05,.68,-14.55],thigh:[0,.16,.987],shin:[0,-.92,.39]}};
export function seatedPose(bones,actor,kind,blend,standing){
 const seat=recoverySeats[kind];if(!seat||!bones.hips)return;
 actor.rotation.set(0,0,0);
 for(const side of ['left','right']){const sign=side==='left'?1:-1;aim(bones,side+'Leg',side+'Shin',new THREE.Vector3(0,-1,0).lerp(new THREE.Vector3(...seat.thigh),blend).toArray(),actor);aim(bones,side+'Shin',side+'Foot',new THREE.Vector3(0,-1,0).lerp(new THREE.Vector3(...seat.shin),blend).toArray(),actor);aim(bones,side+'Arm',side+'ForeArm',[sign*.05,-1,.12],actor);aim(bones,side+'ForeArm',side+'Hand',[0,-.25,1],actor);}
 actor.updateWorldMatrix(true,true);const hip=bones.hips.bone.getWorldPosition(new THREE.Vector3());const seated=actor.position.clone().add(new THREE.Vector3(...seat.position).sub(hip));actor.position.copy(standing).lerp(seated,blend);if(kind==='iceBath')actor.position.y+=Math.sin(blend*Math.PI)*.7;if(kind==='sauna')actor.position.y-=Math.sin(blend*Math.PI)*.20;actor.updateWorldMatrix(true,true);
}
export function createFacilityTour({world,holder,camera,controls,measure,onReset,announce,onArrive=()=>{},onTravel=()=>{},interactions}){
 let active=false,playerRig=null,node='home',steps=[],queued=null,homeY=.172,ambient=[],selected='athlete',pending=null,arrived=false,activity=null,activityTime=0,pendingActivity=null,exitActivity=null,standing=null;
 function activate(){active=true;controls.enableRotate=true;controls.enablePan=false;camera.fov=48;camera.updateProjectionMatrix();controls.target.set(holder.position.x,1.15,holder.position.z);camera.position.copy(controls.target).add(new THREE.Vector3(0,2.1,5.7));}
 function select(name){if(activity&&!exitActivity){exitActivity={elapsed:0,next:name};return true;}if(exitActivity){exitActivity.next=name;return true;}pendingActivity=null;if(!playerRig){pending=name;announce('Your athlete is loading. The walk will start when ready.');return true;}if(!active)activate();activity=null;interactions?.reset();arrived=false;selected=name;if(steps.length){queued=name;steps=steps.slice(0,1);}else steps=routeBetween(node,destinations[name]||'home').slice(1);onTravel(name);announce(`Walking to ${name==='facility'?'the entrance':name}.`);return true;}
 function stop(){active=false;steps=[];queued=null;activity=null;exitActivity=null;pendingActivity=null;interactions?.reset();holder.position.set(.7,homeY,0);holder.rotation.set(0,0,0);controls.enableRotate=true;controls.enablePan=true;if(playerRig)gait(playerRig,0,false,holder);node='home';onReset();}
 function setupPlayer(model,y){playerRig=rig(model);homeY=y;if(pending){const name=pending;pending=null;select(name);}}
 function clearAmbient(){const seen=new Set();for(const actor of ambient){world.remove(actor.wrapper);actor.wrapper.traverse(o=>{if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(seen.has(m))continue;seen.add(m);for(const v of Object.values(m))if(v?.isTexture&&!seen.has(v)){seen.add(v);v.dispose();}m.dispose();}});}ambient=[];}
 function addAmbient(source){
  if(ambient.length>=10)return false;const i=ambient.length,model=clone(source);model.position.set(0,0,0);const wrapper=new THREE.Group();wrapper.name='shared-member-athlete';wrapper.add(model);world.add(wrapper);const bones=rig(model);gait(bones,0,false,wrapper);wrapper.updateMatrixWorld(true);let bounds=measure(model);const height=bounds.getSize(new THREE.Vector3()).y;if(!Number.isFinite(height)||height<.001){world.remove(wrapper);return false;}wrapper.scale.setScalar(1.8/height);wrapper.updateMatrixWorld(true);bounds=measure(model);const centre=bounds.getCenter(new THREE.Vector3());model.position.x-=centre.x/wrapper.scale.x;model.position.z-=centre.z/wrapper.scale.z;wrapper.position.y=.02-bounds.min.y;
  const start=['entry','west','east','middle','back','westBack','lounge','functionalApproach','pitchGate','reception'][i];wrapper.position.x=tourNodes[start][0];wrapper.position.z=tourNodes[start][1];model.traverse(o=>{if(o.isMesh)o.castShadow=false;});ambient.push({wrapper,bones,node:start,steps:[],cycle:i,phase:i*1.27,gaitClock:0,baseY:wrapper.position.y});return true;
 }
 function move(actor,delta){if(!actor.steps.length)return false;const next=actor.steps[0],[x,z]=tourNodes[next],dx=x-actor.wrapper.position.x,dz=z-actor.wrapper.position.z,d=Math.hypot(dx,dz),travel=Math.min(d,delta*2.05);if(d>.001){actor.wrapper.position.x+=dx/d*travel;actor.wrapper.position.z+=dz/d*travel;const desired=Math.atan2(dx,dz),difference=Math.atan2(Math.sin(desired-actor.wrapper.rotation.y),Math.cos(desired-actor.wrapper.rotation.y));actor.wrapper.rotation.y+=difference*Math.min(1,delta*10);}if(d<.025||travel===d){actor.wrapper.position.x=x;actor.wrapper.position.z=z;actor.node=next;actor.steps.shift();}return true;}
 function beginActivity(name){activity=name==='recovery'?'compression':name;activityTime=0;standing=holder.position.clone();holder.rotation.y=Math.PI;interactions?.start(activity);}
 function use(){if(!active||!arrived||steps.length)return false;if(activity){exitActivity={elapsed:0,next:null};return false;}beginActivity(selected);return true;}
 function visitRecovery(name){if(!recoverySeats[name])return;select(name);pendingActivity=name;}
 function update(delta,time,reducedMotion){
  if(active){const previous=holder.position.clone(),actor={wrapper:holder,node,steps};const moving=move(actor,delta);node=actor.node;holder.position.y=homeY-(node==='home'&&!steps.length?0:.152);holder.rotation.x=0;holder.rotation.z=0;gait(playerRig,reducedMotion?0:time,moving&&!reducedMotion,holder);
   if(!steps.length&&queued){const name=queued;queued=null;steps=routeBetween(node,destinations[name]||'home').slice(1);}
   if(!steps.length&&!queued&&!arrived){arrived=true;if(selected==='athlete'){stop();onArrive('athlete');return;}if(pendingActivity===selected){beginActivity(selected);pendingActivity=null;}onArrive(selected);announce(`Arrived at ${selected}. Choose the activity button to interact.`);}
   if(activity){activityTime+=delta;const t=reducedMotion?0:activityTime,pulse=(1-Math.cos(t*2.5))/2;
    if(activity==='strength'){angle(playerRig,'leftForeArm',-pulse*1.35);angle(playerRig,'rightForeArm',-pulse*1.35);}
    if(activity==='functional')ropePose(playerRig,t,holder);
    if(activity==='sled'){holder.position.z=tourNodes.sled[1]-Math.min(t,3)*.52;holder.rotation.x=.20;angle(playerRig,'leftArm',-1.1);angle(playerRig,'rightArm',-1.1);angle(playerRig,'leftForeArm',-.25);angle(playerRig,'rightForeArm',-.25);}
    if(activity==='pitch')angle(playerRig,'rightLeg',Math.sin(Math.min(t%5,.7)/.7*Math.PI)*.7);
    if(activity==='hydration'){angle(playerRig,'rightArm',-.55);angle(playerRig,'rightForeArm',-1.6);holder.rotation.y=0;}
    if(recoverySeats[activity]){
     let blend=Math.min(activityTime/1.2,1);if(exitActivity){exitActivity.elapsed+=delta;blend=1-Math.min(exitActivity.elapsed/1.2,1);}
     seatedPose(playerRig,holder,activity,blend,standing);interactions?.seatProgress(blend,!!exitActivity);
    }else if(exitActivity)exitActivity.elapsed=1.2;
    holder.updateMatrixWorld(true);interactions?.poseEquipment(playerRig);
    if(exitActivity&&exitActivity.elapsed>=1.2){const next=exitActivity.next;holder.position.copy(standing);activity=null;exitActivity=null;interactions?.reset();gait(playerRig,0,false,holder);if(next){const auto=pendingActivity;select(next);pendingActivity=auto;}else onArrive(selected);}
   }
   const movement=holder.position.clone().sub(previous);movement.y=0;controls.target.add(movement);camera.position.add(movement);camera.lookAt(controls.target);
  }
  for(const actor of ambient){if(reducedMotion){gait(actor.bones,0,false,actor.wrapper);continue;}if(!actor.steps.length){const goals=['entry','west','lounge','east','back','middle'];actor.steps=routeBetween(actor.node,goals[actor.cycle++%goals.length]).slice(1);}const walking=move(actor,delta*.65);actor.gaitClock+=delta;if(actor.gaitClock>=1/30){gait(actor.bones,time*.65+actor.phase,walking,actor.wrapper);actor.gaitClock=0;}actor.wrapper.position.y=actor.baseY;}
  interactions?.updateActors([holder.position,...ambient.map(a=>a.wrapper.position)],delta,reducedMotion);
 }
 return {select,setupPlayer,addAmbient,clearAmbient,update,stop,use,visitRecovery,get crowdCount(){return ambient.length;},get active(){return active;},get activity(){return activity;}};
}
