/* KBV Scene03 v16. Whole-course highlighted context, per-race data driven, official-value elevation constraints.
   Exact slope coordinates NOT supplied by JV-CS. Never imply surveyed 3D or actual race tracking.
*/
import * as THREE from './three.module.js';
const $=id=>document.getElementById(id), clamp=x=>Math.max(0,Math.min(1,x));
const lerp=(a,b,t)=>a+(b-a)*t,ease=x=>{const t=clamp(x);return t*t*(3-2*t)};
const STATES=['course','slope','formation','review'];
const DURATIONS={standard:[5,5,7,5],long:[9,8,10,11]};
const WAKU=['#f5f5f3','#141a1b','#d6393d','#3062bf','#f5cd3c','#348c4d','#f08c31','#e8a5ba'];
let packs,model=null,race=null,segments=[],duration=0,time=0,playing=false,lastFrame=null,durationMode='standard';
const renderer=new THREE.WebGLRenderer({canvas:$('sceneCanvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1600,900,false);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.27;
const scene=new THREE.Scene();scene.background=new THREE.Color('#4d845c');scene.fog=new THREE.Fog('#4d845c',80,220);
const ambient=new THREE.HemisphereLight('#e0f3d3','#28533b',1.8);scene.add(ambient);
const sun=new THREE.DirectionalLight('#ffe8b8',2.45);sun.position.set(-29,40,25);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.camera.far=250;
sun.shadow.bias=-.0008;sun.shadow.normalBias=.014;scene.add(sun);
const camera=new THREE.OrthographicCamera(-40,40,22.5,-22.5,.1,300);
function requireKnown(ok,why){if(!ok)throw Error('DATA ERROR: '+why)}
function validateRace(nextRace){
 requireKnown(typeof nextRace==='object'&&nextRace!==null,'race object missing');
 requireKnown(typeof nextRace.courseId==='string'&&typeof nextRace.raceName==='string','race identity missing');
 requireKnown(Array.isArray(nextRace.runners)&&nextRace.runners.length>0&&nextRace.runners.length<=18,'runner count outside 1..18');
 requireKnown(Array.isArray(nextRace.focusNumbers),'focusNumbers missing');
 const nums=new Set();
 for(const h of nextRace.runners){
  requireKnown(Number.isInteger(h.number)&&h.number>=1&&h.number<=18&&!nums.has(h.number),'number invalid or duplicate');
  nums.add(h.number);
  requireKnown(typeof h.name==='string'&&h.name.length>0,'horse name missing');
  requireKnown(Number.isInteger(h.waku)&&h.waku>=1&&h.waku<=8,'waku invalid');
  requireKnown(h.formation&&Number.isFinite(h.formation.progress)&&Number.isFinite(h.formation.lane)
      &&h.formation.progress>=0&&h.formation.progress<=1&&h.formation.lane>=0&&h.formation.lane<=1,'formation input missing');
 }
 requireKnown(nextRace.focusNumbers.every(n=>nums.has(n)),'focusNumbers invalid');
 const meta=packs.catalog.courses[nextRace.courseId],trace=packs.geometry.courses[nextRace.courseId],elevation=packs.elevation.courses[nextRace.courseId];
 requireKnown(meta&&trace&&elevation,'course has no verified geometry / elevation contract; refusing invented oval');
 requireKnown(trace.rotation===meta.rotation&&trace.surface===meta.surface,'course layout mismatch');
 const facts=packs.facts.courses[nextRace.courseId];
 requireKnown(facts&&facts.course?.length===2&&facts.slope?.length===2,'sequential sourced facts missing');
 requireKnown(facts.startToFirstTurnApproxMeters===trace.firstTurnMeters,'first-corner label inconsistent with trace');
 const cs=packs.cs.by_case[meta.csKey];
 requireKnown(cs&&cs.venue_code===meta.venueCode&&cs.distance_m===meta.distance&&cs.track_code===meta.trackCode,'CS course key mismatched');
 requireKnown(elevation.officialReliefMeters>0&&elevation.officialSource,'official elevation envelope missing');
 return {meta,trace,elevation,cs,facts};
}
function asTexture(turf){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
 x.fillStyle=turf?'#66915b':'#d2a674';x.fillRect(0,0,512,512);
 const noise=n=>{const x=Math.sin((n+23)*174.831)*47123.322;return x-Math.floor(x)};
 for(let i=0;i<26000;i++){
  x.globalAlpha=.035+noise(i)*.17;x.fillStyle=noise(i*11)>.51?'#f1edd4':(turf?'#174f37':'#755c38');
  x.fillRect(noise(i*7)*512,noise(i*19)*512,noise(i*23)*2+1,noise(i*17)*2+1);
 }
 x.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,12);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function material(color,props={}){return new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0,...props})}
function tube(points,radius,color,closed=false){
 const c=new THREE.CatmullRomCurve3(points,closed,'centripetal');
 return new THREE.Mesh(new THREE.TubeGeometry(c,Math.max(64,points.length*2),radius,8,closed),color);
}
function numberSprite(h,focused){
 const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d');
 x.shadowColor='#06140f';x.shadowBlur=11;
 x.fillStyle=focused?'#fbd475':'#f9f8e5';x.beginPath();x.arc(100,100,79,0,Math.PI*2);x.fill();
 x.shadowBlur=0;x.fillStyle=WAKU[h.waku-1];x.beginPath();x.arc(100,100,67,0,Math.PI*2);x.fill();
 const dark=[1,5,7,8].includes(h.waku);x.fillStyle=dark?'#172b23':'#ffffff';
 x.font='900 91px Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(h.number),100,105);
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;
 const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false}));
 spr.renderOrder=40;return spr;
}
function normalizedProfile(trace,contract){
 const base=trace.grade.map(([t,z])=>[t,z]);
 const min=Math.min(...base.map(p=>p[1])),max=Math.max(...base.map(p=>p[1]));
 requireKnown(max>min,'elevation range zero');
 // Normalize overall published relief only. Per-point sampled locations remain approximate.
 const factor=contract.officialReliefMeters/(max-min);
 const norm=base.map(([t,z])=>[t,+(z*factor).toFixed(7)]);
 if(contract.profileInput==='nakayama_home_anchored'){
  // JRA: final climb begins 180m before post, ends 70m before post, +2.2m rise.
  const lap=trace.lapMeters;
  requireKnown(lap>contract.officialClimbBeginsBeforeFinishMeters,'invalid racecourse lap');
  const start=1-contract.officialClimbBeginsBeforeFinishMeters/lap;
  const end=1-contract.officialClimbEndsBeforeFinishMeters/lap;
  // Preserve diagram-derived profile before the official climbing section,
  // then use the published two-distance anchor. Never infer intermediate survey heights.
  const keep=norm.filter(p=>p[0]<start);
  const v=[...keep,[start,-contract.officialHomeStraightRiseMeters],[end,0],[1,0]];
  const relief=Math.max(...v.map(p=>p[1]))-Math.min(...v.map(p=>p[1]));
  requireKnown(Math.abs(relief-contract.officialReliefMeters)<.02,'anchored Nakayama relief mismatch');
  return v;
 }
 requireKnown(contract.profileInput==='use_trace_normalized','unknown elevation input type');
 return norm;
}
function createModel(nextRace,known){
 const {meta,trace,elevation,cs,facts}=known;
 const rawCurve=new THREE.CatmullRomCurve3(trace.center.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
 const roadWidth=1.8, worldPerMeter=roadWidth/trace.widthMeters, xyScale=worldPerMeter*trace.lapMeters/rawCurve.getLength();
 requireKnown(xyScale>.001&&xyScale<2,'unexpected course scale');
 const knots=trace.center.map(([x,z])=>new THREE.Vector3((x-270)*xyScale,0,(z-178)*xyScale));
 const path=new THREE.CatmullRomCurve3(knots,true,'centripetal');
 const profile=normalizedProfile(trace,elevation);
 const hAt=f=>{
  const k=((f%1)+1)%1;
  for(let i=1;i<profile.length;i++)if(k<=profile[i][0]){
   const a=profile[i-1],b=profile[i];return lerp(a[1],b[1],(k-a[0])/(b[0]-a[0]));
  }return profile.at(-1)[1];
 };
 const pts=f=>path.getPointAt(((f%1)+1)%1);
 const sign=knots.reduce((sum,p,i)=>{const q=knots[(i+1)%knots.length];return sum+p.x*q.z-q.x*p.z},0)>=0?1:-1;
 const norm=f=>{const v=path.getTangentAt(((f%1)+1)%1);return new THREE.Vector3(-v.z,0,v.x).normalize().multiplyScalar(sign)};
 const minH=Math.min(...profile.map(p=>p[1]));
 const at=(f,lane)=>pts(f).addScaledVector(norm(f),(.5-lane)*roadWidth).setY(.31+(hAt(f)-minH)*worldPerMeter);
 function nearest(xy){const test=new THREE.Vector3((xy[0]-270)*xyScale,0,(xy[1]-178)*xyScale);
  let best={t:0,dist:Infinity};for(let i=0;i<1100;i++){const t=i/1100,dist=test.distanceToSquared(pts(t));if(dist<best.dist)best={t,dist}}return best.t;
 }
 const startF=nearest(trace.start),cornerF=nearest(trace.firstCorner),goalF=nearest(trace.goal);
 const distanceToCorner=(cornerF-startF+1)%1;
 requireKnown(distanceToCorner>.05&&distanceToCorner<.6,'start/first corner orientation invalid');
 const route=u=>(startF+distanceToCorner*clamp(u))%1;
 const world=new THREE.Group();scene.add(world);
 const turf=meta.surface==='turf';
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(250,250),material('#356a4e'));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.11;ground.receiveShadow=true;world.add(ground);
 const N=400,pos=[],uv=[],idx=[];
 for(let i=0;i<=N;i++){
  const f=i/N,p=pts(f),n=norm(f),h=at(f,.5).y;
  for(const side of [-.5,.5]){pos.push(p.x+n.x*side*roadWidth,h,p.z+n.z*side*roadWidth);uv.push(side+.5,i/24)}
  if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(idx);geometry.computeVertexNormals();
 const surface=new THREE.Mesh(geometry,material(turf?'#d9efb5':'#efd4ad',{map:asTexture(turf),side:THREE.DoubleSide,roughness:1}));
 surface.receiveShadow=true;world.add(surface);
 // Small edge walls reveal contour without inventing off-track terrain elevations.
 for(const lane of [0,1]){
  const wallPos=[],wallIdx=[];
  for(let i=0;i<=N;i++){
   const f=i/N,p=at(f,lane);wallPos.push(p.x,p.y-.025,p.z,p.x,p.y-.18,p.z);
   if(i<N){const k=i*2;wallIdx.push(k,k+2,k+1,k+1,k+2,k+3)}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(wallPos,3));geo.setIndex(wallIdx);geo.computeVertexNormals();
  world.add(new THREE.Mesh(geo,material(turf?'#49673b':'#a67e57',{side:THREE.DoubleSide})));
  const white=material('#faf8e6');
  const rail=tube(Array.from({length:180},(_,i)=>at(i/180,lane).add(new THREE.Vector3(0,.075,0))),.017,white,true);
  rail.castShadow=true;world.add(rail);
  const postGeo=new THREE.CylinderGeometry(.015,.019,.085,6);
  for(let i=0;i<92;i++){const p=at(i/92,lane);
   const pole=new THREE.Mesh(postGeo,white);pole.position.set(p.x,p.y+.038,p.z);world.add(pole)}
 }
 // Wide, filled overlay ribbon: highlight one relevant part WITHOUT hiding the entire track.
 // It is a graphic explanation of approximate positions, not GPS geometry.
 const createCorridor=(from,delta,color)=>{
  requireKnown(Number.isFinite(from)&&delta>0&&delta<1,'invalid highlighted corridor');
  const coords=[],index=[],count=150;
  for(let i=0;i<=count;i++){
   const f=(from+delta*i/count)%1;
   for(const lane of [.17,.83]){
    const point=at(f,lane);point.y+=.063;
    coords.push(point.x,point.y,point.z);
   }
   if(i<count){const k=i*2;index.push(k,k+1,k+2,k+1,k+3,k+2)}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  g.setIndex(index);g.computeVertexNormals();
  const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.94,
   depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(g,m);mesh.renderOrder=15;mesh.visible=false;world.add(mesh);
  return mesh;
 };
 const fromStartToCorner=(cornerF-startF+1)%1;
 const startCorridor=createCorridor(startF,fromStartToCorner,'#ffe48a');
 const straightRatio=facts.straightMeters/trace.lapMeters;
 requireKnown(straightRatio>0&&straightRatio<.6,'invalid straight segment');
 const straightFrom=(goalF-straightRatio+1)%1;
 const straightCorridor=createCorridor(straightFrom,straightRatio,'#ff9349');
 const straightMid=(straightFrom+straightRatio*.5)%1;
 const slopeCorridor=createCorridor(elevation.cueStart,elevation.cueEnd-elevation.cueStart,'#ff9349');
 const afterSlopeLength=(meta.surface==='dirt'?200:110)/trace.lapMeters;
 const afterSlopeCorridor=createCorridor(elevation.cueEnd,afterSlopeLength,'#ffe48a');
 const spark=new THREE.Mesh(new THREE.SphereGeometry(.21,14,12),new THREE.MeshBasicMaterial({color:'#fff3bc'}));world.add(spark);
 const dots=new THREE.Group();world.add(dots);
 const horses=nextRace.runners.map(h=>{
  const marker=numberSprite(h,nextRace.focusNumbers.includes(h.number));dots.add(marker);return {h,marker};
 });
 const bounds=new THREE.Box3().setFromPoints(Array.from({length:90},(_,i)=>at(i/90,.5)));
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const cueMid=lerp(elevation.cueStart,elevation.cueEnd,.5);
 return {world,trace,meta,cs,facts,elevation,profile,hAt,at,route,norm,pts,center,size,cueMid,spark,slopeCorridor,afterSlopeCorridor,startCorridor,straightCorridor,startF,cornerF,straightMid,straightFrom,straightRatio,dots,horses,
  metrics:{officialReliefMeters:elevation.officialReliefMeters,derivedReliefMeters:Math.max(...profile.map(p=>p[1]))-Math.min(...profile.map(p=>p[1])),worldPerMeter:worldPerMeter,approximate:true}};
}
function discard(old){if(!old)return;scene.remove(old.world);old.world.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material)for(const x of [].concat(obj.material)){if(x.map)x.map.dispose();x.dispose()}})}
function timeline(nextRace){
 const values=nextRace.scene03?.segmentSeconds||DURATIONS[durationMode];
 requireKnown(Array.isArray(values)&&values.length===4&&values.every(v=>Number.isFinite(v)&&v>0),'invalid segment seconds');
 return values.slice();
}
function installFocusLabels(){
 const parent=$('focusOverlay');parent.replaceChildren();
 for(const entry of model.horses.filter(({h})=>race.focusNumbers.includes(h.number))){
  const {h}=entry;
  const dot=document.createElement('div');dot.className='focusNumber';dot.textContent=String(h.number);
  dot.style.setProperty('--waku',WAKU[h.waku-1]);
  dot.style.setProperty('--text',[1,5,7,8].includes(h.waku)?'#142b20':'#ffffff');
  const line=document.createElement('div');line.className='focusLine';
  parent.append(line,dot);entry.overlay={dot,line};
 }
}
function paintFocusLabels(show){
 const entries=model.horses.filter(x=>x.overlay);
 for(const entry of entries){entry.overlay.dot.style.display=show?'flex':'none';entry.overlay.line.style.display=show?'block':'none'}
 if(!show)return;
 const placed=[];
 for(const entry of entries.sort((a,b)=>a.marker.position.x-b.marker.position.x)){
  const p=entry.marker.position.clone().project(camera);
  const x=(p.x*.5+.5)*1600,y=(-p.y*.5+.5)*900;
  const radius=42;
  const opts=[];
  for(const dy of [-94,-120,88,-164])for(const dx of [0,-80,80,-155,155,230,-230]){
   const cx=Math.max(50,Math.min(1550,x+dx)),cy=Math.max(125,Math.min(647,y+dy));
   const tooClose=placed.reduce((s,q)=>s+Math.max(0,92-Math.hypot(cx-q.x,cy-q.y))*25,0);
   opts.push({cx,cy,cost:tooClose+Math.hypot(cx-x,cy-y)*.40});
  }
  opts.sort((a,b)=>a.cost-b.cost);
  const {cx,cy}=opts[0];placed.push({x:cx,y:cy});
  const badge=entry.overlay.dot,connector=entry.overlay.line;
  badge.style.left=(cx-radius)+'px';badge.style.top=(cy-radius)+'px';
  const dist=Math.hypot(cx-x,cy-y),angle=Math.atan2(cy-y,cx-x);
  connector.style.left=x+'px';connector.style.top=y+'px';
  connector.style.width=Math.max(0,dist-radius+9)+'px';
  connector.style.transform='rotate('+angle+'rad)';
 }
}
function setTimeline(){
 segments=timeline(race);duration=segments.reduce((a,b)=>a+b,0);
 requireKnown(duration>0&&duration<=180,'duration out of demo bounds');
}
function load(nextRace){
 const known=validateRace(nextRace),fresh=createModel(nextRace,known);
 pause();discard(model);model=fresh;race=nextRace;
 installFocusLabels();setTimeline();$('courseTag').textContent=model.meta.venue+'  '+model.meta.surfaceLabel+model.meta.distance+'m';
 $('testStatus').textContent=nextRace.raceName+' / '+nextRace.runners.length+'頭 / 試作表示・正式予想連携なし';
 setTime(0);
}
function segmentAt(t){
 let acc=0;for(let i=0;i<4;i++){
  const end=acc+segments[i];if(t<end||i===3)return {index:i,start:acc,seconds:segments[i],elapsed:Math.max(0,t-acc)};
  acc=end;
 }throw Error('unreachable');
}
function aim(target,shotHeight,lowAngle=false){
 const aspect=1600/900;
 camera.left=-shotHeight*aspect/2;camera.right=shotHeight*aspect/2;
 camera.top=shotHeight/2;camera.bottom=-shotHeight/2;camera.near=.1;camera.far=300;camera.updateProjectionMatrix();
 const yaw=new THREE.Vector3(0.45,0,1.6).normalize();
 // The slope view uses a lower pitch but does not exaggerate vertical coordinates.
 const tall=lowAngle?.68:2;
 camera.position.copy(target).add(new THREE.Vector3(yaw.x*shotHeight,tall*shotHeight,yaw.z*shotHeight));
 camera.lookAt(target);
}
function placeMapCue(index,storyPage,m){
 const cue=$('mapCue'),tag=$('mapCueLabel');
 if(index>1){cue.style.display='none';return}
 const label=index===0?(storyPage===0?'スタート':'最後の直線'):
  (storyPage===1&&m.meta.surface==='dirt'?'坂のあと':'上り坂');
 const f=index===0?(storyPage===0?m.startF:m.straightMid):
  (storyPage===1&&m.meta.surface==='dirt'?(m.elevation.cueEnd+100/m.trace.lapMeters)%1:m.cueMid);
 const position=m.at(f,.5);position.y+=.32;
 const projected=position.project(camera);
 const x=(projected.x*.5+.5)*1600,y=(-projected.y*.5+.5)*900;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<70||x>1530||y<140||y>710){
  cue.style.display='none';return;
 }
 cue.style.display='block';cue.style.left=Math.max(120,Math.min(1480,x))+'px';
 cue.style.top=Math.max(195,Math.min(684,y-20))+'px';
 tag.textContent=label;
}
function update(timeSeconds){
 const {index,elapsed,seconds}=segmentAt(timeSeconds);
 const m=model;
 const current=STATES[index],stageT=clamp(elapsed/seconds);
 // Designed motion windows stay bounded as narration segment length grows.
 const approachElapsed=Math.min(elapsed,Math.min(2.2,seconds*.75));
 const cue=clamp(approachElapsed/Math.min(2.2,seconds*.75));
 const storyPage=stageT<.5?0:1;
 m.spark.visible=index<=1;
 m.startCorridor.visible=index===0&&storyPage===0;
 m.straightCorridor.visible=index===0&&storyPage===1;
 m.slopeCorridor.visible=index===1&&(storyPage===0||m.meta.surface!=='dirt');
 m.afterSlopeCorridor.visible=index===1&&storyPage===1&&m.meta.surface==='dirt';
 const cueF=lerp(m.elevation.cueStart,m.elevation.cueEnd,ease(cue));
 if(index<=1){
   const local=(stageT% .5)*2;
   const targetF=index===0?
     (storyPage===0?lerp(m.startF,m.startF+((m.cornerF-m.startF+1)%1),ease(local*.85))%1:
      (m.straightFrom+m.straightRatio*ease(local*.85))%1):
      (storyPage===1&&m.meta.surface==='dirt'?
       (m.elevation.cueEnd+(200/m.trace.lapMeters)*ease(local*.85))%1:
       lerp(m.elevation.cueStart,m.elevation.cueEnd,ease(local*.85)));
   const marker=m.at(targetF,.5);m.spark.position.set(marker.x,marker.y+.26,marker.z);
 }
 m.dots.visible=index>=2;
 const motionLength=Math.min(6.0,segments[2]*.78);
 const move=index===2?ease(elapsed/motionLength):index===3?1:0;
 const gateOrder=race.runners.map(h=>h.number).sort((a,b)=>a-b);
 for(const {h,marker} of m.horses){
  const order=gateOrder.indexOf(h.number);
  const lane=lerp(order/Math.max(1,gateOrder.length-1),h.formation.lane,ease((move-.08)/.78));
  const routePos=lerp(.03,.9-.72*h.formation.progress,move);
  const p=m.at(m.route(routePos),lane);
  marker.position.set(p.x,p.y+.22,p.z);
  const focusOn=index===3&&storyPage===1;
  marker.visible=!(focusOn&&race.focusNumbers.includes(h.number));
  marker.material.opacity=focusOn&&!race.focusNumbers.includes(h.number)?.68:1;
  marker.scale.setScalar(race.runners.length>=16?.87:.96);
  if(race.focusNumbers.includes(h.number))marker.scale.multiplyScalar(1.12);
 }
 // Wide introduction / focused slope / bounded-follow then settled freeze.
 const wideH=Math.max(m.size.z*2.25,m.size.x/(1600/900)*1.75,30);
 const focus=m.at(m.cueMid,.5);
 const between=m.at(m.route(.50),.5);
 // Course description and slope description MUST share the same full-course view.
 // Cropped straight-only shots removed: a viewer can always locate the highlighted site.
 if(index<=1){
  aim(m.center,wideH,false);
  // Lift the whole course clear of the explanation card without cropping it.
  camera.position.addScaledVector(new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),-wideH*.1);
 }
 if(index===2){const z=ease(elapsed/Math.min(2.5,segments[2]*.4));
  aim(m.center.clone().lerp(between,z),lerp(wideH,Math.max(15,wideH*.46),z),false)}
 if(index===3)aim(between,Math.max(15,wideH*.46),false);
 const narratives=[
  m.facts.course[storyPage],
  m.facts.slope[storyPage],
  storyPage===0?
   {id:'gate',kicker:'隊列の組み立て',headline:'ゲートから隊列へ',detail:'各馬が想定位置へ移動'}:
   {id:'settle',kicker:'想定隊列の形成',headline:'前後の位置が決まる',detail:'前後・内外の関係を確認'},
  storyPage===0?
   {id:'all-horses',kicker:'隊列の全体像',headline:'全頭の位置を確認',detail:'まず前後・内外を見る'}:
   {id:'focus-horses',kicker:'注目馬を確認',headline:'注目馬はどこ？',detail:'馬番 '+race.focusNumbers.join('・')+' を強調'}
 ];
 const item=narratives[index];
 $('infoStep').textContent=item.kicker;
 $('message').textContent=item.headline;$('subMessage').textContent=item.detail;
 $('seek').value=Math.round(timeSeconds/duration*1000);
 renderer.render(scene,camera);
 paintFocusLabels(index===3&&storyPage===1);
 placeMapCue(index,storyPage,m);
}
function setTime(input){
 requireKnown(Number.isFinite(input),'non-finite playback time');
 time=Math.max(0,Math.min(duration,input));if(model)update(time);
}
function pause(){playing=false;lastFrame=null;$('playBtn').textContent='▶ 再生'}
function tick(now){
 if(playing){if(lastFrame!==null){const dt=Math.min(.12,(now-lastFrame)/1000);setTime(time+dt);
  if(time>=duration)pause();}lastFrame=now}
 requestAnimationFrame(tick);
}
function state(){
 const chunk=model&&segmentAt(time);
 return {raceId:race?.id,courseId:race?.courseId,runnerCount:race?.runners.length,
  segment:chunk?STATES[chunk.index]:null,segmentElapsed:chunk?.elapsed,sceneSeconds:duration,time,
  elevation:model?.metrics,courseSource:model?.elevation.officialSource,
  positions:model?.horses.map(({h,marker})=>({number:h.number,
   x:+marker.position.x.toFixed(5),y:+marker.position.y.toFixed(5),z:+marker.position.z.toFixed(5)})),
  infoPage:chunk? (chunk.elapsed/chunk.seconds<.5?0:1):null,
  cameraViewHeight:camera.top-camera.bottom,
  cameraPosition:[camera.position.x,camera.position.y,camera.position.z].map(v=>+v.toFixed(4)),
  activeCorridors:model?['startCorridor','straightCorridor','slopeCorridor','afterSlopeCorridor'].filter(k=>model[k].visible):[],
  narrative: {heading:$('message').textContent,detail:$('subMessage').textContent},
  visibleUI:{main:!!$('message').textContent,caption:!!$('subMessage').textContent,
   noSidePanel:!document.querySelector('aside'),noPersistentGraph:!document.querySelector('svg')},
  provenance:'CS_SUMMARY_PLUS_APPROX_DIAGRAM_AND_OFFICIAL_ELEVATION_CONSTRAINTS',formalRaceData:false
 };
}
function getSegmentStarts(){let t=0;return segments.map(x=>{const start=t;t+=x;return start})}
$('playBtn').addEventListener('click',()=>{if(playing)return pause();if(time>=duration)setTime(0);playing=true;$('playBtn').textContent='❚❚ 一時停止'});
$('seek').addEventListener('input',e=>{pause();setTime(Number(e.target.value)/1000*duration)});
document.querySelectorAll('[data-phase]').forEach(button=>button.addEventListener('click',()=>{
 pause();const at=STATES.indexOf(button.dataset.phase);if(at<0)throw Error('Unknown phase');
 setTime(getSegmentStarts()[at]+.15);
}));
$('durationSelect').addEventListener('change',e=>{pause();durationMode=e.target.value;setTimeline();setTime(0)});
$('raceSelect').addEventListener('change',e=>load(packs.races.races[e.target.value]));
$('upload').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;pause();
 try{const item=JSON.parse(await file.text());load(item.race||item)}
 catch(err){$('testStatus').textContent=err.message;alert(err.message)}
});
async function boot(){
 const files=['sample_races.json','course_geometry.json','course_catalog.json','db_cs_snapshot.json','elevation_contract.json','explainer_facts.json'];
 const result=await Promise.all(files.map(async f=>{const r=await fetch(f);if(!r.ok)throw Error('DATA ERROR: missing '+f);return r.json()}));
 const [races,geometry,catalog,cs,elevation,facts]=result;packs={races,geometry,catalog,cs,elevation,facts};
 for(const [key,value]of Object.entries(races.races)){const opt=document.createElement('option');opt.value=key;opt.textContent=value.raceName;$('raceSelect').append(opt)}
 requireKnown(races.races.tokyo,'Tokyo display sample missing');
 window.KBV_SCENE03_V16={setTime,loadRace:load,changeDuration:v=>{requireKnown(DURATIONS[v],'unknown duration mode');durationMode=v;setTimeline();setTime(0)},
  state,getSegmentStarts,getProfile:()=>model?.profile.map(p=>p.slice()),getElevationCue:()=>({...model?.elevation})};
 load(races.races.tokyo);requestAnimationFrame(tick);
}
boot().catch(err=>{console.error(err);$('testStatus').textContent=err.message;$('message').textContent='データを確認してください'});
