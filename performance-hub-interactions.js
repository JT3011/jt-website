import * as THREE from 'three';

// Fixed station interactions and doorways; none of these visual activities award points.
export function buildFacilityInteractions({root,box,cylinder,label,wood,steel,goldMetal,glow}){
 const doors=[],black=new THREE.MeshStandardMaterial({color:0x111a1d,roughness:.65,metalness:.25});
 const partitions=new THREE.Group();partitions.name='facility-partitions';root.add(partitions);
 const walls=[];
 const roomHeight=5.4;
 // Six complete rooms; the gaps between their bounds are dedicated circulation corridors.
 function wall(w,h,d,x,y,z,parent=root){const mesh=box(w,h,d,x,y,z,black);mesh.name='room-wall';if(parent!==root){root.remove(mesh);parent.add(mesh);}walls.push(mesh);return mesh;}
 function neonSign(text,frame,x){
  const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const c=cv.getContext('2d');c.fillStyle='#030606';c.fillRect(0,0,1024,256);c.strokeStyle='#dbc181';c.lineWidth=6;c.strokeRect(8,8,1008,240);c.shadowColor='#dbc181';c.shadowBlur=22;c.fillStyle='#f4dea0';c.textAlign='center';c.font='700 '+(text.length>15?51:72)+'px sans-serif';c.fillText(text,512,150);
  const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
  for(const sign of [-1,1]){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.1,.775),material);mesh.name='room-neon-sign';mesh.position.set(x,3.32,sign*.14);if(sign<0)mesh.rotation.y=Math.PI;frame.add(mesh);}
 }
 function entrance(name,x,z,rotation,length,offset=0){
  const frame=new THREE.Group();frame.name='entrance-'+name;frame.position.set(x,0,z);frame.rotation.y=rotation;partitions.add(frame);
  const add=(w,h,d,xx,yy,zz,mat)=>{const m=box(w,h,d,xx,yy,zz,mat);root.remove(m);frame.add(m);return m;};
  for(const side of [-1,1]){const end=side*length/2,start=offset+side,w=Math.abs(end-start);wall(w,roomHeight,.18,(end+start)/2,roomHeight/2,0,frame);}
  wall(2,roomHeight-2.7,.18,offset,(roomHeight+2.7)/2,0,frame);
  for(const xx of [offset-1.07,offset+1.07]){add(.12,2.7,.22,xx,1.38,0,steel);add(.025,2.5,.235,xx,1.38,0,glow);}
  add(2.25,.12,.22,offset,2.77,0,goldMetal);neonSign(name.toUpperCase(),frame,offset);
  const leaves=[];
  for(const side of [-1,1]){const leaf=new THREE.Group();leaf.name='automatic-door';leaf.position.set(offset+side*.50,0,0);leaf.userData.baseX=leaf.position.x;frame.add(leaf);const mesh=new THREE.Mesh(new THREE.BoxGeometry(.96,2.65,.065),black);mesh.position.y=1.375;leaf.add(mesh);const strip=new THREE.Mesh(new THREE.BoxGeometry(.012,2.45,.073),glow);strip.position.set(-side*.43,1.375,0);leaf.add(strip);leaves.push({leaf,side});}
  frame.updateWorldMatrix(true,true);doors.push({centre:frame.localToWorld(new THREE.Vector3(offset,0,0)),leaves,openness:0,target:0});
 }
 const rooms=[
  {name:'strength',x0:-18,x1:-4,z0:-16,z1:-1,side:'east',entry:-6},
  {name:'functional + speed',x0:-18,x1:-4,z0:1,z1:12,side:'east',entry:5},
  {name:'recovery',x0:4,x1:19,z0:-17,z1:-9,side:'west',entry:-10.5},
  {name:'football',x0:5,x1:19.2,z0:-5.8,z1:12.2,side:'west',entry:1},
  {name:'changing',x0:-18,x1:-4,z0:14,z1:23,side:'north',entry:-9.8},
  {name:'lounge + nutrition',x0:-3,x1:21,z0:14,z1:24,side:'north',entry:.7}
 ];
 for(const r of rooms){const w=r.x1-r.x0,d=r.z1-r.z0,x=(r.x0+r.x1)/2,z=(r.z0+r.z1)/2;
  if(r.side!=='west')wall(.18,roomHeight,d,r.x0,roomHeight/2,z);
  if(r.side!=='east')wall(.18,roomHeight,d,r.x1,roomHeight/2,z);
  if(r.side!=='north')wall(w,roomHeight,.18,x,roomHeight/2,r.z0);
  wall(w,roomHeight,.18,x,roomHeight/2,r.z1);
  wall(w,.12,d,x,roomHeight+.06,z);
  if(r.side==='north')entrance(r.name,x,r.z0,0,w,r.entry-x);else entrance(r.name,r.side==='east'?r.x1:r.x0,z,Math.PI/2,d,z-r.entry);
  for(const xx of [r.x0+.22,r.x1-.22])box(.028,.03,d-.3,xx,.12,z,glow);
  for(const zz of [r.z0+.3,r.z1-.3])box(w-.6,.028,.07,x,5.1,zz,glow);
 }
 // Gold edges make the clear central and transverse circulation routes easy to follow.
 for(const x of [-2.8,2.8])box(.035,.008,35,x,.044,3,goldMetal);
 for(const z of [0,13])box(21,.008,.035,-7,.044,z,goldMetal);
 let wallBounds=null;
 function constrainCamera(camera,target){
  if(!wallBounds){root.updateWorldMatrix(true,true);wallBounds=walls.map(w=>new THREE.Box3().setFromObject(w));}
  const offset=camera.position.clone().sub(target),distance=offset.length();if(distance<.05)return;const ray=new THREE.Ray(target.clone(),offset.normalize());let limit=distance;
  const blockers=[...wallBounds,...doors.flatMap(d=>d.leaves.map(({leaf})=>new THREE.Box3().setFromObject(leaf)))];
  for(const bounds of blockers){const hit=ray.intersectBox(bounds,new THREE.Vector3());if(hit){const d=hit.distanceTo(target);if(d>.08)limit=Math.min(limit,Math.max(.35,d-.24));}}
  if(limit<distance)camera.position.copy(target).addScaledVector(offset,limit);camera.lookAt(target);
 }
 const props=new THREE.Group();props.name='interactive-equipment';root.add(props);
 const handProps=[];
 for(let i=0;i<2;i++){
  const dumbbell=new THREE.Group();dumbbell.visible=false;props.add(dumbbell);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,.32,16),steel);handle.rotation.z=Math.PI/2;dumbbell.add(handle);
  for(const x of [-.19,.19]){const plate=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.11,24),black);plate.rotation.z=Math.PI/2;plate.position.x=x;dumbbell.add(plate);}handProps.push(dumbbell);
 }
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.045,.036,.19,20),goldMetal);cup.visible=false;props.add(cup);
 const wornBoots=[];
 for(const side of ['left','right']){const boot=new THREE.Mesh(new THREE.CylinderGeometry(.145,.12,1,24),black);boot.name='worn-compression-'+side;boot.visible=false;props.add(boot);const foot=new THREE.Mesh(new THREE.BoxGeometry(.24,.18,.34),black);foot.visible=false;props.add(foot);const cuff=new THREE.Mesh(new THREE.TorusGeometry(.146,.012,8,24),goldMetal);cuff.visible=false;props.add(cuff);wornBoots.push({side,boot,foot,cuff});}
 const restingBoots=root.getObjectByName('resting-compression-boots'),saunaDoor=root.getObjectByName('sauna-door');let seatBlend=0,seatExiting=false;
 let active=null,lastTime=0,started=0;const grips=[null,null];
 const originals=new Map();
 function remember(object){if(object&&!originals.has(object))originals.set(object,{position:object.position.clone(),rotation:object.rotation.clone()});return object;}
 const ball=remember(root.getObjectByName('size-5-football'));
 const ropeMeshes=[root.getObjectByName('battle-rope--1'),root.getObjectByName('battle-rope-1')];
 const ropeVertices=ropeMeshes.map(o=>o?Float32Array.from(o.geometry.attributes.position.array):null);
 // Sled components were collected before static instancing, so they can travel together.
 const sled=remember(root.getObjectByName('interactive-sled'));
 function reset(){active=null;seatBlend=0;seatExiting=false;if(restingBoots)restingBoots.visible=true;for(const b of wornBoots){b.boot.visible=false;b.foot.visible=false;b.cuff.visible=false;}grips.fill(null);handProps.forEach(p=>p.visible=false);cup.visible=false;for(const [o,v] of originals){o.position.copy(v.position);o.rotation.copy(v.rotation);}ropeMeshes.forEach((o,i)=>{if(o){o.geometry.attributes.position.array.set(ropeVertices[i]);o.geometry.attributes.position.needsUpdate=true;}});}
 function start(name){reset();active=name;started=lastTime;if(restingBoots)restingBoots.visible=name!=='compression';if(name==='pitch'&&ball)ball.position.set(6.1,.16,-.5);}
 function updateActors(positions,delta,reducedMotion){
  if(saunaDoor){const near=positions.some(p=>Math.hypot(p.x-13.05,p.z+13.5)<2);const shutForSeat=active==='sauna'&&seatBlend>.95&&!seatExiting;saunaDoor.rotation.y=THREE.MathUtils.damp(saunaDoor.rotation.y,near&&!shutForSeat?1.6:0,10,delta);}
  for(const door of doors){door.target=positions.some(p=>Math.hypot(p.x-door.centre.x,p.z-door.centre.z)<2.1)?1:0;door.openness=reducedMotion?door.target:THREE.MathUtils.damp(door.openness,door.target,8,delta);for(const {leaf,side} of door.leaves)leaf.position.x=leaf.userData.baseX??leaf.position.x;for(const {leaf,side} of door.leaves){if(leaf.userData.baseX==null)leaf.userData.baseX=leaf.position.x;leaf.position.x=leaf.userData.baseX+side*.99*door.openness;}}
 }
 function poseEquipment(bones){
  const left=bones?.leftHand?.bone,right=bones?.rightHand?.bone;
  if(active==='compression')for(const {side,boot,foot,cuff} of wornBoots){const knee=bones?.[side+'Shin']?.bone,ankle=bones?.[side+'Foot']?.bone;if(!knee||!ankle)continue;const a=knee.getWorldPosition(new THREE.Vector3()),b=ankle.getWorldPosition(new THREE.Vector3()),direction=a.clone().sub(b);boot.visible=foot.visible=cuff.visible=true;boot.position.copy(a).lerp(b,.5);boot.scale.y=direction.length()*.94;boot.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());foot.position.copy(b).add(new THREE.Vector3(0,.025,.12));cuff.position.copy(a);cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);}

  if(active==='strength')handProps.forEach((p,i)=>{const hand=i?right:left;p.visible=!!hand;if(hand){hand.getWorldPosition(p.position);hand.getWorldQuaternion(p.quaternion);}});
  if(active==='functional'){[left,right].forEach((hand,i)=>{grips[i]=hand?root.getObjectByName('zone-functional').worldToLocal(hand.getWorldPosition(new THREE.Vector3())):null;});}
  if(active==='hydration'){cup.visible=!!right;if(right){right.getWorldPosition(cup.position);cup.quaternion.identity();}}
 }
 function animate(time,reducedMotion){lastTime=time;const t=reducedMotion?0:time-started;
  if(active==='functional')ropeMeshes.forEach((o,j)=>{if(!o)return;const pos=o.geometry.attributes.position,base=ropeVertices[j];for(let i=0;i<pos.count;i++){const z=base[i*3+2],f=THREE.MathUtils.clamp((z-2.45)/4.5,0,1);const grip=grips[j],endX=-3.7+(j?1:-1)*.24;pos.array[i*3]=base[i*3]+(grip?grip.x-endX:0)*f;pos.array[i*3+2]=base[i*3+2]+(grip?grip.z-6.95:0)*f;pos.array[i*3+1]=base[i*3+1]+f*(grip?grip.y-.075:.65)+Math.sin(f*Math.PI)*.17*Math.sin(f*16-t*8+j*Math.PI);}pos.needsUpdate=true;});
  if(active==='pitch'&&ball){const phase=t%5;ball.position.set(6.1,.16+Math.sin(Math.min(phase/1.8,1)*Math.PI)*.30,-.5-Math.min(phase/1.8,1)*4.4);ball.rotation.x=-t*6;}
  if(active==='sled'&&sled)sled.position.z=-Math.min(t,3)*.52;
 }
 return {start,reset,animate,poseEquipment,updateActors,constrainCamera,rooms,seatProgress(blend,exiting){seatBlend=blend;seatExiting=exiting;},get active(){return active;},doors};
}
