import * as THREE from 'three';
// Lightweight purpose-built equipment; materials/geometries shared within each zone.
export function buildFacility(world){
 const group=new THREE.Group();world.add(group);
 const mat=(color,roughness=.6,metalness=.25)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const steel=mat(0x303b46,.28,.85),rubber=mat(0x11171c,.92,.1),wood=mat(0x99704b,.8,.05),white=mat(0xc8d5d9,.5,.35),turf=mat(0x244f40,.96,.02),blue=mat(0x225879,.4,.4);
 const glow=new THREE.MeshBasicMaterial({color:0xddebf2});
 function box(w,h,d,x,y,z,m=steel){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 function cylinder(r,length,x,y,z,m=steel,axis='y',r2=r){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r2,length,16),m);mesh.position.set(x,y,z);if(axis==='x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;mesh.castShadow=true;group.add(mesh);return mesh;}
 function label(text,x,y,z,width=2,color='#dbc181'){const cv=document.createElement('canvas');cv.width=768;cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#101921';ctx.fillRect(0,0,768,128);ctx.fillStyle=color;ctx.font='600 34px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,76);const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(width,width/6),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));p.position.set(x,y,z);group.add(p);return p;}
 // Clear-span facility shell and illuminated structural roof beams.
 box(19,.12,18,.7,-.10,1,mat(0x192127,.78,.3));
 box(19,7,.2,.7,3.5,-6.5,mat(0x26313a,.85,.15));
 for(const x of [-8.6,10])box(.15,7,17,x,3.5,1,mat(0x18222b,.7,.25));
 for(let z=-6;z<=7;z+=2){box(18,.14,.18,.7,6.8,z,steel);box(15,.022,.045,.7,6.71,z,glow);}
 for(let x=-8;x<10;x+=1.6)box(.035,6.5,.07,x,3.3,-6.34,steel);
 const light=new THREE.HemisphereLight(0xd8ecff,0x172329,1.35);group.add(light);
 label('JT  /  HIGH PERFORMANCE CENTRE',.7,6,-6.28,7);
 // Strength zone: three-tier dumbbell rack, free weights, bench and loaded barbell.
 box(5.1,.045,4.3,-5.25,.01,-3.6,rubber);
 label('01  /  STRENGTH',-5.5,4.5,-6.25,3);
 for(const x of [-7.1,-3.5])box(.1,1.8,.8,x,.9,-5.3,steel);
 function dumbbell(x,y,z,size=.16){cylinder(.035,.38,x,y,z,steel,'x');for(const sign of [-1,1])cylinder(size,.15,x+sign*.24,y,z,rubber,'x');}
 for(let row=0;row<3;row++){box(3.8,.06,.5,-5.3,.42+row*.52,-5.25,steel);for(let i=0;i<7;i++)dumbbell(-6.8+i*.5,.60+row*.52,-5.18,.13+row*.02);}
 box(.7,.15,1.8,-5.25,.65,-2.9,rubber);for(const z of [-3.5,-2.3])box(.6,.6,.12,-5.25,.3,z,steel);
 for(const x of [-6.4,-4.1])box(.10,1.8,.12,x,.9,-3.6,steel);
 cylinder(.035,3.1,-5.25,1.65,-3.6,steel,'x');for(const sign of [-1,1])for(let i=0;i<3;i++)cylinder(.30,.09,-5.25+sign*(1.03+i*.10),1.65,-3.6,rubber,'x');
 for(let i=0;i<3;i++){cylinder(.25,.12,-7.05+i*.45,.13,-2.25,rubber);}
 // Water resistance weights: translucent aqua training bags with visible handles.
 const waterBag=new THREE.MeshPhysicalMaterial({color:0x70b6cf,transparent:true,opacity:.65,roughness:.18,metalness:0});
 for(let i=0;i<3;i++){cylinder(.19,.72,-3.45,.4,-4.2+i*.58,waterBag,'x');box(.3,.035,.035,-3.45,.63,-4.2+i*.58,steel);}
 label('WATER RESISTANCE',-3.4,1.15,-5.5,1.7,'#8bcfdf');
 // Indoor astro sled lane, distance markings and weighted push sled.
 box(2.45,.035,9,-5.35,.025,3,turf);
 for(const x of [-6.5,-4.2])box(.035,.008,8.8,x,.05,3,white);
 for(let i=0;i<7;i++){box(2.2,.01,.035,-5.35,.055,-1+i*1.25,white);}
 const sx=-5.35,sz=2.5;
 for(const x of [sx-.53,sx+.53])box(.13,.13,1.5,x,.16,sz,steel);
 box(1.1,.1,.75,sx,.27,sz,steel);cylinder(.045,.85,sx,.72,sz,steel);
 for(let i=0;i<3;i++)cylinder(.32,.08,sx,.37+i*.08,sz,rubber);
 for(const x of [sx-.48,sx+.48])cylinder(.04,1.2,x,.83,sz+.4,steel);
 label('02  /  SPEED & SLED',-5.35,2.25,-1.1,2.5,'#9bd89b');
 // Right-side football turf with mini goal, hurdles, agility ladder and balls.
 box(5.4,.04,7.5,5.55,.02,3.2,turf);
 for(const x of [2.95,8.15])box(.035,.008,7.3,x,.05,3.2,white);
 for(const z of [-.4,6.85])box(5.2,.008,.035,5.55,.05,z,white);
 const gx=5.6,gz=-.25;
 for(const x of [gx-1,gx+1])cylinder(.035,1.45,x,.77,gz,white);
 cylinder(.035,2.05,gx,1.5,gz,white,'x');
 const netMat=new THREE.LineBasicMaterial({color:0xb9cccc,transparent:true,opacity:.42});
 const netPoints=[];for(let i=0;i<=10;i++){const x=gx-1+i*.2;netPoints.push(x,.08,gz-.5,x,1.5,gz-.5);}for(let i=0;i<=7;i++){const y=.08+i*.2;netPoints.push(gx-1,y,gz-.5,gx+1,y,gz-.5);}const netGeo=new THREE.BufferGeometry();netGeo.setAttribute('position',new THREE.Float32BufferAttribute(netPoints,3));group.add(new THREE.LineSegments(netGeo,netMat));
 const hurdleMat=mat(0xf1ba65,.45,.2);
 for(let i=0;i<3;i++){const z=2+i*1.1;for(const x of [6.2,7.2])box(.035,.47,.035,x,.26,z,hurdleMat);box(1.035,.035,.035,6.7,.49,z,hurdleMat);}
 for(const x of [3.7,4.45])box(.025,.013,3.7,x,.07,4.3,rubber);
 for(let i=0;i<9;i++)box(.78,.015,.045,4.08,.08,2.5+i*.45,hurdleMat);
 for(let i=0;i<2;i++){const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,1),white);ball.position.set(5.3+i*.45,.21,5.5);group.add(ball);}
 label('03  /  FOOTBALL LAB',5.5,2.2,-.6,2.6,'#dbc181');
 // Hydration station: counter, water dispenser, taps and refill bottles.
 label('HYDRATION',-1.85,3.0,-6.2,1.7,'#91c9e8');
 box(1.65,1,.7,-1.85,.5,-5.65,steel);box(1.8,.08,.8,-1.85,1.04,-5.65,white);
 cylinder(.24,.68,-2.25,1.8,-5.65,waterBag);box(.5,.5,.45,-2.25,1.28,-5.65,white);cylinder(.028,.15,-2.25,1.38,-5.38,steel,'z');
 for(let i=0;i<4;i++){cylinder(.06,.27,-1.6+i*.19,1.23,-5.5,waterBag);cylinder(.045,.025,-1.6+i*.19,1.38,-5.5,steel);}
 // Recovery suite: timber sauna, ice bath, recliner and compression boots.
 label('04  /  RECOVERY SUITE',5.7,4.6,-6.24,3.6,'#91c9e8');
 box(2.6,2.8,.14,7.05,1.4,-6.1,wood);for(const x of [5.75,8.35])box(.10,2.8,2.2,x,1.4,-5.05,wood);box(2.7,.1,2.2,7.05,2.85,-5.05,wood);
 for(let i=0;i<14;i++)box(.055,2.7,.04,5.8+i*.19,1.4,-6.0,mat(0x62452f,.9,0));
 box(2.15,.12,.55,7.05,.6,-5.55,wood);
 const saunaGlass=new THREE.MeshPhysicalMaterial({color:0xcfae78,transparent:true,opacity:.16,roughness:.2});box(2.4,2.65,.025,7.05,1.35,-3.97,saunaGlass);box(.035,.65,.08,7.6,1.25,-3.90,white);
 const saunaLight=new THREE.PointLight(0xffb56b,8,4,2);saunaLight.position.set(7,2,-5);group.add(saunaLight);label('SAUNA',7.05,3.12,-3.95,1.5,'#edc789');
 cylinder(.69,.75,4.25,.43,-4.7,white);cylinder(.60,.025,4.25,.81,-4.7,waterBag);for(let i=0;i<6;i++)box(.12,.065,.11,4+Math.sin(i*2)*.35,.85,-4.7+Math.cos(i*2)*.35,mat(0xc1e9ec,.1,0));label('COLD PLUNGE',4.25,1.3,-5.2,1.6,'#91c9e8');
 const chair=box(.9,1.1,.18,2.4,1.05,-4.85,rubber);chair.rotation.x=-.22;box(.9,.16,.8,2.4,.6,-4.35,rubber);box(.85,.12,.8,2.4,.40,-3.6,rubber);
 for(const x of [2.16,2.63]){cylinder(.14,.78,x,.59,-3.75,rubber,'z');box(.23,.14,.30,x,.52,-3.27,rubber);for(let j=0;j<4;j++)box(.28,.016,.025,x,.735,-4+j*.18,steel);}
 box(.24,.32,.3,3.0,.23,-3.6,white);label('COMPRESSION',2.45,1.95,-5.1,1.65,'#91c9e8');
 // Actual world-space holograms, behind the athlete with normal depth testing.
 const names=[['training','TRAINING','#dbc181'],['nutrition','NUTRITION','#9bd89b'],['mindset','MINDSET','#c1a5ff'],['recovery','RECOVERY','#91c9e8'],['challenges','CHALLENGES','#64e4ed'],['journal','JOURNAL','#ee92b2'],['matchday','MATCHDAY','#f59e7b'],['progress','PROGRESS','#639bff']];
 const screens=new Map();
 names.forEach(([id,name,color],i)=>{
  const cv=document.createElement('canvas');cv.width=640;cv.height=256;const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.86,depthWrite:false,depthTest:true,toneMapped:false,side:THREE.DoubleSide});
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.85,.74),material);panel.position.set(.7+(i%2?2.35:-2.35),4.7-Math.floor(i/2)*.95,-2.1);panel.rotation.y=i%2?-.1:.1;group.add(panel);
  screens.set(id,{cv,texture,name,color});
 });
 function update({id,value,state,basis}){const screen=screens.get(id);if(!screen)return;const {cv,texture,name,color}=screen,ctx=cv.getContext('2d');ctx.clearRect(0,0,640,256);ctx.fillStyle='rgba(9,25,37,.78)';ctx.fillRect(0,0,640,256);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(2,2,636,252);ctx.fillStyle=color;ctx.font='600 30px sans-serif';ctx.fillText(name,28,49);ctx.fillStyle='#f2f7fa';ctx.font='500 60px sans-serif';ctx.fillText(value==null?'—':`${value}%`,28,123);ctx.fillStyle='#ffffff20';ctx.fillRect(28,145,584,6);ctx.fillStyle=color;ctx.fillRect(28,145,584*(value??0)/100,6);ctx.font='22px sans-serif';ctx.fillStyle='#c5d6df';ctx.fillText(basis||'Saved player progress',28,192);ctx.font='18px sans-serif';ctx.fillStyle=color;ctx.fillText(state||'Not logged',28,227);texture.needsUpdate=true;}
 names.forEach(([id])=>update({id,value:null}));
 return {update};
}
