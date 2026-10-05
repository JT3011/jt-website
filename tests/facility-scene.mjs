// With Three.js 0.180.0 installed: node tests/facility-scene.mjs
import * as THREE from 'three';
import assert from 'node:assert/strict';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},clearRect(){},fillText(){},createRadialGradient(){return {addColorStop(){}}}})})};
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture()};
const {buildFacility}=await import('../performance-hub-facility.js');const world=new THREE.Group(),facility=buildFacility(world);world.updateMatrixWorld(true);
const names=['training','nutrition','mindset','recovery','challenges','journal','matchday','progress'];
for(const id of names){const p=world.getObjectByName('hologram-'+id);assert(p);assert(Math.abs(Math.hypot(p.position.x-.7,p.position.z)-2.65)<1e-6);assert(p.material.depthTest);facility.update({id,value:87,state:'Saved',basis:'Test progress'});}
facility.leaderboard({rows:[{alias:'JT Athlete Test',rank:1,points:123,is_you:true}],cutoff:new Date().toISOString()});
assert.equal(facility.interactions.doors.length,6);for(const d of facility.interactions.doors){facility.interactions.updateActors([d.centre],1,false);assert(d.openness>.9);facility.interactions.updateActors([],1,false);assert(d.openness<.01);}
for(const name of ['strength','functional','sled','pitch','hydration','recovery']){facility.interactions.start(name);facility.animate(10,false);facility.animate(12,false);facility.interactions.reset();}
let meshes=0;world.traverse(o=>{if(o.isMesh){meshes++;assert(o.position.toArray().every(Number.isFinite));}});console.log('Facility: 8 circular holograms, 6 working doors, live board and all equipment updates passed; meshes',meshes);
const {tourNodes,tourEdges,routeBetween,createFacilityTour}=await import('../performance-hub-tour.js');
for(const from of Object.keys(tourNodes))for(const to of Object.keys(tourNodes)){const route=routeBetween(from,to);assert.equal(route[0],from);assert.equal(route.at(-1),to);}
const holder=new THREE.Group();holder.position.set(.7,.172,0);world.add(holder);const camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3()},arrivals=[];
const tour=createFacilityTour({world,holder,camera,controls,measure:o=>new THREE.Box3().setFromObject(o),onReset(){},announce(){},onArrive:n=>arrivals.push(n),interactions:facility.interactions});
tour.setupPlayer(new THREE.Group(),.172);
for(const name of ['strength','functional','sled','pitch','hydration','recovery','reception','changing','leaderboard','iceBath','sauna','athlete']){tour.select(name);for(let i=0;i<2400;i++)tour.update(.025,i*.025,false);assert.equal(arrivals.at(-1),name);if(name!=='athlete'){assert(tour.use());tour.update(.1,100,false);assert(!tour.use());for(let i=0;i<60;i++)tour.update(.025,101+i*.025,false);}}
assert(!tour.active);assert(holder.position.distanceTo(new THREE.Vector3(.7,.172,0))<1e-6);
tour.select('strength');tour.update(.1,0,false);tour.select('pitch');tour.select('hydration');for(let i=0;i<4000;i++)tour.update(.025,i*.025,false);assert.equal(arrivals.at(-1),'hydration');
console.log('Navigation: all pairs reachable; 10 automatic destinations, interactions, return and rapid reselection passed.');
// Spot route clearance through the framed entrances and fixed furniture.
const obstacles=[];world.updateMatrixWorld(true);world.traverse(o=>{if(!o.isMesh||!o.visible||o.material.transparent||o.material.isMeshBasicMaterial||o.name.startsWith('hologram')||o.parent?.name==='automatic-door'||o.geometry.type==='PlaneGeometry')return;
 const collect=(matrix)=>{const b=new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position).applyMatrix4(matrix);if(b.max.y>.45&&b.min.y<1.7&&b.max.y-b.min.y>.12)obstacles.push({b,name:o.name||o.geometry.type});};
 if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);collect(o.matrixWorld.clone().multiply(m));}}else collect(o.matrixWorld);
});
const collisions=[];for(const [a,b] of tourEdges){const av=new THREE.Vector3(tourNodes[a][0],1,tourNodes[a][1]),bv=new THREE.Vector3(tourNodes[b][0],1,tourNodes[b][1]),samples=Math.ceil(av.distanceTo(bv)*5);for(let i=0;i<=samples;i++){const p=av.clone().lerp(bv,i/samples);const obs=obstacles.find(o=>p.x>o.b.min.x-.12&&p.x<o.b.max.x+.12&&p.z>o.b.min.z-.12&&p.z<o.b.max.z+.12);if(obs){collisions.push({edge:[a,b],at:p.toArray(),object:obs.name,min:obs.b.min.toArray(),max:obs.b.max.toArray()});break;}}}
assert.deepEqual(collisions,[],'Station routes must clear fixed furniture and room walls');
console.log('All routes clear room walls and equipment.');

assert.equal(facility.interactions.rooms.length,6);
for(const room of facility.interactions.rooms){const target=new THREE.Vector3((room.x0+room.x1)/2,1.5,(room.z0+room.z1)/2);for(const offset of [[40,0,0],[-40,0,0],[0,0,40],[0,0,-40],[0,20,0]]){camera.position.copy(target).add(new THREE.Vector3(...offset));facility.interactions.constrainCamera(camera,target);assert(camera.position.x>room.x0&&camera.position.x<room.x1);assert(camera.position.z>room.z0&&camera.position.z<room.z1);assert(camera.position.y<5.4);}}
console.log('Six full room bounds and all camera directions passed.');
