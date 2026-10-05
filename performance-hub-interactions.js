import * as THREE from 'three';

// Fixed station interactions and doorways; none of these visual activities award points.
export function buildFacilityInteractions({root,box,cylinder,label,wood,steel,goldMetal,glow}){
 const doors=[],black=new THREE.MeshStandardMaterial({color:0x111a1d,roughness:.65,metalness:.25});
 const partitions=new THREE.Group();partitions.name='facility-partitions';root.add(partitions);
 // Segmented walls keep sight lines, while the framed doorways give each zone a threshold.
 function entrance(name,x,z,rotation,length,offset=0){
  const frame=new THREE.Group();frame.name='entrance-'+name;frame.position.set(x,0,z);frame.rotation.y=rotation;partitions.add(frame);
  const add=(w,h,d,xx,yy,zz,mat)=>{const m=box(w,h,d,xx,yy,zz,mat);root.remove(m);frame.add(m);return m;};
  const gap=2.0;
  for(const side of [-1,1]){const end=side*length/2,start=offset+side*gap/2,w=Math.abs(end-start);if(w>0)add(w,1.5,.14,(end+start)/2,.8,0,black);}
  for(const xx of [offset-1.07,offset+1.07]){add(.12,2.7,.22,xx,1.38,0,steel);add(.025,2.5,.235,xx,1.38,0,glow);}
  add(2.25,.12,.22,offset,2.77,0,goldMetal);
  const header=label(name.toUpperCase(),offset,2.98,.13,2.5);root.remove(header);frame.add(header);
  const leaves=[];
  for(const side of [-1,1]){const leaf=new THREE.Group();leaf.name='automatic-door';leaf.position.set(offset+side*.50,0,0);frame.add(leaf);const mesh=new THREE.Mesh(new THREE.BoxGeometry(.96,2.45,.065),black);mesh.position.y=1.28;leaf.add(mesh);const strip=new THREE.Mesh(new THREE.BoxGeometry(.012,2.2,.073),glow);strip.position.set(-side*.43,1.28,0);leaf.add(strip);leaves.push({leaf,side});}
  frame.updateMatrixWorld(true);const centre=frame.localToWorld(new THREE.Vector3(offset,0,0));doors.push({centre,leaves,openness:0,target:0});
 }
 entrance('strength',-4,-8.5,Math.PI/2,15, -2.5);
 entrance('functional',-4,6.5,Math.PI/2,11,1.5);
 entrance('recovery',4,-13,Math.PI/2,8,-2.5);
 entrance('football',5,3.2,Math.PI/2,18,2.2);
 entrance('changing',-11,14,0,14,1.2);
 entrance('lounge',8,14,0,22,-7.3);
 // Low transverse screens separate the strength/functional districts without making corridors dark.
 for(const [x,z,w] of [[-11,0,14],[-11,12.7,14],[12.2,13,14]]){box(w,1.10,.10,x,.60,z,black);box(w,.025,.12,x,1.16,z,goldMetal);}
 const props=new THREE.Group();props.name='interactive-equipment';root.add(props);
 const handProps=[];
 for(let i=0;i<2;i++){
  const dumbbell=new THREE.Group();dumbbell.visible=false;props.add(dumbbell);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,.32,16),steel);handle.rotation.z=Math.PI/2;dumbbell.add(handle);
  for(const x of [-.19,.19]){const plate=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.11,24),black);plate.rotation.z=Math.PI/2;plate.position.x=x;dumbbell.add(plate);}handProps.push(dumbbell);
 }
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.045,.036,.19,20),goldMetal);cup.visible=false;props.add(cup);
 let active=null,lastTime=0,started=0;const grips=[null,null];
 const originals=new Map();
 function remember(object){if(object&&!originals.has(object))originals.set(object,{position:object.position.clone(),rotation:object.rotation.clone()});return object;}
 const ball=remember(root.getObjectByName('size-5-football'));
 const ropeMeshes=[root.getObjectByName('battle-rope--1'),root.getObjectByName('battle-rope-1')];
 const ropeVertices=ropeMeshes.map(o=>o?Float32Array.from(o.geometry.attributes.position.array):null);
 // Sled components were collected before static instancing, so they can travel together.
 const sled=remember(root.getObjectByName('interactive-sled'));
 function reset(){active=null;grips.fill(null);handProps.forEach(p=>p.visible=false);cup.visible=false;for(const [o,v] of originals){o.position.copy(v.position);o.rotation.copy(v.rotation);}ropeMeshes.forEach((o,i)=>{if(o){o.geometry.attributes.position.array.set(ropeVertices[i]);o.geometry.attributes.position.needsUpdate=true;}});}
 function start(name){reset();active=name;started=lastTime;if(name==='pitch'&&ball)ball.position.set(6.1,.16,-.5);}
 function updateActors(positions,delta,reducedMotion){
  for(const door of doors){door.target=positions.some(p=>Math.hypot(p.x-door.centre.x,p.z-door.centre.z)<2.1)?1:0;door.openness=reducedMotion?door.target:THREE.MathUtils.damp(door.openness,door.target,8,delta);for(const {leaf,side} of door.leaves)leaf.position.x=leaf.userData.baseX??leaf.position.x;for(const {leaf,side} of door.leaves){if(leaf.userData.baseX==null)leaf.userData.baseX=leaf.position.x;leaf.position.x=leaf.userData.baseX+side*.99*door.openness;}}
 }
 function poseEquipment(bones){
  const left=bones?.leftHand?.bone,right=bones?.rightHand?.bone;
  if(active==='strength')handProps.forEach((p,i)=>{const hand=i?right:left;p.visible=!!hand;if(hand){hand.getWorldPosition(p.position);hand.getWorldQuaternion(p.quaternion);}});
  if(active==='functional'){[left,right].forEach((hand,i)=>{grips[i]=hand?root.getObjectByName('zone-functional').worldToLocal(hand.getWorldPosition(new THREE.Vector3())):null;});}
  if(active==='hydration'){cup.visible=!!right;if(right){right.getWorldPosition(cup.position);cup.quaternion.identity();}}
 }
 function animate(time,reducedMotion){lastTime=time;const t=reducedMotion?0:time-started;
  if(active==='functional')ropeMeshes.forEach((o,j)=>{if(!o)return;const pos=o.geometry.attributes.position,base=ropeVertices[j];for(let i=0;i<pos.count;i++){const z=base[i*3+2],f=THREE.MathUtils.clamp((z-2.45)/4.5,0,1);const grip=grips[j],endX=-3.7+(j?1:-1)*.24;pos.array[i*3]=base[i*3]+(grip?grip.x-endX:0)*f;pos.array[i*3+2]=base[i*3+2]+(grip?grip.z-6.95:0)*f;pos.array[i*3+1]=base[i*3+1]+f*(grip?grip.y-.075:.65)+Math.sin(f*Math.PI)*.17*Math.sin(f*16-t*8+j*Math.PI);}pos.needsUpdate=true;});
  if(active==='pitch'&&ball){const phase=t%5;ball.position.set(6.1,.16+Math.sin(Math.min(phase/1.8,1)*Math.PI)*.30,-.5-Math.min(phase/1.8,1)*4.4);ball.rotation.x=-t*6;}
  if(active==='sled'&&sled)sled.position.z=-Math.min(t,3)*.52;
 }
 return {start,reset,animate,poseEquipment,updateActors,get active(){return active;},doors};
}
