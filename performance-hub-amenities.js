import * as THREE from 'three';

export function buildAmenities({root,box,cylinder,tube,ring,label,wood,rubber,steel,white,goldMetal,glow}){
 const black=new THREE.MeshStandardMaterial({color:0x101315,roughness:.68,metalness:.15});
 const linen=new THREE.MeshStandardMaterial({color:0x17191a,roughness:1});
 const stone=new THREE.MeshPhysicalMaterial({color:0x44494a,roughness:.33,metalness:.08,clearcoat:.35});
 const mirror=new THREE.MeshStandardMaterial({color:0x98a7aa,roughness:.06,metalness:1});
 const logo=new THREE.TextureLoader().load('/images/logo.jpeg');logo.colorSpace=THREE.SRGBColorSpace;
 const logoMat=new THREE.MeshBasicMaterial({map:logo,color:0xdbc181,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 function badge(x,y,z,size=.2,flat=false){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),logoMat);mesh.position.set(x,y,z);if(flat)mesh.rotation.x=-Math.PI/2;mesh.name='JT-embroidered-logo';root.add(mesh);return mesh;}
 function towels(x,y,z,count=3){for(let i=0;i<count;i++){const t=cylinder(.075,.36,x+i*.18,y+.075,z,linen,'z');t.name='JT-rolled-towel';cylinder(.077,.07,x+i*.18,y+.075,z+.06,goldMetal,'z');badge(x+i*.18,y+.08,z+.185,.095);}}
 function folded(x,y,z){for(let i=0;i<3;i++){box(.40,.035,.27,x,y+.035*i,z,linen);box(.405,.009,.04,x,y+.021+i*.035,z+.085,goldMetal);}badge(x,y+.095,z,.19,true);}
 function plant(x,z){cylinder(.27,.52,x,.3,z,black);for(let i=0;i<9;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),new THREE.MeshStandardMaterial({color:0x244b36,roughness:.9}));leaf.scale.set(.6,3.5,1);leaf.position.set(x+Math.sin(i*2.4)*.19,.95+Math.sin(i)*.13,z+Math.cos(i*2.4)*.19);leaf.rotation.z=Math.sin(i)*.5;root.add(leaf);}}

 // A consistent district plan within the existing 42 x 44 metre shell.
 // Football 14x18; strength 14x15; functional/sled 14x11; recovery 15x8;
 // changing 14x9; reception/lounge 22x9. Remaining floor is circulation and the central hub.
 const district=(w,d,x,z,m=stone)=>{const floor=box(w,.018,d,x,.028,z,m);floor.name='district-floor';return floor;};
 district(14,9,-11,18.5);district(22,9,8,18.5);
 for(const [w,x,z] of [[14,-11,14],[22,8,14],[14,-11,-1],[15,11.5,-9]])box(w,.006,.025,x,.041,z,goldMetal);
 // Legible floor lettering replaces more floating signs at eye level.
 const floorLabel=(text,x,z,w)=>{const sign=label(text,x,.052,z,w);sign.rotation.x=-Math.PI/2;return sign;};
 floorLabel('STRENGTH',-11,-.8,4);floorLabel('FUNCTIONAL + SPEED',-11,12,5);floorLabel('FOOTBALL',12,12.4,4);floorLabel('RECOVERY',11.5,-8.7,4);
 floorLabel('CHANGING SUITES',-11,13.8,4);floorLabel('RECEPTION + LOUNGE',8,13.8,5);

 // Reception: fluted black desk, gold reveal, welcome display and original JT logo.
 const desk=box(4.4,1.05,1.25,1, .57,19.5,black);desk.name='reception-desk';
 box(4.55,.08,1.36,1,1.14,19.5,stone);box(4.45,.025,1.3,1,.10,19.5,glow);
 for(let x=-1.12;x<3.2;x+=.14)box(.045,.9,.035,x,.58,20.145,wood);
 badge(1,.66,18.86,.70).rotation.y=Math.PI;box(.60,.38,.06,.2,1.45,19.1,black);box(.3,.035,.25,.2,1.18,19.1,steel);
 box(.30,.035,.22,2,1.2,19.8,black);label('WELCOME TO JT',1,1.45,21.9,4.5).rotation.y=Math.PI;
 box(5,3.5,.12,1,1.75,22,black);badge(1,2.45,21.91,1.1).rotation.y=Math.PI;
 // Towel concierge and a return hamper keep kit out of the walkways.
 box(1.8,1.5,.5,-2,.8,20.7,wood);for(const y of [.35,.8,1.25]){box(1.72,.04,.48,-2,y,20.7,black);towels(-2.55,y+.03,20.72,6);}
 box(.55,.8,.55,3.65,.44,20.2,black);label('TOWELS',3.65,.8,20.49,.48);
 // Lounge seating, low tables and a replenishment counter.
 for(const x of [7.2,11.2,15.2]){box(2.5,.42,.9,x,.35,19.8,black);box(2.5,.7,.18,x,.81,20.23,black);for(const xx of [x-1.2,x+1.2])box(.16,.55,.9,xx,.59,19.8,black);badge(x,.85,20.335,.24);}
 for(const x of [9.2,13.2]){box(1.1,.06,.65,x,.48,18.1,stone);for(const xx of [x-.45,x+.45])cylinder(.025,.40,xx,.25,18.1,goldMetal);}
 box(7,.92,.65,12,.5,22,black);box(7.1,.07,.76,12,1,22,stone);
 for(let i=0;i<10;i++)cylinder(.035,.18,9.5+i*.25,1.13,22,white);folded(15,1.08,22);
 plant(5,21.8);plant(19.6,23);plant(-18,14.5);

 // Private changing suite: lockers, seating, vanities, wet cubicles and WC rooms.
 box(14,2.6,.10,-11,1.35,23,black);box(.10,2.6,9,-18,1.35,18.5,black);
 for(let i=0;i<10;i++){const x=-17.2+i*.65;box(.60,2.1,.5,x,1.12,22.62,wood);box(.58,2.02,.04,x,1.13,22.34,black);box(.045,.14,.02,x+.19,1.10,22.305,goldMetal);box(.07,.045,.02,x+.18,1.34,22.30,steel);label(String(i+1).padStart(2,'0'),x,1.83,22.305,.27).rotation.y=Math.PI;box(.055,.025,.015,x+.18,.86,22.30,glow);}
 for(const x of [-15.8,-12.8]){box(2.3,.12,.55,x,.49,20.7,wood);for(const xx of [x-.9,x+.9])box(.08,.42,.42,xx,.25,20.7,steel);folded(x,.59,20.7);}
 // Vanity with illuminated mirrors, wash bowls, taps, toiletries and hair dryers.
 box(6,.82,.6,-13.8,.46,15.0,black);box(6.1,.08,.7,-13.8,.91,15,stone);
 for(const x of [-15.7,-13.8,-11.9]){
  box(1.05,1.15,.055,x,1.8,14.68,goldMetal);box(.99,1.09,.018,x,1.8,14.715,mirror);
  cylinder(.21,.09,x,.99,15.05,white);cylinder(.155,.008,x,1.04,15.05,black);tube([[x,.97,14.84],[x,1.24,14.84],[x,1.26,15.03],[x,1.17,15.03]],.013,goldMetal);
  cylinder(.035,.13,x+.3,1.06,15.15,white);box(.07,.025,.06,x+.3,1.14,15.15,goldMetal);
  cylinder(.045,.18,x-.32,1.06,15.15,black,'x');box(.035,.10,.04,x-.3,1.0,15.15,black);
 }
 // Three private showers with rain heads, niche shelves and matte privacy screens.
 for(let i=0;i<3;i++){const x=-8.9+i*1.5;box(1.42,.06,1.65,x,.08,21.9,stone);for(const xx of [x-.72,x+.72])box(.06,2.25,1.65,xx,1.18,21.9,black);box(1.35,2.2,.045,x,1.15,21.06,wood);box(.028,.45,.03,x+.40,1.17,21.025,goldMetal);tube([[x,1.2,22.6],[x,2.15,22.6],[x,2.2,22.15]],.018,goldMetal);cylinder(.14,.025,x,2.2,22.15,goldMetal);box(.36,.045,.13,x,1.23,22.60,stone);cylinder(.032,.13,x,1.33,22.54,white);}
 // Two WC rooms; the fittings are modelled behind privacy doors.
 for(let i=0;i<2;i++){const x=-8.4+i*2;for(const xx of [x-.9,x+.9])box(.06,2.3,2.3,xx,1.2,17.5,black);box(1.75,2.3,.05,x,1.2,16.35,wood);box(.03,.16,.025,x+.55,1.15,16.31,goldMetal);box(.48,.7,.22,x,.53,18.45,white);const bowl=new THREE.Mesh(new THREE.SphereGeometry(.29,20,14),new THREE.MeshStandardMaterial({color:0xf3f2e9,roughness:.3}));bowl.scale.set(1,.58,1.2);bowl.position.set(x,.37,18.1);root.add(bowl);ring(.23,.04,x,.55,18.1,white);}
 label('PRIVATE CHANGING',-11,2.8,14.5,4).rotation.y=Math.PI;towels(-10.3,.12,15.1,3);

 // The strength district uses its footprint for two functional racks, with open working bays.
 for(const x of [-15.3,-6.3]){
  for(const dx of [-.62,.62])for(const z of [-12.8,-11.5]){box(.08,2.5,.08,x+dx,1.29,z,steel);box(.34,.07,.42,x+dx,.08,z,steel);for(let i=0;i<8;i++)cylinder(.009,.085,x+dx,.7+i*.18,z,white,'z');}
  for(const z of [-12.8,-11.5])cylinder(.025,1.32,x,2.56,z,goldMetal,'x');
  for(const dx of [-.62,.62])box(.06,.06,1.4,x+dx,2.53,-12.15,steel);
  cylinder(.025,2.05,x,1.43,-11.47,white,'x');for(const sign of [-1,1])for(let i=0;i<2;i++)cylinder(.20,.055,x+sign*(.77+i*.065),1.43,-11.47,rubber,'x');
  box(.45,.1,1.1,x,.58,-10.55,black);for(const z of [-10.9,-10.2])box(.36,.48,.06,x,.3,z,steel);
  for(const dx of [-.24,.24]){tube([[x+dx,2.5,-12.75],[x+dx,.9,-12.75]],.015,rubber);ring(.08,.013,x+dx,.84,-12.75,goldMetal,'z');}
  badge(x,2.40,-11.44,.20);
 }
 // A compact rowing station fills the front bay without obstructing the main aisle.
 box(.12,.12,2.6,-15.3,.22,-4.1,steel);box(.40,.07,.35,-15.3,.4,-3.8,black);cylinder(.27,.24,-15.3,.42,-5.35,black,'x');
 for(const x of [-15.49,-15.11]){box(.16,.22,.28,x,.30,-4.8,black);box(.06,.10,.65,x,.09,-3.1,steel);}
 tube([[-15.3,.52,-5.2],[-15.3,.54,-4.55]],.008,steel);cylinder(.022,.42,-15.3,.54,-4.55,rubber,'x');box(.24,.16,.035,-15.3,.85,-5.1,black);badge(-15.3,.85,-5.075,.13);
 // Recovery towels and treatment couch: no glass screen in front of this zone.
 box(1.5,1.3,.4,18,.7,-15,wood);for(const y of [.25,.65,1.05]){box(1.4,.03,.4,18,y,-15,black);towels(17.55,y+.03,-14.98,5);}
 box(.8,.14,1.95,16.4,.8,-13.2,black);for(const z of [-13.9,-12.5])box(.6,.72,.10,16.4,.39,z,steel);folded(16.4,.94,-12.5);
 // Nutrition bar alongside the lounge: shakes, smoothies, fruit and chilled water.
 const glass=new THREE.MeshPhysicalMaterial({color:0xe1f7fa,transparent:true,opacity:.35,roughness:.15,depthWrite:false});
 label('NUTRITION  /  SHAKE + SMOOTHIE BAR',12,2.15,22.3,5).rotation.y=Math.PI;
 for(let i=0;i<5;i++){
  const x=9.1+i*.45,drink=new THREE.MeshStandardMaterial({color:[0xb88754,0xec7696,0x84b85c,0xe6a846,0xc9aa87][i],roughness:.48});
  cylinder(.085,.24,x,1.17,21.9,glass);cylinder(.071,.19,x,1.15,21.9,drink);cylinder(.010,.31,x+.015,1.30,21.9,goldMetal);
 }
 for(const x of [12,12.55]){box(.28,.17,.30,x,1.12,22,black);cylinder(.11,.29,x,1.34,22,glass);cylinder(.12,.035,x,1.50,22,black);}
 // Protein shaker display, labelled tubs and fruit bowls.
 for(const x of [13.25,13.55,13.85]){cylinder(.07,.22,x,1.19,21.9,black);cylinder(.073,.025,x,1.31,21.9,goldMetal);badge(x,1.19,21.82,.09).rotation.y=Math.PI;}
 label('PROTEIN',13.6,1.65,22.2,.9).rotation.y=Math.PI;
 for(let bowl=0;bowl<3;bowl++){const x=14.4+bowl*.42;cylinder(.20,.08,x,1.08,22,goldMetal);for(let i=0;i<5;i++){const fruit=new THREE.Mesh(new THREE.SphereGeometry(.065,16,12),new THREE.MeshStandardMaterial({color:[0xd79820,0x81a245,0xb43443][bowl],roughness:.55}));fruit.position.set(x+Math.sin(i*2.4)*.10,1.16+(i===4?.075:0),22+Math.cos(i*2.4)*.10);root.add(fruit);}}
 for(let i=0;i<3;i++){const banana=new THREE.Mesh(new THREE.TorusGeometry(.11,.026,8,16,Math.PI*.8),new THREE.MeshStandardMaterial({color:0xe9cd53,roughness:.65}));banana.position.set(14.1+i*.04,1.16+i*.025,21.7);banana.rotation.x=Math.PI/2;root.add(banana);}
 // Dynamic, double-sided display can be read from the lounge and circulation aisle.
 box(4.4,2.65,.14,6,2.1,16.4,black);
 const cv=document.createElement('canvas');cv.width=1280;cv.height=768;const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
 for(const side of [-1,1]){const screen=new THREE.Mesh(new THREE.PlaneGeometry(4.22,2.53),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));screen.position.set(6,2.1,16.4+side*.078);if(side<0)screen.rotation.y=Math.PI;screen.name='live-leaderboard';root.add(screen);}
 function leaderboard(data={}){
  const c=cv.getContext('2d');c.fillStyle='#081014';c.fillRect(0,0,1280,768);c.fillStyle='#dbc181';c.font='700 42px sans-serif';c.fillText('JT  /  PERFORMANCE LEADERBOARD',48,68);
  c.fillStyle='#bfcdd1';c.font='25px sans-serif';c.fillText('NIGHTLY RANKINGS  ·  00:00 UK',48,112);
  const rows=data.rows||[];
  if(!rows.length){c.fillStyle='#f5f5ec';c.font='32px sans-serif';c.fillText(data.message||'Join the board to set the pace.',48,280);}
  rows.slice(0,8).forEach((row,i)=>{const y=186+i*59;c.fillStyle=row.is_you?'#dbc181':'#edf2f3';c.font='600 30px sans-serif';c.fillText(String(row.rank).padStart(2,'0'),48,y);c.fillText(row.alias+(row.is_you?'  ·  YOU':''),140,y);c.fillText(Number(row.points).toLocaleString()+' PP',1030,y);});
  c.fillStyle='#9fb2bb';c.font='23px sans-serif';c.fillText(data.cutoff?'Points earned before '+new Date(data.cutoff).toLocaleDateString('en-GB',{timeZone:'Europe/London'}):'Open Leaderboard below to view or join.',48,715);texture.needsUpdate=true;
 }
 leaderboard();return {leaderboard};
}
