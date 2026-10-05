import * as THREE from 'three';
import {buildAmenities} from './performance-hub-amenities.js?v=1';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Metre-scale facility with shared, locally generated surface textures. No player data is stored here.
export function buildFacility(world){
 const root=new THREE.Group();root.name='JT-spacious-facility';world.add(root);
 let group=root;
 const zones={};
 for(const [name,x,z] of [['strength',-5,-7],['sled',-10,3],['pitch',6,1],['hydration',-1,-4],['recovery',6,-9],['functional',-5,3]]){const zone=new THREE.Group();zone.name=`zone-${name}`;zone.position.set(x,0,z);root.add(zone);zones[name]=zone;}
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
 const steel=mat(0x292b2e,.3,.86),rubber=mat(0x65696d,.94,.02),wood=mat(0xffffff,.65,.02),white=mat(0xdde1de,.35,.25),turf=mat(0xffffff,.98,0),blue=mat(0x225879,.4,.4);
 Object.assign(rubber,{map:rubberTex,bumpMap:rubberTex,bumpScale:.012});Object.assign(wood,{map:woodTex,bumpMap:woodTex,bumpScale:.012});Object.assign(turf,{map:turfTex,bumpMap:turfTex,bumpScale:.038});
 const concrete=mat(0x323638,.65,.07);Object.assign(concrete,{map:concreteTex,bumpMap:concreteTex,bumpScale:.025});
 const upholstery=mat(0x343b40,.78,.02);Object.assign(upholstery,{map:rubberTex,bumpMap:rubberTex,bumpScale:.004});
 const glow=new THREE.MeshBasicMaterial({color:0xdbc181});
 const goldMetal=mat(0xdbc181,.28,.72);
 const geometries=new Map();
 function box(w,h,d,x,y,z,m=steel){const radius=Math.min(.06,Math.min(w,h,d)*.18),key=[w,h,d].join(',');let geometry=geometries.get(key);if(!geometry){geometry=new RoundedBoxGeometry(w,h,d,2,radius);geometries.set(key,geometry);}const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 function cylinder(r,length,x,y,z,m=steel,axis='y',r2=r){const key=['c',r,r2,length].join(',');let geometry=geometries.get(key);if(!geometry){geometry=new THREE.CylinderGeometry(r,r2,length,48);geometries.set(key,geometry);}const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);if(axis==='x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 function tube(points,r,material=steel){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,8,false),material);mesh.castShadow=true;group.add(mesh);return mesh;}
 function ring(r,t,x,y,z,material=steel,axis='y'){const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,48),material);mesh.position.set(x,y,z);if(axis==='y')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.y=Math.PI/2;group.add(mesh);return mesh;}
 function label(text,x,y,z,width=2,color='#dbc181'){const cv=document.createElement('canvas');cv.width=768;cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#101921';ctx.fillRect(0,0,768,128);ctx.fillStyle=color;ctx.font='600 34px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,76);const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(width,width/6),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));p.position.set(x,y,z);group.add(p);return p;}
 // Large continuous interior. The side walls remain open; floor and ceiling extend beyond the camera envelope.
 const floor=box(42,.12,44,.7,-.045,3,concrete);floor.name='facility-floor';
 const ceiling=box(42,.12,44,.7,8,3,mat(0x12171b,.9,.1));ceiling.name='facility-ceiling';
 box(42,8,.2,.7,4,-19,concrete);
 for(let z=-16;z<=24;z+=5){box(40,.22,.20,.7,7.8,z,steel);for(const x of [-11,.7,12])box(7,.025,.08,x,7.65,z,glow);}
 for(let x=-18;x<21;x+=4)box(.045,7.6,.10,x,3.8,-18.84,steel);
 for(const x of [-18.5,19.5])for(const z of [-16,-5,7,22])box(.3,7.8,.3,x,3.9,z,steel);
 const light=new THREE.HemisphereLight(0xe3ecf2,0x3b3530,1.05);root.add(light);
 // Central feature wall keeps the avatar, neon artwork and holograms together.
 box(4.2,4.8,.16,.7,2.4,-3.38,mat(0x101315,.72,.3));
 for(const x of [-1.35,2.75])box(.025,4.65,.025,x,2.4,-3.275,goldMetal);
 // Individual room zones are translated only: all equipment dimensions are preserved.
 group=zones.strength;
 // Strength zone: three-tier dumbbell rack, free weights, bench and loaded barbell.
 box(14,.022,15,-6,.024,-1.5,rubber);
 label('01  /  STRENGTH',-5.5,4.5,-6.25,3);
 for(const x of [-7.1,-3.5])box(.1,1.8,.8,x,.9,-5.3,steel);
 function dumbbell(x,y,z,size=.16){cylinder(.025,.34,x,y,z,steel,'x');for(const sign of [-1,1]){cylinder(size,.13,x+sign*.22,y,z,rubber,'x');cylinder(size*.65,.009,x+sign*.29,y,z,steel,'x');ring(size*.9,.012,x+sign*.285,y,z,rubber,'x');}}
 for(let row=0;row<3;row++){box(3.8,.06,.5,-5.3,.42+row*.52,-5.25,steel);for(let i=0;i<7;i++)dumbbell(-6.8+i*.5,.60+row*.52,-5.18,.13+row*.02);}
 box(.7,.15,1.8,-5.25,.65,-2.9,upholstery);for(const z of [-3.5,-2.3])box(.6,.6,.12,-5.25,.3,z,steel);
 for(const x of [-6.4,-4.1])box(.10,1.8,.12,x,.9,-3.6,steel);
 cylinder(.035,3.1,-5.25,1.65,-3.6,steel,'x');for(const sign of [-1,1])for(let i=0;i<3;i++)cylinder(.30,.09,-5.25+sign*(1.03+i*.10),1.65,-3.6,rubber,'x');
 for(let i=0;i<3;i++){cylinder(.25,.12,-7.05+i*.45,.13,-2.25,rubber);}
 // FORZA transparent PVC complete bundle: tubular bag, round ball and crescent Bulgarian bag.
 const waterBag=new THREE.MeshPhysicalMaterial({color:0x76c8dc,transparent:true,opacity:.55,roughness:.16,metalness:0,depthWrite:false});
 const pvc=new THREE.MeshPhysicalMaterial({color:0xd8f5ff,transparent:true,opacity:.23,roughness:.09,metalness:.08,depthWrite:false});
 const aqua=new THREE.MeshPhysicalMaterial({color:0x25aace,transparent:true,opacity:.78,roughness:.18,metalness:0,depthWrite:false});
 const bag=cylinder(.11,.75,-3.48,.18,-4.8,pvc,'x');bag.name='FORZA-water-bag';cylinder(.096,.70,-3.48,.165,-4.8,aqua,'x');
 for(const x of [-3.71,-3.25]){tube([[x,.24,-4.86],[x,.36,-4.84],[x,.36,-4.72],[x,.24,-4.71]],.021,rubber);ring(.112,.009,x,.18,-4.8,white,'x');}
 cylinder(.024,.03,-3.12,.18,-4.8,rubber,'x');
 const waterBall=new THREE.Mesh(new THREE.SphereGeometry(.15,32,24),pvc);waterBall.position.set(-3.5,.205,-4.13);waterBall.name='FORZA-water-ball';group.add(waterBall);
 const ballWater=new THREE.Mesh(new THREE.SphereGeometry(.136,32,24),aqua);ballWater.position.copy(waterBall.position);ballWater.position.y-=.015;ballWater.scale.y=.83;group.add(ballWater);
 tube([[-3.6,.30,-4.13],[-3.6,.42,-4.13],[-3.39,.42,-4.13],[-3.39,.30,-4.13]],.02,rubber);
 const bagPath=[];for(let i=0;i<=16;i++){const a=Math.PI*.12+i/16*Math.PI*.76;bagPath.push([-3.48+Math.cos(a)*.29,.17,-3.40-Math.sin(a)*.21]);}
 const bulgarian=tube(bagPath,.10,pvc);bulgarian.name='FORZA-Bulgarian-bag';tube(bagPath,.078,aqua);
 for(const point of [bagPath[0],bagPath[bagPath.length-1]])tube([point,[point[0],.16,point[2]+.16],[point[0],.11,point[2]+.28]],.025,rubber);
 const waterBadge=label('FORZA',-3.48,.19,-4.687,.30,'#ffffff');waterBadge.name='FORZA-water-badge';
 label('WATER WEIGHTS',-3.4,1.05,-5.5,1.7,'#dbc181');
 group=zones.sled;
 // Indoor astro sled lane, distance markings and weighted push sled.
 box(2.45,.035,9,-5.35,.025,3,turf);
 for(const x of [-6.5,-4.2])box(.035,.008,8.8,x,.05,3,white);
 for(let i=0;i<=8;i++){
  const z=-1+i;box(2.2,.01,.035,-5.35,.055,z,white);
  const cv=document.createElement('canvas');cv.width=256;cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#f4f0df';ctx.font='bold 68px sans-serif';ctx.textAlign='center';ctx.fillText(`${i}m`,128,88);
  const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
  const marker=new THREE.Mesh(new THREE.PlaneGeometry(.46,.23),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));marker.rotation.x=-Math.PI/2;marker.position.set(-6.18,.063,z+.17);marker.name=`sled-distance-${i}m`;group.add(marker);
 }
 // Project the original JT artwork onto the turf; dark pixels disappear into the pile.
 const turfLogo=new THREE.TextureLoader().load('/images/logo.jpeg');turfLogo.colorSpace=THREE.SRGBColorSpace;
 const logoDecal=new THREE.Mesh(new THREE.PlaneGeometry(1.45,1.45),new THREE.MeshBasicMaterial({map:turfLogo,color:0xdbc181,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.85,polygonOffset:true,polygonOffsetFactor:-1}));logoDecal.rotation.x=-Math.PI/2;logoDecal.position.set(-5.25,.067,5.5);logoDecal.name='JT-turf-logo';group.add(logoDecal);
 const sx=-5.35,sz=2.5;
 for(const x of [sx-.53,sx+.53])box(.13,.13,1.5,x,.16,sz,steel);
 box(1.1,.1,.75,sx,.27,sz,steel);cylinder(.045,.85,sx,.72,sz,steel);
 for(let i=0;i<3;i++)cylinder(.32,.08,sx,.37+i*.08,sz,rubber);
 for(const x of [sx-.48,sx+.48])cylinder(.04,1.2,x,.83,sz+.4,steel);
 label('02  /  SPEED & SLED',-5.35,2.25,-1.1,2.5,'#dbc181');
 group=zones.pitch;
 // Indoor training pitch with mow stripes and flush painted markings.
 const pitchX=6.1;box(14,.04,18,pitchX,.025,2.2,turf);
 const stripe=turf.clone();stripe.color.set(0xc4d6bb);
 for(let i=0;i<18;i+=2)box(13.98,.002,.98,pitchX,.047,-6.3+i,stripe);
 const paint=mat(0xeceee3,.99,0);
 const pitchLine=(w,d,x,z)=>box(w,.004,d,x,.052,z,paint);
 for(const x of [-.5,12.7])pitchLine(.05,15.4,x,3);
 for(const z of [-4.7,10.7,3])pitchLine(13.2,.05,pitchX,z);
 for(const z of [-1.7,7.7]){pitchLine(8.5,.05,pitchX,z);for(const x of [1.85,10.35])pitchLine(.05,3,x,z<3?-3.2:9.2);}
 function pitchArc(radius,x,z,start=0,length=Math.PI*2){const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.025,radius+.025,80,1,start,length),paint);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.056,z);group.add(mesh);}
 pitchArc(1.65,pitchX,3);cylinder(.075,.005,pitchX,.055,3,paint);
 for(const z of [-2.6,8.6])cylinder(.06,.005,pitchX,.055,z,paint);
 for(const [x,z,start] of [[-.5,-4.7,Math.PI*1.5],[12.7,-4.7,Math.PI],[-.5,10.7,0],[12.7,10.7,Math.PI/2]])pitchArc(.35,x,z,start,Math.PI/2);
 // FORZA ALU110-inspired 16 x 7 ft box goal: 110mm front frame, black rear stays.
 const gx=pitchX,gz=-4.7,gw=4.8768,gh=2.1336,gd=1.8;
 for(const x of [gx-gw/2,gx+gw/2]){
  cylinder(.055,gh,x,.055+gh/2,gz,white);cylinder(.05,gh,x,.055+gh/2,gz-gd,steel);
  cylinder(.05,gd,x,.09,gz-gd/2,white,'z');cylinder(.025,gd,x,gh+.055,gz-gd/2,steel,'z');
  box(.10,.08,.14,x,1.5,gz-gd,steel);
 }
 cylinder(.055,gw+.11,gx,gh+.055,gz,white,'x');cylinder(.05,gw+.11,gx,.09,gz-gd,white,'x');
 // Back, roof and side meshes form a tensioned box, with the front left open.
 const netPoints=[],add=(a,b)=>netPoints.push(...a,...b),top=gh+.055,base=.09;
 for(let x=gx-gw/2;x<=gx+gw/2+.01;x+=.1){add([x,base,gz-gd],[x,top,gz-gd]);add([x,top,gz-gd],[x,top,gz]);}
 for(let y=base;y<=top;y+=.1){add([gx-gw/2,y,gz-gd],[gx+gw/2,y,gz-gd]);for(const x of [gx-gw/2,gx+gw/2])add([x,y,gz-gd],[x,y,gz]);}
 for(let z=gz-gd;z<=gz+.01;z+=.1){add([gx-gw/2,top,z],[gx+gw/2,top,z]);for(const x of [gx-gw/2,gx+gw/2])add([x,base,z],[x,top,z]);}
 const netGeo=new THREE.BufferGeometry();netGeo.setAttribute('position',new THREE.Float32BufferAttribute(netPoints,3));const net=new THREE.LineSegments(netGeo,new THREE.LineBasicMaterial({color:0xf4f4e8,transparent:true,opacity:.85}));net.name='ALU110-box-net';group.add(net);
 const badge=label('FORZA',gx,top,gz+.061,.55,'#ffffff');badge.material.color.set(0xffffff);
 // Agility kit lives down the touchlines, leaving the middle of the pitch clear.
 const hurdleMat=mat(0xf1ba65,.45,.2);
 for(let i=0;i<3;i++){const z=2.4+i*1.1;for(const x of [10.85,11.65]){box(.035,.35,.035,x,.23,z,hurdleMat);box(.055,.03,.38,x,.07,z,hurdleMat);}box(.835,.035,.035,11.25,.41,z,hurdleMat);}
 for(const x of [.2,.9])box(.025,.013,3.7,x,.065,4.3,rubber);
 for(let i=0;i<9;i++)box(.74,.015,.045, .55,.075,2.5+i*.45,hurdleMat);
 // Round size-five footballs with twelve black pentagonal panels and white hexagons.
 const ballGeo=new THREE.SphereGeometry(.11,48,32),ballWhite=mat(0xf4f2e9,.68,.01),panelBlack=mat(0x111821,.77,.01);
 const ico=new THREE.IcosahedronGeometry(1,0),directions=[];
 for(let i=0;i<ico.attributes.position.count;i++){const v=new THREE.Vector3().fromBufferAttribute(ico.attributes.position,i).normalize();if(!directions.some(p=>p.distanceTo(v)<.01))directions.push(v);}
 function football(x,z,rotation){
  const ball=new THREE.Group();ball.name='size-5-football';ball.position.set(x,.16,z);ball.rotation.set(rotation,.4+rotation,.3);group.add(ball);
  const body=new THREE.Mesh(ballGeo,ballWhite);body.castShadow=true;body.receiveShadow=true;ball.add(body);
  for(const n of directions){
   const adjacent=directions.filter(v=>v!==n).sort((a,b)=>a.distanceTo(n)-b.distanceTo(n)).slice(0,5);
   const u=new THREE.Vector3().crossVectors(n,Math.abs(n.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),v=new THREE.Vector3().crossVectors(n,u);
   const edges=adjacent.map(q=>n.clone().multiplyScalar(2).add(q).normalize()).sort((a,b)=>Math.atan2(a.dot(v),a.dot(u))-Math.atan2(b.dot(v),b.dot(u)));
   const positions=[];
   const pushTriangle=(a,b,c)=>{const N=5,point=(u,v)=>a.clone().multiplyScalar(1-u-v).addScaledVector(b,u).addScaledVector(c,v).normalize().multiplyScalar(.111);
    for(let row=0;row<N;row++)for(let col=0;col<N-row;col++){const a0=point(row/N,col/N),a1=point((row+1)/N,col/N),a2=point(row/N,(col+1)/N);positions.push(...a0.toArray(),...a1.toArray(),...a2.toArray());if(row+col<N-1){const a3=point((row+1)/N,(col+1)/N);positions.push(...a1.toArray(),...a3.toArray(),...a2.toArray());}}
   };
   for(let j=0;j<5;j++)pushTriangle(n,edges[j],edges[(j+1)%5]);
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const panel=new THREE.Mesh(geometry,panelBlack);panel.material.side=THREE.DoubleSide;ball.add(panel);
  }
  const seams=[];
  for(let i=0;i<directions.length;i++)for(let j=i+1;j<directions.length;j++)if(directions[i].distanceTo(directions[j])<1.1){const a=directions[i].clone().multiplyScalar(2).add(directions[j]).normalize(),b=directions[j].clone().multiplyScalar(2).add(directions[i]).normalize();for(let k=0;k<8;k++){seams.push(...a.clone().lerp(b,k/8).normalize().multiplyScalar(.1105).toArray(),...a.clone().lerp(b,(k+1)/8).normalize().multiplyScalar(.1105).toArray());}}
  const seamGeometry=new THREE.BufferGeometry();seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));ball.add(new THREE.LineSegments(seamGeometry,new THREE.LineBasicMaterial({color:0x697078})));
 }
 football(5.5,4.5,.5);football(6.35,5.8,1.7);football(7.2,1.1,.9);
 const coneOrange=mat(0xf27631,.78,0),coneGold=mat(0xf0cc61,.78,0);
 for(const [i,x,z] of [[0,5,2.2],[1,5.45,3.0],[2,6,3.8],[3,6.7,4.6],[4,7.3,5.4],[5,8.9,6.6]]){const m=i%2?coneGold:coneOrange;cylinder(.035,.17,x,.14,z,m,'y',.12);box(.27,.025,.27,x,.066,z,m);cylinder(.037,.004,x,.229,z,rubber);}
 label('03  /  FOOTBALL LAB',6.1,2.9,-6.6,3.2,'#dbc181');
 group=zones.hydration;
 box(3.5,.015,2.5,-1.85,.02,-5.55,rubber);
 // Hydration station: counter, water dispenser, taps and refill bottles.
 label('HYDRATION',-1.85,3.0,-6.2,1.7,'#dbc181');
 box(1.65,1,.7,-1.85,.5,-5.65,steel);box(1.8,.08,.8,-1.85,1.04,-5.65,white);
 cylinder(.24,.68,-2.25,1.8,-5.65,waterBag);box(.5,.5,.45,-2.25,1.28,-5.65,white);cylinder(.028,.15,-2.25,1.38,-5.38,steel,'z');
 for(let i=0;i<4;i++){cylinder(.06,.27,-1.6+i*.19,1.23,-5.5,waterBag);cylinder(.045,.025,-1.6+i*.19,1.38,-5.5,steel);}
 group=zones.recovery;
 box(15,.015,8,5.5,.02,-4,rubber);
 // Recovery suite: timber sauna, ice bath, recliner and compression boots.
 label('04  /  RECOVERY SUITE',5.7,4.6,-6.24,3.6,'#dbc181');
 // Polar Eclipse 3-inspired: 1.5m wide x 1.4m deep x 2m high, black shell / cedar / glass.
 const scx=7.05,scz=-5.2,front=scz+.7,back=scz-.7;
 const saunaBlack=mat(0x090d10,.36,.55),cedar=wood.clone();cedar.color.set(0xdcb78d);
 box(1.5,.09,1.4,scx,.075,scz,saunaBlack);box(1.62,.10,1.52,scx,2.02,scz,saunaBlack);
 box(1.5,1.94,.065,scx,1.02,back,saunaBlack);
 for(const x of [scx-.72,scx+.72]){box(.065,1.94,1.4,x,1.02,scz,saunaBlack);box(.015,1.8,1.28,x+(x<scx?.04:-.04),1.0,scz,cedar);}
 box(1.34,1.82,.024,scx,1.0,back+.045,cedar);
 // Cedar bench, floor slats and the infrared panels visible through the front.
 for(let i=0;i<15;i++)box(.075,.025,1.23,scx-.61+i*.087,.139,scz,cedar);
 box(1.32,.10,.44,scx,.55,scz-.35,cedar);
 const infrared=new THREE.MeshStandardMaterial({color:0x300607,emissive:0xff170b,emissiveIntensity:.7,roughness:.85});
 for(const x of [scx-.43,scx,scx+.43])box(.32,.90,.025,x,1.14,back+.075,infrared);
 for(let i=0;i<12;i++)box(1.30,.025,.035,scx,.66+i*.075,back+.10,cedar);
 for(const x of [scx-.66,scx+.66]){box(.025,.85,.40,x,1.0,scz-.15,infrared);for(let i=0;i<10;i++)box(.035,.025,.86,x+(x<scx?.022:-.022),.64+i*.082,scz-.13,cedar);}
 const saunaGlass=new THREE.MeshPhysicalMaterial({color:0xbecbd0,transparent:true,opacity:.10,roughness:.09,metalness:.12,depthWrite:false});
 for(const [offset,w] of [[-.53,.31],[0,.62],[.53,.31]])box(w,1.74,.012,scx+offset,1.02,front+.01,saunaGlass);
 for(const x of [scx-.72,scx-.35,scx+.35,scx+.72])box(.065,1.92,.085,x,1.02,front,saunaBlack);
 for(const y of [.11,1.94])box(1.5,.07,.09,scx,y,front,saunaBlack);
 box(.032,.45,.07,scx-.25,1.02,front+.06,saunaBlack);
 for(const y of [.50,1.57])box(.036,.075,.026,scx+.32,y,front+.05,white);
 for(const x of [scx-.52,scx+.52])box(.17,.67,.05,x,.59,front-.035,saunaBlack);
 box(.10,.14,.025,scx+.61,1.44,front-.04,steel);
 box(1.28,.022,.025,scx,.21,back+.08,glow);
 const redLight=new THREE.PointLight(0xff2311,4,2.5,2);redLight.position.set(scx,1.7,scz);group.add(redLight);
 const saunaLight=new THREE.PointLight(0xffb366,2,2,2);saunaLight.position.set(scx,.55,scz);group.add(saunaLight);
 label('ECLIPSE  /  INFRARED',scx,2.26,front,1.8,'#dbc181');
 // Polar Cyclone Black reference: 1m barrel, black timber staves, white liner/rim and two steps.
 const blackWood=wood.clone();blackWood.color.set(0x242729);
 const bath=new THREE.Mesh(new THREE.CylinderGeometry(.485,.485,.94,64,1,true),blackWood);bath.position.set(4.25,.53,-4.7);bath.castShadow=true;bath.receiveShadow=true;bath.name='Polar-Cyclone-black';group.add(bath);
 const liner=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.90,64,1,true),new THREE.MeshPhysicalMaterial({color:0xebeeea,roughness:.26,side:THREE.DoubleSide}));liner.position.set(4.25,.54,-4.7);group.add(liner);
 ring(.475,.025,4.25,1.015,-4.7,white);
 cylinder(.445,.008,4.25,.84,-4.7,waterBag);for(let i=0;i<3;i++)ring(.12+i*.11,.0015,4.25,.847,-4.7,waterBag);
 for(let i=0;i<40;i++){const a=i*Math.PI/20;const slat=box(.065,.93,.03,4.25+Math.sin(a)*.485,.53,-4.7+Math.cos(a)*.485,blackWood);slat.rotation.y=a;}
 box(.48,.27,.34,4.91,.19,-4.4,blackWood);box(.48,.54,.34,4.91,.325,-4.74,blackWood);
 for(const z of [-4.4,-4.74])for(let i=0;i<6;i++)box(.48,.018,.046,4.91,z<-4.5?.61:.34,z-.14+i*.055,blackWood);
 box(.07,.88,.012,4.05,.54,-4.249,white);
 const led=new THREE.PointLight(0xa6e1ef,.8,1.4,2);led.position.set(4.25,.70,-4.7);group.add(led);
 label('POLAR  /  CYCLONE',4.25,1.40,-5.2,1.5,'#dbc181');
 const chair=box(.9,1.1,.18,2.4,1.05,-4.85,upholstery);chair.rotation.x=-.22;box(.9,.16,.8,2.4,.6,-4.35,upholstery);box(.85,.12,.8,2.4,.40,-3.6,upholstery);
 for(const x of [2.16,2.63]){cylinder(.14,.78,x,.59,-3.75,rubber,'z');box(.23,.14,.30,x,.52,-3.27,rubber);for(let j=0;j<4;j++)box(.28,.016,.025,x,.735,-4+j*.18,steel);}
 box(.24,.32,.3,3.0,.23,-3.6,white);label('COMPRESSION',2.45,1.95,-5.1,1.65,'#dbc181');
 group=root;
 // Continuous floor joints give depth cues without a miniature stage edge.
 for(let x=-18;x<21;x+=3)box(.012,.004,42,x,.019,3,steel);
 for(let z=-17;z<25;z+=3)box(40,.004,.012,.7,.019,z,steel);
 const overhead=new THREE.SpotLight(0xfff1dc,430,42,Math.PI*.43,.8,2);overhead.position.set(-2,7.5,1);overhead.target.position.set(.7,0,0);overhead.castShadow=true;overhead.shadow.mapSize.set(1024,1024);overhead.shadow.bias=-.0003;overhead.shadow.normalBias=.025;root.add(overhead,overhead.target);
 for(const [x,z] of [[-11,-8],[-12,7],[12,3],[11,-13],[-3,-10],[-7,7],[-11,18],[9,19]]){const light=new THREE.PointLight(0xffedcf,100,20,2);light.position.set(x,6,z);root.add(light);}
 group=zones.strength;
 // Machine construction: rack feet, crossmembers, bolts, plate hubs and bench piping.
 for(const x of [-6.4,-4.1]){box(.55,.07,.9,x,.08,-3.6,steel);for(let y=.35;y<1.6;y+=.18)cylinder(.016,.12,x,y,-3.59,rubber,'z');box(.12,.07,.25,x,1.6,-3.53,white);}
 box(2.4,.09,.09,-5.25,.22,-3.95,steel);
 for(const sign of [-1,1]){cylinder(.09,.3,-5.25+sign*1.03,1.65,-3.6,white,'x');for(let i=0;i<3;i++)ring(.26,.01,-5.25+sign*(1.075+i*.1),1.65,-3.6,steel,'x');}
 for(const x of [-5.56,-4.94])tube([[x,.71,-3.72],[x,.73,-2.9],[x,.71,-2.08]],.006,white);
 // Kettlebells, medicine balls and stacked exercise mats bring scale and everyday use.
 for(let i=0;i<3;i++){const x=-7.2+i*.48;const bell=new THREE.Mesh(new THREE.SphereGeometry(.15+i*.015,24,16),rubber);bell.position.set(x,.2,-1.65);bell.scale.y=.9;group.add(bell);ring(.105,.025,x,.39,-1.65,steel,'z');}
 for(let i=0;i<3;i++){const ball=new THREE.Mesh(new THREE.SphereGeometry(.16,24,16),i%2?rubber:blue);ball.position.set(-7.4+i*.4,.21,-.8);group.add(ball);}
 for(let i=0;i<5;i++)box(.7,.04,1.7,-7.45,.05+i*.045,.7,upholstery);
 group=zones.recovery;
 // Bath surround, compression chair and hydration fittings.

 for(const x of [1.9,2.9]){box(.10,.38,.75,x,.64,-4.35,upholstery);cylinder(.025,.55,x,.3,-4.5,steel);}
 tube([[2.2,.5,-3.3],[2.55,.25,-3.1],[3,.19,-3.4],[3,.35,-3.6]],.014,rubber);
 box(.8,.05,.4,3.15,1.15,-5.9,wood);for(let i=0;i<3;i++)box(.5,.08,.32,3.15,1.22+i*.08,-5.9,white);
 group=zones.hydration;
 box(.48,.025,.39,-1.48,1.085,-5.65,steel);tube([[-1.48,1.07,-5.85],[-1.48,1.38,-5.85],[-1.48,1.41,-5.65],[-1.48,1.3,-5.65]],.024,white);
 group=zones.recovery;
 // Recovery is an open suite with a low timber boundary, without a glass frontage.
 for(let x=-1.8;x<13;x+=.3)box(.065,.8,.10,x,.43,.03,wood);
 // Gold threshold strips distinguish the zones while keeping the central paths clear.
 group=zones.strength;
 for(const x of [-7.1,-3.5])box(.11,.035,.82,x,1.82,-5.3,goldMetal);
 group=zones.recovery;
 box(15,.008,.035,5.5,.035,.04,goldMetal);
 // Localised heater steam; shared texture and sprites stay behind the sauna glass.
 const steamCanvas=document.createElement('canvas');steamCanvas.width=steamCanvas.height=128;
 const steamCtx=steamCanvas.getContext('2d'),gradient=steamCtx.createRadialGradient(64,64,3,64,64,62);
 gradient.addColorStop(0,'rgba(245,241,227,.55)');gradient.addColorStop(.4,'rgba(238,230,206,.22)');gradient.addColorStop(1,'rgba(238,230,206,0)');steamCtx.fillStyle=gradient;steamCtx.fillRect(0,0,128,128);
 const steamTexture=new THREE.CanvasTexture(steamCanvas),steam=[];
 for(let i=0;i<12;i++){const material=new THREE.SpriteMaterial({map:steamTexture,color:0xffeed3,transparent:true,opacity:0,depthWrite:false,depthTest:true});const puff=new THREE.Sprite(material);puff.position.set(scx,1.0,scz);group.add(puff);steam.push(puff);}
 const heaterGlow=new THREE.PointLight(0xffa14e,1.5,1.8,2);heaterGlow.position.set(scx,.8,scz);group.add(heaterGlow);
 function animate(time,reducedMotion=false){
  steam.forEach((puff,i)=>{const phase=((reducedMotion?2:time)*.13+i/steam.length)%1;const envelope=Math.sin(Math.PI*phase);puff.position.set(scx+Math.sin(phase*7+i)*.10*phase,.65+phase*1.20,scz+Math.cos(phase*5+i)*.09);puff.scale.set(.18+phase*.52,.28+phase*.65,1);puff.material.opacity=envelope*.065;puff.material.rotation=Math.sin(phase*3+i)*.2;});
  heaterGlow.intensity=reducedMotion?1.5:1.5+Math.sin(time*1.1)*.12;
 }
 animate(0);
 group=zones.functional;
 const functionalFloor=box(9,.02,11,-3,.025,3.5,rubber);functionalFloor.name='functional-floor';
 for(const x of [-7.5,1.5])box(.024,.006,11,x,.039,3.5,goldMetal);
 label('FUNCTIONAL TRAINING',-2.1,1.1,1.95,2.8,'#dbc181');
 // Two grounded ropes run from the anchor to padded handles, inside the mat boundary.
 cylinder(.06,.42,-3.7,.23,2.3,steel);ring(.09,.018,-3.7,.24,2.37,steel,'z');
 const ropeMat=mat(0x37312a,.95,0);
 for(const side of [-1,1]){const points=[];for(let i=0;i<=48;i++){const t=i/48;points.push([-3.7+side*.24+Math.sin(t*Math.PI*8)*.15,.075,2.45+t*4.5]);}const rope=tube(points,.026,ropeMat);rope.name=`battle-rope-${side}`;const end=points[points.length-1];cylinder(.032,.22,end[0],.075,end[2]+.08,rubber,'z');}
 // Skipping rope and movement mat stay clear of the rope lane.
 const skipPoints=[];for(let i=0;i<=40;i++){const t=i/40;skipPoints.push([-1.20+Math.sin(t*Math.PI*2)*.42,.065,4.8+Math.cos(t*Math.PI*2)*.55]);}
 const skipping=tube(skipPoints,.006,mat(0xd8bb78,.7,.1));skipping.name='skipping-rope';
 for(const x of [-1.32,-1.08])cylinder(.017,.16,x,.071,5.38,rubber,'z');
 box(.8,.025,1.8,-1.25,.052,3.1,upholstery);
 const plyo=box(.60,.50,.50,-1.0,.305,6.8,wood);plyo.name='plyometric-box';
 box(.16,.065,.007,-1.0,.36,7.055,rubber);label('JT',-1,.47,7.057,.3,'#dbc181');
 // Compact storage for resistance bands and a foam roller.
 cylinder(.065,.42,-.15,.13,6.9,upholstery,'z');for(let i=0;i<3;i++)ring(.10+i*.025,.006,-.15,.07,6.25,blue);
 group=root;
 buildAmenities({root,box,cylinder,tube,ring,label,wood,rubber,steel,white,goldMetal,glow});
 // Actual world-space holograms, behind the athlete with normal depth testing.
 const names=[['training','TRAINING','#dbc181'],['nutrition','NUTRITION','#9bd89b'],['mindset','MINDSET','#c1a5ff'],['recovery','RECOVERY','#91c9e8'],['challenges','CHALLENGES','#64e4ed'],['journal','JOURNAL','#ee92b2'],['matchday','MATCHDAY','#f59e7b'],['progress','PROGRESS','#639bff']];
 const screens=new Map();
 names.forEach(([id,name,color],i)=>{
  const cv=document.createElement('canvas');cv.width=640;cv.height=256;const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:1,depthWrite:false,depthTest:true,toneMapped:false,side:THREE.DoubleSide});
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.85,.74),material);panel.scale.setScalar(.60);panel.position.set(.7+(i%2?1.24:-1.24),2.04-Math.floor(i/2)*.51,-.45);panel.rotation.y=i%2?-.1:.1;panel.name=`hologram-${id}`;group.add(panel);
  const rimMaterial=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,toneMapped:false,depthWrite:false});
  for(const y of [-.36,.36]){const rim=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.008),rimMaterial);rim.position.set(0,y,.006);panel.add(rim);rim.scale.setScalar(1/.60);}
  screens.set(id,{cv,texture,name,color});
 });
 function update({id,value,state,basis}){const screen=screens.get(id);if(!screen)return;const {cv,texture,name,color}=screen,ctx=cv.getContext('2d');ctx.clearRect(0,0,640,256);ctx.fillStyle='rgba(3,10,17,.94)';ctx.fillRect(0,0,640,256);ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=18;ctx.lineWidth=5;ctx.strokeRect(4,4,632,248);ctx.shadowBlur=0;ctx.fillStyle=color;ctx.font='700 34px sans-serif';ctx.fillText(name,28,49);ctx.fillStyle='#f2f7fa';ctx.font='700 68px sans-serif';ctx.fillText(value==null?'—':`${value}%`,28,123);ctx.fillStyle='#ffffff20';ctx.fillRect(28,145,584,6);ctx.fillStyle=color;ctx.fillRect(28,145,584*(value??0)/100,6);ctx.font='22px sans-serif';ctx.fillStyle='#c5d6df';ctx.fillText(basis||'Saved player progress',28,192);ctx.font='18px sans-serif';ctx.fillStyle=color;ctx.fillText(state||'Not logged',28,227);texture.needsUpdate=true;}
 names.forEach(([id])=>update({id,value:null}));
 // Batch repeated opaque fixtures to keep the denser interior practical on phones.
 for(const parent of [root,...Object.values(zones)]){
  const batches=new Map();for(const object of [...parent.children]){if(object.type!=='Mesh'||object.name||object.children.length||Array.isArray(object.material)||object.material.transparent)continue;const key=object.geometry.uuid+object.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);}
  for(const objects of batches.values()){if(objects.length<3)continue;const batch=new THREE.InstancedMesh(objects[0].geometry,objects[0].material,objects.length);batch.name='static-fixtures';batch.castShadow=objects[0].castShadow;batch.receiveShadow=objects[0].receiveShadow;objects.forEach((object,i)=>{object.updateMatrix();batch.setMatrixAt(i,object.matrix);parent.remove(object);});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();parent.add(batch);}
 }
 return {update,animate};
}
