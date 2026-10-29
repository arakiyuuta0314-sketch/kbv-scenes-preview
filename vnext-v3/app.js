'use strict';
/* KBV Scene 03 / v2 — generic renderer, zero baked-in venue / runner facts */
const NS='http://www.w3.org/2000/svg';
const el=id=>document.getElementById(id);
const svg=(name,props={})=>{const n=document.createElementNS(NS,name);Object.entries(props).forEach(([k,v])=>n.setAttribute(k,String(v)));return n};
const set=(id,t)=>{el(id).textContent=String(t)};
const clamp=(n,lo=0,hi=1)=>Math.min(hi,Math.max(lo,n));
const mix=(a,b,p)=>a+(b-a)*p;
const ease=p=>{p=clamp(p);return p*p*(3-2*p)};
const round=(x,n=1)=>Number(x.toFixed(n));
const WAKU={1:['#fffdf8','#14281f'],2:['#222933','#fff'],3:['#d23d43','#fff'],4:['#2460b5','#fff'],5:['#f1d846','#192416'],6:['#29824b','#fff'],7:['#dc7e3d','#fff'],8:['#d98fac','#18251c']};
const REQUIRED=['intro','action','review'];
let activeRace=null,course=null,part={intro:0,action:0,review:0},duration=0,current=0;
let playing=false,lastFrame=null,voiceURL=null,voiceSeconds=0,renderedMarkers=[],reviewMarkers=[],firstRenders=0;
const AUDIO=el('narration'),courses={...window.KBV_COURSES};
function invariant(v,msg){if(!v)throw Error('DATA ERROR: '+msg)}
function checkCourse(c){
 invariant(c&&typeof c==='object','course not found');
 for(const k of ['venue','surface','distance','rotation','firstTurn','straight','totalElevation','spotlightRise','spotlightText','gradeTitle','gradeBody','formationSlopeLabel','profile','sources','surfacePalette'])invariant(c[k]!==undefined,'course.'+k+' missing');
 invariant(['left','right'].includes(c.rotation),'course.rotation should be left or right');
 invariant(Number.isFinite(c.distance)&&c.distance>0,'course.distance invalid');
 invariant(Number.isFinite(c.firstTurn.distance)&&c.firstTurn.distance>0,'firstTurn.distance invalid');
 invariant(Array.isArray(c.profile)&&c.profile.length>=3&&c.profile.every(n=>typeof n==='number'&&n>=0&&n<=1),'profile invalid');
 invariant(Array.isArray(c.sources)&&c.sources.length>0,'course sources missing');
}
function validateRace(r){
 invariant(r&&r.schema==='kbv.scene03.v2','schema must be kbv.scene03.v2');
 invariant(typeof r.raceName==='string'&&r.raceName,'raceName missing');
 invariant(Array.isArray(r.runners)&&r.runners.length>=2&&r.runners.length<=24,'runners count must be 2-24');
 invariant(Array.isArray(r.focusNumbers),'focusNumbers missing');
 for(const part of REQUIRED){
  invariant(r.copy&&r.copy[part],'copy.'+part+' missing');
  const req=part==='intro'?['heading','eyebrow','sub','speech','footer']:part==='action'?['heading','eyebrow','sub','speech','early','late','body','footer']:['heading','eyebrow','sub','speech','title','body','points','footer'];
  for(const key of req) invariant(typeof r.copy[part][key]==='string'||(key==='points'&&Array.isArray(r.copy[part][key])),'copy.'+part+'.'+key+' missing');
 }
 const numbers=new Set();
 for(const h of r.runners){
  invariant(Number.isInteger(h.number)&&h.number>=1&&h.number<=24,'horse number invalid');
  invariant(!numbers.has(h.number),'duplicate horse number '+h.number);numbers.add(h.number);
  invariant(typeof h.name==='string'&&h.name.length>0,'horse name missing');
  invariant(Number.isInteger(h.waku)&&h.waku>=1&&h.waku<=8,'waku invalid for '+h.number);
  invariant(h.formation&&Number.isFinite(h.formation.progress)&&h.formation.progress>=0&&h.formation.progress<=1,'progress missing/out of range: '+h.number);
  invariant(Number.isFinite(h.formation.lane)&&h.formation.lane>=0&&h.formation.lane<=1,'lane missing/out of range: '+h.number);
 }
 for(const n of r.focusNumbers)invariant(numbers.has(n),'focusNumbers refers to missing runner '+n);
 const c=r.course? r.course:courses[r.courseId];
 checkCourse(c);
 return c;
}
function svgText(parent,x,y,str,attrs={}){
 const n=svg('text',{x,y,...attrs});n.textContent=String(str);parent.append(n);return n;
}
function lineGroup(parent,arr,stroke,width=3,extra={}){
 const pts=arr.map(p=>p.join(',')).join(' ');
 const n=svg('polyline',{points:pts,fill:'none',stroke,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',...extra});parent.append(n);return n;
}
function setRichHeading(text){
 const node=el('bigTitle');node.replaceChildren();
 const m=/^(.*?)<em>(.*?)<\/em>(.*?)$/.exec(text);
 if(!m){node.textContent=text;return}
 node.append(document.createTextNode(m[1]));
 const e=document.createElement('em');e.textContent=m[2];node.append(e,document.createTextNode(m[3]));
}
function fillFooter(label,message){set('footerLabel',label);set('footerInfo',message)}
function textPath(v){
 return v.map((p,i)=>(i===0?'M':'L')+round(p[0],1)+' '+round(p[1],1)).join(' ');
}
function buildCourse(){
 const root=el('courseModel'),land=el('courseLandmarks');
 root.replaceChildren();land.replaceChildren();
 const flip=course.rotation==='right';
 const world=svg('g',flip?{transform:'translate(1040,0) scale(-1,1)'}:{});root.append(world);
 // Dense landscape base, intentionally a stylized isometric track rather than surveyed geometry.
 world.append(svg('ellipse',{cx:520,cy:440,rx:453,ry:90,fill:'#03190d',opacity:.7,filter:'url(#softshadow)'}));
 const path='M154 205 C290 123 740 125 865 213 C961 285 936 378 818 425 C688 482 356 480 200 428 C75 385 45 280 154 205Z';
 world.append(svg('path',{d:path,fill:'#4a3527',transform:'translate(0 30)',opacity:.95}));
 world.append(svg('path',{d:path,fill:course.surfacePalette==='turf'?'#699768':'url(#sand)',stroke:'#d8ba8a','stroke-width':2}));
 // inner offset exposes the racing lane as a thick band on the model
 const inner='M215 245 C332 183 685 183 794 245 C848 285 823 344 746 373 C635 418 380 419 247 381 C169 357 146 292 215 245Z';
 world.append(svg('path',{d:inner,fill:'url(#grass)',stroke:'#e4f4dc','stroke-width':5}));
 world.append(svg('path',{d:'M156 207 C283 132 737 135 857 217 C946 281 926 367 813 415',fill:'none',stroke:'#f9e8c7','stroke-width':5,opacity:.8}));
 // broad lap markings deliberately avoid the illusion of measured lanes
 world.append(svg('path',{d:'M182 227 C307 154 706 158 826 233 C901 287 877 361 780 392',fill:'none',stroke:'#f8dfb5','stroke-width':2,opacity:.55,'stroke-dasharray':'12 16'}));
 for(let i=0;i<15;i++){
  const xx=190+i*47;
  const top=211-78*Math.sin(Math.PI*(xx-150)/735);
  world.append(svg('line',{x1:xx,y1:top-14,x2:xx,y2:top-24,stroke:'#f3ead7','stroke-width':2,opacity:.7}));
 }
 const pathSeg=svg('path',{id:'introSegment',d:'M755 147 C540 110 311 137 173 211',stroke:'#f1c878','stroke-width':17,fill:'none','stroke-linecap':'round',opacity:.87});
 world.append(pathSeg);
 world.append(svg('path',{d:'M755 147 C540 110 311 137 173 211',stroke:'#fff3bd','stroke-width':4,fill:'none','stroke-linecap':'round','class':'lightPath'}));
 const currentDot=svg('g',{id:'introDot'});
 currentDot.append(svg('circle',{r:24,fill:'#efc579',opacity:.18}),svg('circle',{r:11,fill:'#f7d787',stroke:'#fffdf1','stroke-width':4}));
 world.append(currentDot);
 // course-independent markers and figures are set in data coordinates.
 const startX=flip?300:755,endX=flip?865:173;
 const startY=157,endY=214;
 const s=svg('g');land.append(s);
 s.append(svg('rect',{x:startX-53,y:60,width:106,height:42,rx:9,fill:'#0c3729',stroke:'#abccad','stroke-width':1}));
 svgText(s,startX,87,'START',{'text-anchor':'middle','class':'courseText','font-size':17});
 const e=svg('g');land.append(e);
 e.append(svg('rect',{x:endX-81,y:174,width:162,height:43,rx:9,fill:'#103d2e',stroke:'#d9c18b','stroke-width':1}));
 svgText(e,endX,202,course.firstTurn.label,{'text-anchor':'middle','class':'courseText','font-size':18});
 const center=svg('g');land.append(center);
 center.append(svg('rect',{x:310,y:258,width:417,height:110,rx:18,fill:'#083324de',stroke:'#dbf0c76e','stroke-width':2}));
 svgText(center,518,297,'START → '+course.firstTurn.label,{'text-anchor':'middle','class':'courseText','font-size':18});
 svgText(center,520,345,course.firstTurn.display+'m',{'text-anchor':'middle',fill:'#f7d78a','font-size':41,'font-weight':950});
 set('firstTurnName','START → '+course.firstTurn.label.toUpperCase());
 set('firstTurn',course.firstTurn.display);set('firstTurnText',course.firstTurn.note);
 set('straight',course.straight);set('courseRise',course.totalElevation);
 set('surfacePill',course.surface==='芝'?'TURF':'DIRT');
 set('slopeTag',course.spotlightText);
 set('profileFoot','模式断面：坂の位置と傾斜は非縮尺。総高低差 '+course.totalElevation+'m。');
 const pal=course.surfacePalette==='turf'?'#c4df9c':'#f1d08b';
 const profile=el('profileSVG');profile.replaceChildren();
 const arr=course.profile.map((v,i)=>[15+i*52,99-v*74]);
 const a=svg('path',{d:textPath(arr)+'L431 108L15 108Z',fill:pal,opacity:.14});profile.append(a);
 lineGroup(profile,arr,pal,6);
 profile.append(svg('line',{x1:12,y1:104,x2:439,y2:104,stroke:'#9bbca8',opacity:.6,'stroke-width':1.5}));
 for(const [i,n] of [[0,'START'],[course.profile.length-1,'GOAL']])svgText(profile,arr[i][0],116,n,{'text-anchor':i?'end':'start',fill:'#b4d4be','font-size':12,'font-weight':850});
 set('notes','コース数値：'+course.sources.join(' / ')+'。 3D形状・走行線・起伏の曲線は説明用の模式表現。予測進路はレースJSONで明示し、枠番から自動推定しません。');
 return{pathSeg,currentDot,flip,world};
}
function terrain(){
 const root=el('terrainModel'),grain=el('terrainGrain'),gate=el('gateModel'),signs=el('onTrackSigns');
 for(const o of [root,grain,gate,signs])o.replaceChildren();
 const grass=course.surfacePalette==='turf';
 const surface=grass?'#518a55':'url(#actionSand)';
 root.append(svg('rect',{width:1080,height:555,fill:'url(#actionGrass)'}));
 // Course depth: dark extruded roadbed, visible sand/grass ribbon, inner rail near viewer
 root.append(svg('path',{d:'M-45 138 Q510 74 1125 108 L1125 565 Q530 617 -45 626Z',fill:'#3e3a2a',opacity:.6,transform:'translate(0 15)'}));
 root.append(svg('path',{d:'M-45 138 Q510 74 1125 108 L1125 565 Q530 617 -45 626Z',fill:surface}));
 if(!grass) grain.append(svg('path',{d:'M-45 138 Q510 74 1125 108 L1125 565 Q530 617 -45 626Z',fill:'url(#grain)',opacity:.9}));
 root.append(svg('path',{d:'M-40 140 Q515 77 1120 109',fill:'none',stroke:grass?'#d5ecbd':'#f6e2c0','stroke-width':4,opacity:.84}));
 root.append(svg('path',{d:'M-45 521 Q500 535 1125 497',fill:'none',stroke:'#5f573e','stroke-width':23}));
 root.append(svg('path',{d:'M-45 513 Q500 527 1125 490',fill:'none',stroke:'#fff7df','stroke-width':11}));
 root.append(svg('path',{d:'M-45 510 Q500 524 1125 487',fill:'none',stroke:'#597f59','stroke-width':3}));
 // Evenly spaced posts show course direction without rail-occupancy illusion.
 for(let x=35;x<1110;x+=55){
   const y=515 + 10*Math.sin((x/1080)*Math.PI)-x/1080*15;
   root.append(svg('line',{x1:x,y1:y-2,x2:x,y2:y-15,stroke:'#eaf4df','stroke-width':3,opacity:.83}));
 }
 // visual grade rise, shaded by altitude hint, not a precise surveyed gradient
 root.append(svg('path',{d:'M230 92Q415 82 574 91L574 152Q420 146 230 165Z',fill:grass?'#a2ce8c':'#f6ddad',opacity:.12}));
 lineGroup(root,[[240,150],[360,123],[485,115],[590,120]],'#fff5ca',2,{opacity:.26,'stroke-dasharray':'8 18'});
 const n=activeRace.runners.length;
 for(let i=0;i<n;i++){
  const v=120 + (n===1?0:(i/(n-1))*350);
  gate.append(svg('line',{x1:920,y1:v,x2:960,y2:v-5,stroke:'#e0e8de','stroke-width':2,opacity:.65}));
 }
 const run=course.rotation==='left'?'◀':'▶';
 svgText(signs,385,52,course.formationSlopeLabel,{fill:'#fff6c9','font-size':17,'font-weight':900});
 signs.append(svg('path',{d:'M358 74L415 57L468 63',stroke:'#ffe8a6','stroke-width':2.5,fill:'none',opacity:.7,'stroke-linecap':'round'}));
 // Direction label itself lives in the HTML overlay.
}
function reviewTerrain(){
 const g=el('reviewTerrain');g.replaceChildren();
 const grass=course.surfacePalette==='turf';
 g.append(svg('rect',{width:1090,height:556,fill:grass?'#5b8f5e':'#4d8669'}));
 g.append(svg('path',{d:'M-5 121 Q520 127 1095 87 L1095 492 Q534 540 -5 521 Z',fill:grass?'#7aa66c':'#ceb28c'}));
 g.append(svg('path',{d:'M-5 124 Q520 130 1095 90',stroke:'#f9ead0','stroke-width':3,fill:'none'}));
 g.append(svg('path',{d:'M-5 517 Q534 536 1095 488',stroke:'#fff5d6','stroke-width':11,fill:'none'}));
 for(let i=0;i<2;i++)g.append(svg('path',{d:'M-5 '+(257+i*125)+' Q520 '+(268+i*125)+' 1095 '+(226+i*125),stroke:'#fff8e2','stroke-width':1.4,'stroke-dasharray':'10 19',opacity:.24,fill:'none'}));
 g.append(svg('rect',{x:24,y:22,width:160,height:48,rx:10,fill:'#124332'}));
 svgText(g,104,53,course.rotation==='left'?'◀ 進行方向':'進行方向 ▶',{'text-anchor':'middle',fill:'#f7f9dc','font-size':17,'font-weight':900});
}
function sampleTarget(h,kind){
 const x=course.rotation==='left'?mix(190,923,h.formation.progress):mix(900,167,h.formation.progress);
 const lane=clamp(h.formation.lane,.05,.85);
 const y= kind==='final'? mix(457,205,lane)-(x-520)*.028 :mix(449,207,lane)-(x-520)*.045;
 return{x,y};
}
function gatePosition(h){
 const sorted=activeRace.runners.slice().sort((a,b)=>a.number-b.number);
 const index=sorted.findIndex(x=>x.number===h.number);
 return{x:course.rotation==='left'?922:168,y:453-index*300/Math.max(1,sorted.length-1)};
}
function marker(h,root){
 const group=svg('g',{'class':'horse','data-number':h.number});const color=WAKU[h.waku];
 group.append(svg('ellipse',{'class':'ground',cx:2,cy:12,rx:25,ry:7}),svg('circle',{'class':'halo',r:30}),svg('circle',{'class':'rim',r:22,fill:color[0]}));
 svgText(group,0,2,h.number,{fill:color[1],'font-size':h.number>9?20:25});
 const t=svg('title');t.textContent=h.number+'番 '+h.name;group.append(t);root.append(group);
 return{horse:h,node:group};
}
function separatePositions(entries,minimum){
 // Deterministic collision adjustment to preserve readability; never generates prediction data.
 const arr=entries.map(o=>({h:o.h,p:{x:o.p.x,y:o.p.y}}));
 for(let pass=0;pass<16;pass++){
  for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
   const a=arr[i],b=arr[j],dx=b.p.x-a.p.x,dy=b.p.y-a.p.y;
   const len=Math.hypot(dx,dy);if(len>=minimum)continue;
   const shift=(minimum-len)/2+.12;
   // Move mostly laterally, maintaining the front-to-back order whenever possible.
   let side=Math.sign(dy);if(!side)side=(a.h.number<b.h.number?1:-1);
   a.p.y=clamp(a.p.y-side*shift,181,462);
   b.p.y=clamp(b.p.y+side*shift,181,462);
   const xShift=Math.min(shift*.08,1.2)*(dx>=0?1:-1);
   a.p.x=clamp(a.p.x-xShift,78,1020);b.p.x=clamp(b.p.x+xShift,78,1020);
  }
 }
 return arr;
}
function buildMarkers(){
 const a=el('horseMarks'),b=el('reviewMarks');a.replaceChildren();b.replaceChildren();
 renderedMarkers=activeRace.runners.map(h=>marker(h,a));
 reviewMarkers=activeRace.runners.map(h=>marker(h,b));
 const sorted=separatePositions(activeRace.runners.map(h=>({h,p:sampleTarget(h,'final')})),43).sort((a,b)=>a.p.y-b.p.y);
 for(const {h,p}of sorted){
  const item=reviewMarkers.find(m=>m.horse.number===h.number);
  item.node.setAttribute('transform','translate('+round(p.x,2)+' '+round(p.y,2)+')');
  item.node.classList.toggle('important',activeRace.focusNumbers.includes(h.number));
  b.append(item.node);
 }
}
function renderMarkerPositions(f){
 const positions=renderedMarkers.map(m=>{
  const gate=gatePosition(m.horse),t=sampleTarget(m.horse,'action');
  const forward=ease((f-.04)/.88),side=ease((f-.16)/.78);
  return{m,x:mix(gate.x,t.x,forward),y:mix(gate.y,t.y,side),size:mix(.58,1,ease((f-.08)/.56))}
 });
 const resolved=separatePositions(positions.map(item=>({h:item.m.horse,p:{x:item.x,y:item.y}})),mix(25,43,ease(f)));
 for(let i=0;i<positions.length;i++){positions[i].x=resolved[i].p.x;positions[i].y=resolved[i].p.y}
 positions.sort((a,b)=>a.y-b.y);
 for(const p of positions){
  p.m.node.setAttribute('transform','translate('+round(p.x,2)+' '+round(p.y,2)+') scale('+round(p.size,3)+')');
  p.m.node.classList.toggle('important',activeRace.focusNumbers.includes(p.m.horse.number)&&f>.5);
  el('horseMarks').append(p.m.node);
 }
 const delta=ease((f-.08)/.85);
 const zoom=1+delta*.035,push=delta*7;
 el('actionCamera').setAttribute('transform','translate('+round(-push,2)+' '+round(delta*5,2)+') translate(540 275) scale('+round(zoom,4)+') translate(-540 -275)');
 el('gateModel').setAttribute('opacity',String(1-ease(f/.26)));
 el('meterFill').style.width=round(f*100,2)+'%';
 set('distanceCount','進行位置：'+Math.round(f*course.firstTurn.distance)+'m相当（模式上の進行率）');
 set('stageBadge',f<.13?'GATE':f<.68?'FORMATION':'FIRST TURN');
}
function narrationWeights(r){
 // Proportions derive from per-part text, NEVER configured seconds.
 const lengths=REQUIRED.map(key=>Math.max(28,[r.copy[key].speech].join(' ').replace(/\s/g,'').length));
 const sum=lengths.reduce((a,b)=>a+b,0);
 return{intro:lengths[0]/sum,action:lengths[1]/sum,review:lengths[2]/sum};
}
function parseFrame(progress){
 const a=part.intro,b=part.intro+part.action;
 return progress<a?['intro',progress/a]:progress<b?['action',(progress-a)/part.action]:['review',(progress-b)/part.review];
}
function updateIntro(f){
 const model=el('courseModel'),land=el('courseLandmarks');
 const z=1+ease(f)*.05;
 model.setAttribute('transform','translate('+(-13*ease(f))+' '+(9*ease(f))+') translate(520 260) scale('+z+') translate(-520 -260)');
 land.setAttribute('transform',model.getAttribute('transform'));
 const seg=el('introSegment'),dot=el('introDot');
 const length=seg.getTotalLength();const at=seg.getPointAtLength(length*ease(f));
 dot.setAttribute('transform','translate('+at.x+' '+at.y+')');
 fillFooter('COURSE POINT',f<.5?course.firstTurn.note:course.gradeTitle);
}
function updateAction(f){
 renderMarkerPositions(f);
 const copy=activeRace.copy.action;
 set('actionHeadline',f<.5?copy.early:copy.late);
 set('actionCopy',copy.body);
 fillFooter('POSITION BATTLE',copy.footer);
}
function updateReview(){
 const copy=activeRace.copy.review;
 set('reviewTitle',copy.title);set('reviewCopy',copy.body);
 const box=el('analysisPoints');box.replaceChildren();
 copy.points.forEach(point=>{const div=document.createElement('div');div.className='keyPoint';div.textContent=point;box.append(div)});
 fillFooter('PACE & POSITION',copy.footer);
}
function updateView(raw){
 current=clamp(raw);
 const state=parseFrame(current),phase=state[0],f=state[1],copy=activeRace.copy[phase];
 for(const [id,p] of [['phaseIntro','intro'],['phaseAction','action'],['phaseReview','review']])el(id).classList.toggle('on',phase===p);
 set('kicker',copy.eyebrow);setRichHeading(copy.heading);set('subTitle',copy.sub);
 if(phase==='intro')updateIntro(f); else if(phase==='action')updateAction(f);else updateReview();
 el('progressFill').style.width=round(current*100,2)+'%';el('seek').value=Math.round(current*1000);
 set('position',(voiceSeconds?formatTime(current*voiceSeconds)+' / '+formatTime(voiceSeconds):Math.round(current*100)+'%'));
 set('playbackStatus',voiceSeconds?'ナレーション尺に追従中':'試作用の再生速度');
}
function formatTime(sec){const n=Math.round(sec);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')}
function renderText(){
 set('raceName',activeRace.raceName);set('raceMeta',activeRace.date+' · '+course.venue+course.surface+course.distance+'m · '+(course.rotation==='left'?'左':'右')+'回り');
 document.querySelector('.direction').textContent=course.rotation==='left'?'◀ 進行方向':'進行方向 ▶';
 el('leaders').replaceChildren();
 activeRace.focusNumbers.slice(0,5).forEach(n=>{
  const h=activeRace.runners.find(x=>x.number===n);const row=document.createElement('div');row.className='leader';
  const num=document.createElement('span');num.className='leadMarker';num.textContent=n;
  const label=document.createElement('span');label.textContent=h.name;row.append(num,label);el('leaders').append(row)
 });
}
function fit(){const v=el('viewport').getBoundingClientRect();el('board').style.transform='scale('+(v.width/1600)+')'}
window.addEventListener('resize',fit);
function loadRace(r){
 const c=validateRace(r);
 playing=false;AUDIO.pause();activeRace=r;course=c;part=narrationWeights(r);
 renderText();buildCourse();terrain();reviewTerrain();buildMarkers();updateView(0);
 if(!voiceSeconds) duration=Math.max(45,(r.copy.intro.speech+r.copy.action.speech+r.copy.review.speech).length/3.2);
 else duration=voiceSeconds;
}
function jumpTo(phase){const p=phase==='intro'?0.05:phase==='action'?part.intro+.03:part.intro+part.action+.03;pause();seekTo(p)}
function pause(){playing=false;AUDIO.pause();el('playBtn').textContent='▶ 再生'}
function seekTo(p){if(voiceSeconds&&AUDIO.readyState>=1)AUDIO.currentTime=clamp(p)*voiceSeconds;updateView(p)}
function raf(now){
 if(lastFrame===null)lastFrame=now;
 const dt=Math.min(.12,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(playing){
  if(voiceSeconds){
   if(AUDIO.ended||AUDIO.paused)playing=false;
   else current=clamp(AUDIO.currentTime/voiceSeconds);
  }else{current=clamp(current+dt/duration);if(current>=1)playing=false}
  updateView(current);
  if(!playing)el('playBtn').textContent='▶ 再生';
 }
 requestAnimationFrame(raf);
}
el('playBtn').addEventListener('click',()=>{
 if(playing){pause();return}
 if(current>=.999)seekTo(0);
 playing=true;lastFrame=null;
 el('playBtn').textContent='❚❚ 一時停止';
 if(voiceSeconds)AUDIO.play().catch(e=>{pause();set('playbackStatus','音声再生エラー：'+e.message)});
});
el('introBtn').addEventListener('click',()=>jumpTo('intro'));
el('actionBtn').addEventListener('click',()=>jumpTo('action'));
el('reviewBtn').addEventListener('click',()=>jumpTo('review'));
el('seek').addEventListener('input',e=>{pause();seekTo(Number(e.target.value)/1000)});
el('audioInput').addEventListener('change',e=>{
 const file=e.target.files&&e.target.files[0];if(!file)return;
 pause();if(voiceURL)URL.revokeObjectURL(voiceURL);voiceURL=URL.createObjectURL(file);
 voiceSeconds=0;AUDIO.src=voiceURL;AUDIO.load();
 AUDIO.onloadedmetadata=()=>{
  if(!Number.isFinite(AUDIO.duration)||AUDIO.duration<=0){set('playbackStatus','音声長を取得できません');return}
  voiceSeconds=AUDIO.duration;duration=voiceSeconds;seekTo(0);
  set('playbackStatus','実際の音声に追従：'+formatTime(voiceSeconds));
 };
 AUDIO.onerror=()=>set('playbackStatus','音声ファイルを読み込めません');
});
AUDIO.addEventListener('ended',()=>{playing=false;updateView(1);el('playBtn').textContent='▶ 再生'});
el('raceInput').addEventListener('change',async e=>{
 const file=e.target.files&&e.target.files[0];if(!file)return;
 try{const data=JSON.parse(await file.text());loadRace(data);set('playbackStatus','JSON読込成功：'+activeRace.runners.length+'頭')}
 catch(err){pause();set('playbackStatus',err.message);alert('レースJSONの検証に失敗しました。\n'+err.message)}
});
const select=el('raceSelect');
for(const [key,r] of Object.entries(window.KBV_RACES)){
 const o=document.createElement('option');o.value=key;o.textContent=r.raceName;select.append(o)
}
select.addEventListener('change',()=>{try{loadRace(window.KBV_RACES[select.value])}catch(e){set('playbackStatus',e.message);throw e}});
function expose(){
 return{state:()=>{
  const p=parseFrame(current);
  return{schema:'kbv.scene03.state/v2',id:activeRace.id,courseId:course.id,runnerCount:activeRace.runners.length,
   progress:current,phase:p[0],duration:voiceSeconds||null,phaseWeights:part,
   actionPositions:renderedMarkers.map(m=>({number:m.horse.number,transform:m.node.getAttribute('transform')})),
   reviewPositions:reviewMarkers.map(m=>({number:m.horse.number,transform:m.node.getAttribute('transform')}))}
 },renderAt:p=>{pause();seekTo(p)},loadRace:r=>loadRace(r),setNarrationSeconds:s=>{
  if(!Number.isFinite(s)||s<=0)throw Error('narration seconds must be positive');voiceSeconds=s;duration=s;updateView(current)
 }};
}
window.KBV_SCENE03=expose();
fit();loadRace(window.KBV_RACES.tokyo);requestAnimationFrame(raf);