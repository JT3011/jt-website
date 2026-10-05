// Run with Three.js 0.180.0 installed: node tests/facility-animation.mjs
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {rig,gait,ropePose,seatedPose,createFacilityTour} from '../performance-hub-tour.js';
const loader=new GLTFLoader();loader.register(()=>({name:'test-textures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));const bytes=readFileSync(new URL('../models/jt-athlete-animated.glb',import.meta.url));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const holder=new THREE.Group(),world=new THREE.Group();world.add(holder);holder.add(gltf.scene);let bones=rig(gltf.scene);
function measure(root){world.updateMatrixWorld(true);root.updateMatrixWorld(true);const box=new THREE.Box3();root.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return box;}
holder.scale.setScalar(2.15/measure(gltf.scene).getSize(new THREE.Vector3()).y);holder.position.y=.172-measure(gltf.scene).min.y;const homeY=holder.position.y;
const hand=(side)=>bones[side+'Hand'].bone.getWorldPosition(new THREE.Vector3());
gait(bones,Math.PI/14,true,holder);const l1=hand('left'),r1=hand('right');gait(bones,Math.PI*3/14,true,holder);const l2=hand('left'),r2=hand('right');assert((l2.z-l1.z)*(r2.z-r1.z)<0);assert(Math.abs(l2.z-l1.z)>.3);console.log('Walking arms alternate forward/back',l2.z-l1.z,r2.z-r1.z);
gait(bones,0,false,holder);ropePose(bones,Math.PI/12,holder);const a=hand('left'),b=hand('right');gait(bones,0,false,holder);ropePose(bones,Math.PI/4,holder);const c=hand('left'),d=hand('right');assert((a.y-c.y)*(b.y-d.y)<0);assert(Math.abs(a.y-c.y)>.45);console.log('Rope hands alternate vertically',a.y-c.y,b.y-d.y);
const seats={compression:[8.4,.76,-13.35],iceBath:[10.25,.46,-13.7],sauna:[13.05,.68,-14.55]};
for(const [name,pos] of Object.entries(seats)){holder.position.set(pos[0],homeY-.152,pos[2]+1.3);gait(bones,0,false,holder);const standing=holder.position.clone();seatedPose(bones,holder,name,1,standing);const hip=bones.hips.bone.getWorldPosition(new THREE.Vector3());assert(hip.distanceTo(new THREE.Vector3(...pos))<1e-6);const bounds=measure(gltf.scene);assert(bounds.min.y>-.1);if(name==='sauna')assert(bounds.max.y<2.02);if(name==='iceBath'){for(const side of ['left','right']){const foot=bones[side+'Foot'].bone.getWorldPosition(new THREE.Vector3());assert(Math.hypot(foot.x-pos[0],foot.z-pos[2])<.45);}}
 console.log(name,'hips aligned; body heights',bounds.min.y,bounds.max.y);
}
holder.position.set(.7,homeY,0);const controls={target:new THREE.Vector3()},camera=new THREE.PerspectiveCamera(),tour=createFacilityTour({world,holder,camera,controls,measure,onReset(){},announce(){}});tour.setupPlayer(gltf.scene,homeY);
for(const name of ['compression','iceBath','sauna']){tour.visitRecovery(name);for(let i=0;i<2400;i++)tour.update(.025,i*.025,false);assert.equal(tour.activity,name);const hip=gltf.scene.getObjectByName('Hips').getWorldPosition(new THREE.Vector3());assert(hip.distanceTo(new THREE.Vector3(...seats[name]))<.001);}
tour.select('athlete');for(let i=0;i<2000;i++)tour.update(.025,i*.025,false);assert(!tour.active);
for(let i=0;i<12;i++)tour.addAmbient(gltf.scene);assert.equal(tour.crowdCount,10);console.log('Recovery travel, seated-to-seated transitions, return and hard crowd cap passed.');
