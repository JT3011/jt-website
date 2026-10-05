import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Metre-scale facility with shared, locally generated surface textures. No player data is stored here.
export function buildFacility(world){
 const group=new THREE.Group();world.add(group);
 const mat=(color,roughness=.6,metalness=.25)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 // Seeded microdetail stays stable between visits and does not require remote textures.
 let seed=41;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 function surface(kind,repeat=1){
  const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d');
  c.fillStyle=kind==='wood'?'#ab8058':kind==='turf'?'#315f35':kind==='rubber'?'#282d30':'#737b7c';c.fillRect(0,0,512,512);
  for(let i=0;i<18000;i++){
   const v=Math.floor(random()*95+65);c.fillStyle=kind==='turf'?`rgba(${30+v/4},${70+v/2},${22+v/5},.45)`:`rgba(${v},${v},${v},${kind==='wood'?.09:.18})`;
   c.fillRect(random()*512,random()*512,kind==='wood'?1:random()*2+.4,kind==='wood'?40+random()*150:kind==='turf'?3+random()*9:random()*2+.4);
  }
  if(kind==='wood'){for(let i=0;i<16;i++){c.fillStyle='#422c1920';c.fillRect(i*32,0,1,512);}}
  const texture=new THREE.CanvasTexture(cv);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
 }
 const concreteTex=surface('concrete',4),rubberTex=surface('rubber',2),woodTex=surface('wood'),turfTex=surface('turf',5);
 const steel=mat(0x596069,.3,.86),rubber=mat(0x65696d,.94,.02),wood=mat(0xffffff,.65,.02),white=mat(0xdde1de,.35,.25),turf=mat(0xffffff,.98,0),blue=mat(0x225879,.4,.4);
 Object.assign(rubber,{map:rubberTex,bumpMap:rubberTex,bumpScale:.012});Object.assign(wood,{map:woodTex,bumpMap:woodTex,bumpScale:.012});Object.assign(turf,{map:turfTex,bumpMap:turfTex,bumpScale:.038});
 const concrete=mat(0x939b9d,.65,.07);Object.assign(concrete,{map:concreteTex,bumpMap:concreteTex,bumpScale:.025});
 const upholstery=mat(0x343b40,.78,.02);Object.assign(upholstery,{map:rubberTex,bumpMap:rubberTex,bumpScale:.004});
 const glow=new THREE.MeshBasicMaterial({color:0xfff4df});
 const geometries=new Map();
 function box(w,h,d,x,y,z,m=steel){const radius=Math.min(.06,Math.min(w,h,d)*.18),key=[w,h,d].join(',');let geometry=geometries.get(key);if(!geometry){geometry=new RoundedBoxGeometry(w,h,d,2,radius);geometries.set(key,geometry);}const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 function cylinder(r,length,x,y,z,m=steel,axis='y',r2=r){const key=['c',r,r2,length].join(',');let geometry=geometries.get(key);if(!geometry){geometry=new THREE.CylinderGeometry(r,r2,length,48);geometries.set(key,geometry);}const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);if(axis==='x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 function tube(points,r,material=steel){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,8,false),material);mesh.castShadow=true;group.add(mesh);return mesh;}
 function ring(r,t,x,y,z,material=steel,axis='y'){const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,48),material);mesh.position.set(x,y,z);if(axis==='y')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.y=Math.PI/2;group.add(mesh);return mesh;}
 function label(text,x,y,z,width=2,color='#dbc181'){const cv=document.createElement('canvas');cv.width=768;cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#101921';ctx.fillRect(0,0,768,128);ctx.fillStyle=color;ctx.font='600 34px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,76);const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(width,width/6),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));p.position.set(x,y,z);group.add(p);return p;}
 // Clear-span facility shell and illuminated structural roof beams.
 box(19,.12,18,.7,-.045,1,concrete);
 box(19,7,.2,.7,3.5,-6.5,concrete);
 for(const x of [-8.6,10])box(.15,7,17,x,3.5,1,mat(0x18222b,.7,.25));
 for(let z=-6;z<=7;z+=2){box(18,.14,.18,.7,6.8,z,steel);box(15,.022,.045,.7,6.71,z,glow);}
 for(let x=-8;x<10;x+=1.6)box(.035,6.5,.07,x,3.3,-6.34,steel);
 const light=new THREE.HemisphereLight(0xe3ecf2,0x3b3530,.8);group.add(light);
 label('JT  /  HIGH PERFORMANCE CENTRE',.7,6,-6.28,7);
 // Strength zone: three-tier dumbbell rack, free weights, bench and loaded barbell.
 box(5.1,.045,4.3,-5.25,.01,-3.6,rubber);
 label('01  /  STRENGTH',-5.5,4.5,-6.25,3);
 for(const x of [-7.1,-3.5])box(.1,1.8,.8,x,.9,-5.3,steel);
 function dumbbell(x,y,z,size=.16){cylinder(.025,.34,x,y,z,steel,'x');for(const sign of [-1,1]){cylinder(size,.13,x+sign*.22,y,z,rubber,'x');cylinder(size*.65,.009,x+sign*.29,y,z,steel,'x');ring(size*.9,.012,x+sign*.285,y,z,rubber,'x');}}
 for(let row=0;row<3;row++){box(3.8,.06,.5,-5.3,.42+row*.52,-5.25,steel);for(let i=0;i<7;i++)dumbbell(-6.8+i*.5,.60+row*.52,-5.18,.13+row*.02);}
 box(.7,.15,1.8,-5.25,.65,-2.9,upholstery);for(const z of [-3.5,-2.3])box(.6,.6,.12,-5.25,.3,z,steel);
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
 for(let i=0;i<2;i++){const ball=new THREE.Mesh(new THREE.SphereGeometry(.11,32,24),white);ball.position.set(5.3+i*.45,.17,5.5);group.add(ball);for(let k=0;k<3;k++){const seam=ring(.1105,.0015,ball.position.x,ball.position.y,ball.position.z,rubber,'z');seam.rotation.set(k*.9,k*.7,0);}}
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
 cylinder(.69,.75,4.25,.43,-4.7,steel);cylinder(.61,.035,4.25,.785,-4.7,waterBag);ring(.645,.045,4.25,.815,-4.7,white);for(let i=0;i<3;i++)ring(.16+i*.12,.002,4.25,.808,-4.7,waterBag);for(let i=0;i<6;i++)box(.12,.065,.11,4+Math.sin(i*2)*.35,.85,-4.7+Math.cos(i*2)*.35,mat(0xc1e9ec,.1,0));label('COLD PLUNGE',4.25,1.3,-5.2,1.6,'#91c9e8');
 const chair=box(.9,1.1,.18,2.4,1.05,-4.85,upholstery);chair.rotation.x=-.22;box(.9,.16,.8,2.4,.6,-4.35,upholstery);box(.85,.12,.8,2.4,.40,-3.6,upholstery);
 for(const x of [2.16,2.63]){cylinder(.14,.78,x,.59,-3.75,rubber,'z');box(.23,.14,.30,x,.52,-3.27,rubber);for(let j=0;j<4;j++)box(.28,.016,.025,x,.735,-4+j*.18,steel);}
 box(.24,.32,.3,3.0,.23,-3.6,white);label('COMPRESSION',2.45,1.95,-5.1,1.65,'#91c9e8');
 // Architectural detail: baseboards, panel seams, tall glazing and ceiling services.
 box(18.6,.12,.07,.7,.07,-6.34,steel);
 for(let x=-8.2;x<9.5;x+=1.2)box(.015,.008,17.5,x,.019,1,steel);
 for(let z=-6;z<10;z+=1.2)box(18.6,.008,.015,.7,.019,z,steel);
 const glazing=new THREE.MeshPhysicalMaterial({color:0xb7d0d7,metalness:.35,roughness:.16,transparent:true,opacity:.38});
 const daylight=new THREE.MeshStandardMaterial({color:0xb8d3df,emissive:0x9bbacb,emissiveIntensity:.7,roughness:.6});
 for(let z=-4;z<8;z+=3){box(.04,3.7,2.65,-8.48,3.5,z,daylight);box(.025,3.6,2.55,-8.44,3.5,z,glazing);box(.05,3.7,.04,-8.40,3.5,z,steel);box(.05,.04,2.65,-8.4,3.5,z,steel);}
 for(const x of [-5.2,5.6]){cylinder(.19,13,x,6.35,.5,steel,'z');for(let z=-5;z<7;z+=1.4)ring(.195,.015,x,6.35,z,white,'z');}
 // Real light sources under the ceiling fixtures; one shared facility shadow map.
 const overhead=new THREE.SpotLight(0xfff1dc,340,30,Math.PI*.43,.8,2);overhead.position.set(-2,6.5,1);overhead.target.position.set(0,0,-1);overhead.castShadow=true;overhead.shadow.mapSize.set(1024,1024);overhead.shadow.bias=-.0003;overhead.shadow.normalBias=.025;group.add(overhead,overhead.target);
 const daylightFill=new THREE.PointLight(0xc9e5f4,90,20,2);daylightFill.position.set(-7.5,4,1);group.add(daylightFill);
 // Machine construction: rack feet, crossmembers, bolts, plate hubs and bench piping.
 for(const x of [-6.4,-4.1]){box(.55,.07,.9,x,.08,-3.6,steel);for(let y=.35;y<1.6;y+=.18)cylinder(.016,.12,x,y,-3.59,rubber,'z');box(.12,.07,.25,x,1.6,-3.53,white);}
 box(2.4,.09,.09,-5.25,.22,-3.95,steel);
 for(const sign of [-1,1]){cylinder(.09,.3,-5.25+sign*1.03,1.65,-3.6,white,'x');for(let i=0;i<3;i++)ring(.26,.01,-5.25+sign*(1.075+i*.1),1.65,-3.6,steel,'x');}
 for(const x of [-5.56,-4.94])tube([[x,.71,-3.72],[x,.73,-2.9],[x,.71,-2.08]],.006,white);
 // Kettlebells, medicine balls and stacked exercise mats bring scale and everyday use.
 for(let i=0;i<3;i++){const x=-7.2+i*.48;const bell=new THREE.Mesh(new THREE.SphereGeometry(.15+i*.015,24,16),rubber);bell.position.set(x,.2,-1.65);bell.scale.y=.9;group.add(bell);ring(.105,.025,x,.39,-1.65,steel,'z');}
 for(let i=0;i<3;i++){const ball=new THREE.Mesh(new THREE.SphereGeometry(.16,24,16),i%2?rubber:blue);ball.position.set(-7.4+i*.4,.21,-.8);group.add(ball);}
 for(let i=0;i<5;i++)box(.7,.04,1.7,-7.45,.05+i*.045,.7,upholstery);
 // Goal side supports, mesh depth and hurdle feet replace floating outlines.
 for(const x of [gx-1,gx+1]){tube([[x,.08,gz-.55],[x,.08,gz],[x,1.5,gz],[x,1.45,gz-.55]],.025,white);for(let i=0;i<8;i++)tube([[x,.1+i*.19,gz],[x,.1+i*.19,gz-.5]],.002,white);}
 for(let i=0;i<3;i++)for(const x of [6.2,7.2])box(.05,.03,.38,x,.085,2+i*1.1,hurdleMat);
 // Sauna benches and heater, slatted bath surround, towel shelf and plumbed sink.
 for(let i=0;i<9;i++)box(2.15,.025,.045,7.05,.68,-5.8+i*.06,wood);
 box(.38,.6,.4,6.0,.35,-4.5,steel);for(let i=0;i<5;i++){const stone=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),rubber);stone.position.set(5.92+(i%2)*.13,.68,-4.6+Math.floor(i/2)*.085);group.add(stone);}
 for(let i=0;i<32;i++){const angle=i*Math.PI/16;const slat=box(.065,.67,.035,4.25+Math.sin(angle)*.69,.43,-4.7+Math.cos(angle)*.69,wood);slat.rotation.y=angle;}
 for(const x of [1.9,2.9]){box(.10,.38,.75,x,.64,-4.35,upholstery);cylinder(.025,.55,x,.3,-4.5,steel);}
 tube([[2.2,.5,-3.3],[2.55,.25,-3.1],[3,.19,-3.4],[3,.35,-3.6]],.014,rubber);
 box(.8,.05,.4,3.15,1.15,-5.9,wood);for(let i=0;i<3;i++)box(.5,.08,.32,3.15,1.22+i*.08,-5.9,white);
 box(.48,.025,.39,-1.48,1.085,-5.65,steel);tube([[-1.48,1.07,-5.85],[-1.48,1.38,-5.85],[-1.48,1.41,-5.65],[-1.48,1.3,-5.65]],.024,white);
 // Transparent glass division around the recovery area with slim metal framing.
 box(6.3,2.9,.018,5.25,1.47,-2.75,new THREE.MeshPhysicalMaterial({color:0xc7dce1,transparent:true,opacity:.06,roughness:.12,metalness:.12,depthWrite:false}));
 for(const x of [2.1,8.4])box(.035,2.9,.04,x,1.47,-2.75,steel);
 box(6.35,.035,.045,5.25,2.92,-2.75,steel);
 // Actual world-space holograms, behind the athlete with normal depth testing.
 const names=[['training','TRAINING','#dbc181'],['nutrition','NUTRITION','#9bd89b'],['mindset','MINDSET','#c1a5ff'],['recovery','RECOVERY','#91c9e8'],['challenges','CHALLENGES','#64e4ed'],['journal','JOURNAL','#ee92b2'],['matchday','MATCHDAY','#f59e7b'],['progress','PROGRESS','#639bff']];
 const screens=new Map();
 names.forEach(([id,name,color],i)=>{
  const cv=document.createElement('canvas');cv.width=640;cv.height=256;const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.86,depthWrite:false,depthTest:true,toneMapped:false,side:THREE.DoubleSide});
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.85,.74),material);panel.scale.setScalar(.5);panel.position.set(.7+(i%2?1.12:-1.12),1.9-Math.floor(i/2)*.46,-.8);panel.rotation.y=i%2?-.1:.1;group.add(panel);
  screens.set(id,{cv,texture,name,color});
 });
 function update({id,value,state,basis}){const screen=screens.get(id);if(!screen)return;const {cv,texture,name,color}=screen,ctx=cv.getContext('2d');ctx.clearRect(0,0,640,256);ctx.fillStyle='rgba(9,25,37,.78)';ctx.fillRect(0,0,640,256);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(2,2,636,252);ctx.fillStyle=color;ctx.font='600 30px sans-serif';ctx.fillText(name,28,49);ctx.fillStyle='#f2f7fa';ctx.font='500 60px sans-serif';ctx.fillText(value==null?'—':`${value}%`,28,123);ctx.fillStyle='#ffffff20';ctx.fillRect(28,145,584,6);ctx.fillStyle=color;ctx.fillRect(28,145,584*(value??0)/100,6);ctx.font='22px sans-serif';ctx.fillStyle='#c5d6df';ctx.fillText(basis||'Saved player progress',28,192);ctx.font='18px sans-serif';ctx.fillStyle=color;ctx.fillText(state||'Not logged',28,227);texture.needsUpdate=true;}
 names.forEach(([id])=>update({id,value:null}));
 return {update};
}
