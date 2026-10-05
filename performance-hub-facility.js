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
 // Clear-span facility shell and illuminated structural roof beams.
 box(19,.12,18,.7,-.045,1,concrete);
 box(19,7,.2,.7,3.5,-6.5,concrete);
 // Open sides: no perimeter walls or glazing obstruct the facility.
 for(let z=-6;z<=7;z+=2){box(18,.14,.18,.7,5.4,z,steel);box(15,.022,.045,.7,5.31,z,glow);}
 for(let x=-8;x<10;x+=1.6)box(.035,6.5,.07,x,3.3,-6.34,steel);
 const light=new THREE.HemisphereLight(0xe3ecf2,0x3b3530,.8);group.add(light);
 // JT neon artwork provides the central branding; no overhead text heading.
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
 label('WATER RESISTANCE',-3.4,1.15,-5.5,1.7,'#dbc181');
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
 // Indoor training pitch with mow stripes and flush painted markings.
 const pitchX=6.1;box(6.8,.04,9.5,pitchX,.025,2.4,turf);
 const stripe=turf.clone();stripe.color.set(0xc4d6bb);
 for(let i=0;i<10;i+=2)box(6.78,.002,.94,pitchX,.047,-1.87+i*.95,stripe);
 const paint=mat(0xeceee3,.99,0);
 const pitchLine=(w,d,x,z)=>box(w,.004,d,x,.052,z,paint);
 for(const x of [2.85,9.35])pitchLine(.045,7.1,x,3.55);
 for(const z of [0,7.1,3.55])pitchLine(6.5,.045,pitchX,z);
 for(const z of [1.7,5.4]){pitchLine(5.5,.045,pitchX,z);for(const x of [3.35,8.85])pitchLine(.045,1.7,x,z<3?z/2:6.25);}
 function pitchArc(radius,x,z,start=0,length=Math.PI*2){const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.023,radius+.023,80,1,start,length),paint);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.056,z);group.add(mesh);}
 pitchArc(.86,pitchX,3.55);cylinder(.06,.005,pitchX,.055,3.55,paint);
 for(const z of [1.2,5.9])cylinder(.045,.005,pitchX,.055,z,paint);
 for(const [x,z,start] of [[2.85,0,Math.PI*1.5],[9.35,0,Math.PI],[2.85,7.1,0],[9.35,7.1,Math.PI/2]])pitchArc(.25,x,z,start,Math.PI/2);
 // FORZA ALU110-inspired 16 x 7 ft box goal: 110mm front frame, black rear stays.
 const gx=pitchX,gz=0,gw=4.8768,gh=2.1336,gd=1.8;
 for(const x of [gx-gw/2,gx+gw/2]){
  cylinder(.055,gh,x,.055+gh/2,gz,white);cylinder(.05,gh,x,.055+gh/2,gz-gd,steel);
  cylinder(.05,gd,x,.09,gz-gd/2,white,'z');cylinder(.025,gd,x,gh+.055,gz-gd/2,steel,'z');
  box(.10,.08,.14,x,1.5,gz-gd,steel);
 }
 cylinder(.055,gw+.11,gx,gh+.055,gz,white,'x');cylinder(.05,gw+.11,gx,.09,gz-gd,white,'x');
 // Back, roof and side meshes form a tensioned box, with the front left open.
 const netPoints=[],add=(a,b)=>netPoints.push(...a,...b),top=gh+.055,base=.09;
 for(let x=gx-gw/2;x<=gx+gw/2+.01;x+=.1){add([x,base,-gd],[x,top,-gd]);add([x,top,-gd],[x,top,0]);}
 for(let y=base;y<=top;y+=.1){add([gx-gw/2,y,-gd],[gx+gw/2,y,-gd]);for(const x of [gx-gw/2,gx+gw/2])add([x,y,-gd],[x,y,0]);}
 for(let z=-gd;z<=.01;z+=.1){add([gx-gw/2,top,z],[gx+gw/2,top,z]);for(const x of [gx-gw/2,gx+gw/2])add([x,base,z],[x,top,z]);}
 const netGeo=new THREE.BufferGeometry();netGeo.setAttribute('position',new THREE.Float32BufferAttribute(netPoints,3));const net=new THREE.LineSegments(netGeo,new THREE.LineBasicMaterial({color:0xf4f4e8,transparent:true,opacity:.85}));net.name='ALU110-box-net';group.add(net);
 const badge=label('FORZA',gx,top,.061,.55,'#ffffff');badge.material.color.set(0xffffff);
 // Agility kit lives down the touchlines, leaving the middle of the pitch clear.
 const hurdleMat=mat(0xf1ba65,.45,.2);
 for(let i=0;i<3;i++){const z=2.4+i*1.1;for(const x of [8.05,8.85]){box(.035,.35,.035,x,.23,z,hurdleMat);box(.055,.03,.38,x,.07,z,hurdleMat);}box(.835,.035,.035,8.45,.41,z,hurdleMat);}
 for(const x of [3.4,4.1])box(.025,.013,3.7,x,.065,4.3,rubber);
 for(let i=0;i<9;i++)box(.74,.015,.045,3.75,.075,2.5+i*.45,hurdleMat);
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
 label('03  /  FOOTBALL LAB',6.1,2.6,-1.85,2.6,'#dbc181');
 // Hydration station: counter, water dispenser, taps and refill bottles.
 label('HYDRATION',-1.85,3.0,-6.2,1.7,'#dbc181');
 box(1.65,1,.7,-1.85,.5,-5.65,steel);box(1.8,.08,.8,-1.85,1.04,-5.65,white);
 cylinder(.24,.68,-2.25,1.8,-5.65,waterBag);box(.5,.5,.45,-2.25,1.28,-5.65,white);cylinder(.028,.15,-2.25,1.38,-5.38,steel,'z');
 for(let i=0;i<4;i++){cylinder(.06,.27,-1.6+i*.19,1.23,-5.5,waterBag);cylinder(.045,.025,-1.6+i*.19,1.38,-5.5,steel);}
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
 cylinder(.69,.75,4.25,.43,-4.7,steel);cylinder(.61,.035,4.25,.785,-4.7,waterBag);ring(.645,.045,4.25,.815,-4.7,white);for(let i=0;i<3;i++)ring(.16+i*.12,.002,4.25,.808,-4.7,waterBag);for(let i=0;i<6;i++)box(.12,.065,.11,4+Math.sin(i*2)*.35,.85,-4.7+Math.cos(i*2)*.35,mat(0xc1e9ec,.1,0));label('COLD PLUNGE',4.25,1.3,-5.2,1.6,'#dbc181');
 const chair=box(.9,1.1,.18,2.4,1.05,-4.85,upholstery);chair.rotation.x=-.22;box(.9,.16,.8,2.4,.6,-4.35,upholstery);box(.85,.12,.8,2.4,.40,-3.6,upholstery);
 for(const x of [2.16,2.63]){cylinder(.14,.78,x,.59,-3.75,rubber,'z');box(.23,.14,.30,x,.52,-3.27,rubber);for(let j=0;j<4;j++)box(.28,.016,.025,x,.735,-4+j*.18,steel);}
 box(.24,.32,.3,3.0,.23,-3.6,white);label('COMPRESSION',2.45,1.95,-5.1,1.65,'#dbc181');
 // Architectural detail: baseboards, panel seams, tall glazing and ceiling services.
 box(18.6,.12,.07,.7,.07,-6.34,steel);
 for(let x=-8.2;x<9.5;x+=1.2)box(.015,.008,17.5,x,.019,1,steel);
 for(let z=-6;z<10;z+=1.2)box(18.6,.008,.015,.7,.019,z,steel);
 for(const x of [-5.2,5.6]){cylinder(.19,13,x,4.95,.5,steel,'z');for(let z=-5;z<7;z+=1.4)ring(.195,.015,x,4.95,z,white,'z');}
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
 // Bath surround, compression chair and hydration fittings.
 for(let i=0;i<32;i++){const angle=i*Math.PI/16;const slat=box(.065,.67,.035,4.25+Math.sin(angle)*.69,.43,-4.7+Math.cos(angle)*.69,wood);slat.rotation.y=angle;}
 for(const x of [1.9,2.9]){box(.10,.38,.75,x,.64,-4.35,upholstery);cylinder(.025,.55,x,.3,-4.5,steel);}
 tube([[2.2,.5,-3.3],[2.55,.25,-3.1],[3,.19,-3.4],[3,.35,-3.6]],.014,rubber);
 box(.8,.05,.4,3.15,1.15,-5.9,wood);for(let i=0;i<3;i++)box(.5,.08,.32,3.15,1.22+i*.08,-5.9,white);
 box(.48,.025,.39,-1.48,1.085,-5.65,steel);tube([[-1.48,1.07,-5.85],[-1.48,1.38,-5.85],[-1.48,1.41,-5.65],[-1.48,1.3,-5.65]],.024,white);
 // Transparent glass division around the recovery area with slim metal framing.
 box(6.3,2.9,.018,5.25,1.47,-2.75,new THREE.MeshPhysicalMaterial({color:0xc7dce1,transparent:true,opacity:.06,roughness:.12,metalness:.12,depthWrite:false}));
 for(const x of [2.1,8.4])box(.035,2.9,.04,x,1.47,-2.75,steel);
 box(6.35,.035,.045,5.25,2.92,-2.75,steel);
 // JT architectural accents keep the facility black/gold while turf and wood stay natural.
 for(const x of [-8.35,9.75])box(.035,.045,16,x,.22,1,goldMetal);
 box(18,.045,.035,.7,2.75,-6.25,goldMetal);
 for(const x of [-7.1,-3.5])box(.11,.035,.82,x,1.82,-5.3,goldMetal);

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
 return {update,animate};
}
