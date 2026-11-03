/* Scene03 v13 – reusable DATA-DRIVEN animation prototype.
   Course context: certified jv_r_CS snapshot; geometry: JRA diagram hand trace;
   race lineup: supplied race JSON. Do not confuse any of these with surveying or final PICK.
*/
import * as THREE from './three.module.js';

const DURATION = 22; // Demonstration timeline only. Not a narration-sync assumption.
const $=id=>document.getElementById(id);
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
const ui={play:$('playBtn'),seek:$('seek'),status:$('status'),raceSelect:$('raceSelect')};
let packs, context=null, currentRace=null, progress=0, playing=false,lastTimestamp=null;
const canvas=$('sceneCanvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1150,514,false);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new THREE.Scene();scene.background=new THREE.Color('#1d4635');
const ambient=new THREE.HemisphereLight(0xe2f3e9,0x214334,1.75);
const sun=new THREE.DirectionalLight(0xffeac6,3.3);sun.position.set(-13,25,21);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:1,far:90});
sun.shadow.bias=-.001;sun.shadow.normalBias=.014;
scene.add(ambient,sun);
const camera=new THREE.OrthographicCamera(-20,20,11,-11,.1,200);
const WAKU=['#f7f7f5','#171717','#d43337','#305fbe','#edc33a','#328b49','#e68a2a','#df96b7'];

function requireData(ok,message){if(!ok)throw Error('DATA ERROR: '+message)}
function validate(race){
 requireData(race&&typeof race==='object','race JSON missing');
 requireData(typeof race.courseId==='string','courseId missing');
 requireData(typeof race.raceName==='string'&&race.raceName.length>0,'raceName missing');
 requireData(Array.isArray(race.runners)&&race.runners.length>0&&race.runners.length<=18,'runner count 1..18 required');
 const nums=new Set();
 for(const h of race.runners){
  requireData(Number.isInteger(h.number)&&h.number>=1&&h.number<=18&&!nums.has(h.number),'invalid/duplicate runner number');
  nums.add(h.number);
  requireData(typeof h.name==='string'&&h.name.length>0,'horse name required');
  requireData(Number.isInteger(h.waku)&&h.waku>=1&&h.waku<=8,'waku 1..8 required');
  requireData(Number.isFinite(h.formation?.lane)&&h.formation.lane>=0&&h.formation.lane<=1,'formation.lane missing');
  requireData(Number.isFinite(h.formation?.progress)&&h.formation.progress>=0&&h.formation.progress<=1,'formation.progress missing');
 }
 requireData(Array.isArray(race.focusNumbers)&&race.focusNumbers.every(n=>nums.has(n)),'focusNumbers invalid');
 const trace=packs.geometry.courses[race.courseId];
 requireData(trace&&Array.isArray(trace.center)&&trace.center.length>10,'geometry unregistered for '+race.courseId+'; do not fake oval');
 requireData(Array.isArray(trace.grade)&&trace.grade.length>=4,'grade profile unavailable');
 const course=packs.catalog[race.courseId];
 requireData(course,'course catalog unregistered '+race.courseId);
 const source=packs.cs.by_case[course.csKey];
 requireData(source,'CS course missing '+race.courseId);
 requireData(source.venue_code===course.venueCode&&source.distance_m===course.distance&&source.track_code===course.trackCode,'CS key and geometry catalog mismatch');
 requireData(typeof source.summary==='string'&&source.summary.length>10,'verified CS summary unavailable');
 requireData(trace.surface===course.surface&&trace.rotation===course.rotation,'official course/geometry mismatch');
 return {trace,course,source};
}
function cleanupGroup(g){
 if(!g)return;scene.remove(g);
 g.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){for(const mat of [].concat(obj.material)){if(mat.map)mat.map.dispose();mat.dispose()}}});
}
function makeTexture(turf){
 const c=document.createElement('canvas');c.width=c.height=256;
 const x=c.getContext('2d');x.fillStyle=turf?'#789369':'#bc9971';x.fillRect(0,0,256,256);
 function rnd(i){const a=Math.sin((i+41)*73.371)*43758.5453;return a-Math.floor(a)}
 for(let i=0;i<13500;i++){
  x.globalAlpha=.04+rnd(i)*.22;x.fillStyle=rnd(i*3)>.5?'#fff5e3':(turf?'#234b33':'#665034');
  x.fillRect(rnd(i*11)*256,rnd(i*37)*256,.5+rnd(i*13)*1.5,.5+rnd(i*3)*1.5);
 }
 x.globalAlpha=1;const texture=new THREE.CanvasTexture(c);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,8);texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
function mat(color,options={}){return new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0,...options})}
function curveMesh(points,radius,material,closed=false){
 return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed,'centripetal'),Math.max(64,points.length*2),radius,7,closed),material);
}
function spriteLabel(text,{accent='#143a30',textColor='#fffdf1',focus=false,scale=.95}={}){
 const c=document.createElement('canvas');c.width=c.height=192;
 const x=c.getContext('2d');x.shadowColor='#061a13';x.shadowBlur=12;
 x.fillStyle=focus?'#d9b061':'#f1e5c4';x.beginPath();x.arc(96,96,77,0,7);x.fill();
 x.shadowBlur=0;x.fillStyle=accent;x.beginPath();x.arc(96,96,63,0,7);x.fill();
 x.textAlign='center';x.textBaseline='middle';x.font='900 82px Arial,sans-serif';
 x.lineWidth=2;x.strokeStyle=textColor==='#fffdf1'?'#09251d':'#f8eed7';
 x.strokeText(text,96,101);x.fillStyle=textColor;x.fillText(text,96,101);
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;
 const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false}));
 spr.renderOrder=99;spr.scale.set(scale,scale,1);return spr;
}
function courseModel(race,verified){
 const {trace,course}=verified;
 const group=new THREE.Group();scene.add(group);
 const scale=.067;
 const source=trace.center.map(([x,z])=>new THREE.Vector3((x-270)*scale,0,(z-178)*scale));
 const shape=new THREE.CatmullRomCurve3(source,true,'centripetal',.5);
 const N=270,width=1.75,area=source.reduce((v,p,i)=>v+p.x*source[(i+1)%source.length].z-source[(i+1)%source.length].x*p.z,0);
 const orientation=area>=0?1:-1,minGrade=Math.min(...trace.grade.map(x=>x[1]));
 const pt=t=>shape.getPointAt((t%1+1)%1);
 const normal=t=>{const tangent=shape.getTangentAt((t%1+1)%1);return new THREE.Vector3(-tangent.z,0,tangent.x).normalize().multiplyScalar(orientation)};
 const grade=t=>{const v=clamp(t);for(let j=1;j<trace.grade.length;j++)if(v<=trace.grade[j][0]){
  const a=trace.grade[j-1],b=trace.grade[j];return mix(a[1],b[1],(v-a[0])/(b[0]-a[0]));
 }return trace.grade.at(-1)[1]};
 // Diagram-derived height values are *NOT* metrically scaled to horizontal coordinates.
 const groundHeight=t=>.32+(grade(t)-minGrade)*.085;
 const trackPt=(t,lane)=>pt(t).addScaledVector(normal(t),(.5-lane)*width).setY(groundHeight(t)+.035);
 const nearest=coordinate=>{
  const needle=new THREE.Vector3((coordinate[0]-270)*scale,0,(coordinate[1]-178)*scale);
  let result={d:Infinity,t:0};
  for(let i=0;i<1200;i++){const t=i/1200,p=pt(t),d=p.distanceToSquared(needle);if(d<result.d)result={d,t}}
  return result.t;
 };
 const startF=nearest(trace.start),cornerF=nearest(trace.firstCorner),toCorner=(cornerF-startF+1)%1;
 requireData(toCorner>.05&&toCorner<.6,'start/corner direction invalid');
 const routeF=u=>(startF+toCorner*clamp(u))%1;
 // Center path surface and short-height road bed.
 const nodes=[],idx=[],uv=[];
 for(let i=0;i<=N;i++){
  const t=i/N,p=pt(t),n=normal(t),y=groundHeight(t);
  for(let k=0;k<2;k++){const side=k===0?-.5:.5;nodes.push(p.x+n.x*side*width,y,p.z+n.z*side*width);uv.push(k,i/13)}
  if(i<N){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(nodes,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
 const turf=course.surface==='turf';
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),mat('#49704e'));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.2;ground.receiveShadow=true;group.add(ground);
 const surface=new THREE.Mesh(geo,mat(turf?'#c0d4a7':'#ebd6b5',{map:makeTexture(turf),side:THREE.DoubleSide}));
 surface.castShadow=true;surface.receiveShadow=true;group.add(surface);
 for(const lane of [0,1]){
  const pts=Array.from({length:170},(_,i)=>{const v=trackPt(i/170,lane);v.y+=.4;return v});
  const railing=curveMesh(pts,.035,mat('#f7f7eb',{roughness:.48}),true);
  railing.castShadow=true;group.add(railing);
  const postGeo=new THREE.CylinderGeometry(.025,.03,.4,6);
  for(let j=0;j<65;j++){
   const pos=trackPt(j/65,lane);const post=new THREE.Mesh(postGeo,mat('#f5f5df'));
   post.position.set(pos.x,pos.y+.2,pos.z);group.add(post);
  }
 }
 const ribbon=Array.from({length:100},(_,i)=>{const q=trackPt(routeF(i/99),.5);q.y+=.19;return q});
 const highlighted=curveMesh(ribbon,.055,new THREE.MeshBasicMaterial({color:'#f8cb66'}),false);
 group.add(highlighted);
 const startPoint=trackPt(startF,.5);startPoint.y+=.9;
 const startSign=spriteLabel('S',{scale:1.25,accent:'#164c32'});
 startSign.position.copy(startPoint);group.add(startSign);
 const turnPoint=trackPt(cornerF,.5);turnPoint.y+=.9;
 const turnSign=spriteLabel('C',{scale:1.25,accent:'#724c26'});
 turnSign.position.copy(turnPoint);group.add(turnSign);
 const light=new THREE.Mesh(new THREE.SphereGeometry(.18,12,10),new THREE.MeshBasicMaterial({color:'#fff1a3'}));
 group.add(light);
 const horseGroup=new THREE.Group();group.add(horseGroup);
 const horses=race.runners.map(h=>{
  const focused=race.focusNumbers.includes(h.number);
  const accent=WAKU[h.waku-1];
  const darkText=[0,4,6,7].includes(h.waku-1);
  const label=spriteLabel(String(h.number),{accent,focus:focused,textColor:darkText?'#11241b':'#fffdf1'});
  horseGroup.add(label);
  return {h,label};
 });
 return {group,shape,trace,course,source,pt,normal,trackPt,routeF,startF,cornerF,toCorner,horseGroup,horses,light,highlighted,startSign,turnSign,scale};
}
function updateSlope(model,t){
 const data=model.trace.grade, min=Math.min(...data.map(q=>q[1])),max=Math.max(...data.map(q=>q[1])),rng=Math.max(.01,max-min);
 const xy=data.map(q=>[10+318*q[0],77-52*(q[1]-min)/rng]);
 const d=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 $('slopeLine').setAttribute('d',d);
 $('slopeFill').setAttribute('d',d+' L328 81 L10 81 Z');
 const v=model.gradeValue?.(t)??(function(){let i=1;while(i<data.length&&t>data[i][0])i++;i=Math.min(data.length-1,i);const a=data[i-1],b=data[i];return mix(a[1],b[1],(t-a[0])/(b[0]-a[0]))})();
 $('slopeDot').setAttribute('cx',(10+318*t).toFixed(1));
 $('slopeDot').setAttribute('cy',(77-52*(v-min)/rng).toFixed(1));
}
function loadRace(race){
 const verified=validate(race);
 pause();
 if(context)cleanupGroup(context.group);
 currentRace=race;
 context=courseModel(race,verified);
 progress=0;
 $('courseName').textContent=verified.course.venue+' '+verified.course.surfaceLabel+verified.course.distance+'m';
 $('venue').textContent=verified.course.venue;$('distance').textContent=verified.course.distance+'m';
 $('turn').textContent=verified.course.rotation==='left'?'左回り':'右回り';
 $('surfacePill').textContent=verified.course.surface.toUpperCase();
 $('trackLabel').textContent=verified.course.venue+' '+verified.course.surfaceLabel+verified.course.distance+'m';
 $('courseDescription').textContent=verified.source.summary;
 $('sourceFoot').textContent='CS元データ：'+verified.source.created_ymd+'作成／event_id '+verified.source.source_event_id+'。現行改修との差分は別途確認が必要。';
 $('status').textContent='検証サンプル：'+race.runners.length+'頭（正式予想ではない）';
 setProgress(0);
}
function setCamera(target,height){
 const aspect=1150/514;
 camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;
 camera.near=.1;camera.far=200;camera.updateProjectionMatrix();
 camera.position.copy(target).add(new THREE.Vector3(8,25,22));camera.lookAt(target);
}
function setProgress(raw){
 progress=clamp(raw);if(!context)return;
 const m=context,f=progress;
 const intro=f<.17,terrain=f>=.17&&f<.34,motion=f>=.34&&f<.79,freeze=f>=.79;
 const mode=intro?'COURSE':terrain?'TERRAIN':motion?'FORMATION':'REVIEW';
 const local=intro?f/.17:terrain?(f-.17)/.17:motion?(f-.34)/.45:(f-.79)/.21;
 const step=clamp(local);
 const ref=motion?step:freeze?1:0;
 const approach=m.routeF(intro?step*.65:terrain?.42+step*.5:motion?ref:1);
 m.light.position.copy(m.trackPt(approach,.5)).add(new THREE.Vector3(0,.46,0));
 m.light.visible=intro||terrain;
 m.startSign.visible=intro||terrain;m.turnSign.visible=intro||terrain;
 const showMarkers=motion||freeze;m.horseGroup.visible=showMarkers;
 const actualGateOrder=currentRace.runners.map(h=>h.number).sort((a,b)=>a-b);
 for(const {h,label} of m.horses){
  const gateLane=actualGateOrder.indexOf(h.number)/Math.max(1,actualGateOrder.length-1);
  const lane=mix(gateLane,h.formation.lane,ease((ref-.17)/.72));
  const uFinal=.91-.73*h.formation.progress;
  const u=mix(.013,uFinal,ease((ref-.04)/.90));
  const pos=m.trackPt(m.routeF(u),lane);
  pos.y+=.72;label.position.copy(pos);
  label.scale.setScalar(showMarkers?(currentRace.runners.length>15?.92:1.12):0);
  if(currentRace.focusNumbers.includes(h.number))label.scale.multiplyScalar(1.14);
 }
 const focusPos=m.trackPt(m.routeF(.5),.5);focusPos.y=0;
 const full=new THREE.Vector3(0,.25,0);
 const movingTarget=focusPos.clone();
 const zoomFactor=motion?ease((step-.02)/.32):freeze?1:0;
 setCamera(full.clone().lerp(movingTarget,zoomFactor*.95),mix(20,9.6,zoomFactor));
 const stages={
 COURSE:['COURSE GUIDE','コースを知る。','公式図を基にしたコース形状を確認','コース全景','JRA図から再構成した走路を確認'],
 TERRAIN:['TERRAIN GUIDE','起伏を知る。','コース説明と断面図をあわせて確認','起伏を確認','標高は概算。正確な測量3Dではありません'],
 FORMATION:['START & FORMATION','ゲートから、隊列へ。',currentRace.runners.length+'頭の想定位置を模式的に表示','想定隊列の形成','馬番の動きは表示用・実走記録ではありません'],
 REVIEW:['FORMATION REVIEW','コーナー前、隊列を確認。','全頭の前後位置と内外を確認','想定隊列を静止','着順を示す映像ではありません']
 };
 const [tag,title,subtitle,label,foot]=stages[mode];
 $('eyebrow').textContent=tag;$('headline').textContent=title;$('subtitle').textContent=subtitle;
 $('shotLabel').textContent=label;$('stageName').textContent=mode;$('stateLabel').textContent=label;
 $('footerMessage').textContent=foot;$('phaseProgress').textContent=Math.round(f*100)+'%';
 $('seek').value=String(Math.round(f*1000));
 $('seekBar').style.width=(f*100)+'%';$('timelinePointer').style.left='calc('+f*100+'% - 9px)';
 $('timeLabel').textContent='00:'+String(Math.floor(f*DURATION)).padStart(2,'0')+' / 00:'+DURATION;
 updateSlope(m,intro?0:terrain?step:motion?.3+.65*step:1);
 renderer.render(scene,camera);
}
function pause(){playing=false;ui.play.textContent='▶ 再生';lastTimestamp=null}
function frame(now){
 if(playing){
  if(lastTimestamp!==null){progress+=Math.min((now-lastTimestamp)/1000,.15)/DURATION;if(progress>=1){progress=1;pause()}setProgress(progress)}
  lastTimestamp=now;
 }
 requestAnimationFrame(frame);
}
function expose(){return {setProgress,loadRace,state:()=>({
 schema:'kbv.scene03.generic-visual/v13',raceId:currentRace?.id,courseId:currentRace?.courseId,
 runnerCount:currentRace?.runners.length,phase:progress<.17?'course':progress<.34?'terrain':progress<.79?'formation':'review',
 progress,fromCS:!!context?.source,geometryQuality:'JRA_DIAGRAM_APPROXIMATE_NOT_GIS',durationSource:'DEMO_ONLY',
 positions:context?.horses.map(({h,label})=>({number:h.number,x:+label.position.x.toFixed(4),y:+label.position.y.toFixed(4),z:+label.position.z.toFixed(4)}))
 })};
}
ui.play.addEventListener('click',()=>{if(playing){pause();return}if(progress>=1)setProgress(0);playing=true;ui.play.textContent='❚❚ 一時停止'});
ui.seek.addEventListener('input',e=>{pause();setProgress(Number(e.target.value)/1000)});
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{pause();setProgress(Number(b.dataset.jump))}));
ui.raceSelect.addEventListener('change',()=>{loadRace(packs.races.races[ui.raceSelect.value])});
$('upload').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{const parsed=JSON.parse(await file.text());const r=parsed.race||parsed;loadRace(r);ui.status.textContent='外部レースJSON読込済み'}
 catch(err){pause();ui.status.textContent=err.message;alert(err.message)}
});
async function boot(){
 const [races,geometry,cs,catalog]=await Promise.all(['sample_races.json','course_geometry.json','db_cs_snapshot.json','course_catalog.json'].map(async filename=>{
  const r=await fetch(filename);if(!r.ok)throw Error('DATA ERROR: missing '+filename);return r.json();
 }));
 packs={races,geometry,cs,catalog:catalog.courses};
 for(const [id,race]of Object.entries(races.races)){const o=document.createElement('option');o.value=id;o.textContent=race.raceName;ui.raceSelect.append(o)}
 if(!races.races.tokyo)throw Error('DATA ERROR: Tokyo demo missing');
 window.KBV_SCENE03_V13=expose();
 loadRace(races.races.tokyo);
 requestAnimationFrame(frame);
}
boot().catch(err=>{console.error(err);ui.status.textContent=err.message;$('headline').textContent='データを確認してください';});
