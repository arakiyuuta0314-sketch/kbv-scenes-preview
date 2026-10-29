/* KBV Scene03 v4: course-specific geometry + lighting + camera finish.
   The geometry is authored illustration data, not surveyed JRA GIS / measured elevation. */
'use strict';
(function(){
 const originalTerrain=terrain;
 const originalRenderMarkerPositions=renderMarkerPositions;
 const originalReview=reviewTerrain;
 const originalUpdateIntro=updateIntro;
 const originalLoadRace=loadRace;
 function verifyModel(){
   const m=course.model4;
   if(!m||typeof m.outer!=='string'||typeof m.inner!=='string'||typeof m.route!=='string'
      ||!Array.isArray(m.start)||m.start.length!==2||!Array.isArray(m.turn)||m.turn.length!==2
      ||!m.start.every(Number.isFinite)||!m.turn.every(Number.isFinite)
      ||![-1,1].includes(m.camYaw))throw Error('DATA ERROR: course.model4 geometry missing/invalid');
   // Fail-fast to prevent presentation accidentally using another course's map.
   return m;
 }
 function defs(parent){
  const d=svg('defs');
  for(const [id,stops] of Object.entries({
   v4Side:[['0','#3c2b20'],['.42','#76543b'],['1','#ae8a61']],
   v4TurfSide:[['0','#2c4c35'],['.55','#436c46'],['1','#7ca36c']],
   v4Dirt:[['0','#f0d8ad'],['.42','#c9a67c'],['1','#927054']],
   v4Turf:[['0','#9bbb84'],['.4','#78a36a'],['1','#4f7f55']],
   v4Hollow:[['0','#3f8a63'],['.5','#1f664a'],['1','#12492f']],
   v4Gold:[['0','#ffedbb'],['.55','#f9d38c'],['1','#d4a15a']],
  })){
   const g=svg('linearGradient',{id,x1:'0%',y1:'0%',x2:'15%',y2:'100%'});
   for(const [offset,color]of stops)g.append(svg('stop',{offset,'stop-color':color}));
   d.append(g);
  }
  const grain=svg('pattern',{id:'v4RoadGrain',width:32,height:32,patternUnits:'userSpaceOnUse'});
  for(let i=0;i<6;i++){
   const x=[3,19,11,29,7,24][i],y=[5,13,22,7,30,26][i];
   grain.append(svg('circle',{cx:x,cy:y,r:i%2?0.9:1.35,fill:'#694827',opacity:.12}));
  }
  d.append(grain);
  const grassGrain=svg('pattern',{id:'v4GrassGrain',width:34,height:34,patternUnits:'userSpaceOnUse'});
  grassGrain.append(svg('path',{d:'M3 4l8 -4M24 22l6 -6M11 34l3-6',stroke:'#c7e4ad',opacity:.22,'stroke-width':1.5}));
  d.append(grassGrain);
  parent.append(d);
 }
 function textIn(parent,x,y,str,attr={}){
  const n=svg('text',{x,y,fill:'#f9f9ed','font-size':18,'font-weight':900,...attr});
  n.textContent=str;parent.append(n);return n;
 }
 function createModel(){
  const m=verifyModel(),root=el('courseModel'),marks=el('courseLandmarks');
  root.replaceChildren();marks.replaceChildren();
  const g=svg('g');root.append(g);
  defs(g);
  const turf=course.surfacePalette==='turf';
  const midId=turf?'v4Turf':'v4Dirt';
  const sideId=turf?'v4TurfSide':'v4Side';
  const extShadow=svg('ellipse',{cx:520,cy:453,rx:461,ry:70,fill:'#031810',opacity:.66});
  g.append(extShadow);
  // Depth: whole course silhouette extrusion and a deep front curb. This is an isometric effect.
  g.append(svg('path',{d:m.outer,fill:'url(#'+sideId+')',transform:'translate(0 34)',opacity:.98}));
  g.append(svg('path',{d:m.outer,fill:'url(#'+midId+')',stroke:turf?'#abc997':'#ead5b4','stroke-width':2.6}));
  if(!turf)g.append(svg('path',{d:m.outer,fill:'url(#v4RoadGrain)',opacity:.76}));
  else g.append(svg('path',{d:m.outer,fill:'url(#v4GrassGrain)',opacity:.65}));
  // Inner boundary is a separate rail, not an unreasonably wide track lane.
  g.append(svg('path',{d:m.inner,fill:'#0a3528',opacity:.34,transform:'translate(0 8)'}));
  g.append(svg('path',{d:m.inner,fill:'url(#v4Hollow)',stroke:'#f9f2d7','stroke-width':6}));
  const interior=svg('g');
  interior.append(svg('path',{d:'M268 301Q485 249 743 301',stroke:'#9dc99f','stroke-width':2,fill:'none',opacity:.21,'stroke-dasharray':'8 17'}));
  interior.append(svg('path',{d:'M251 334Q498 272 761 337',stroke:'#9dc99f','stroke-width':1.8,fill:'none',opacity:.2,'stroke-dasharray':'8 16'}));
  for(let i=0;i<5;i++){
   const p=i*21;interior.append(svg('ellipse',{cx:330+p*2,cy:280+p/4,rx:76+p*1.9,ry:14+p*.36,stroke:'#bed2a2','stroke-width':1,fill:'none',opacity:.09}));
  }
  g.append(interior);
  // Track-edge running guides are intentionally decorative, not a prediction of lanes.
  g.append(svg('path',{d:m.outer,stroke:'#fff7dd',opacity:.45,'stroke-width':2.5,fill:'none'}));
  g.append(svg('path',{d:m.inner,stroke:'#fff6dd',opacity:.6,'stroke-width':2.5,fill:'none'}));
  // Warm light from upper left; a low-opacity reveal makes the road look less flat.
  g.append(svg('path',{d:m.outer,fill:'none',stroke:'#fff0bc','stroke-width':10,opacity:.09}));
  // Show only the part of the venue being discussed; keep the route data separate.
  const route=svg('path',{id:'introSegment',d:m.route,fill:'none',stroke:'url(#v4Gold)',
    'stroke-width':18,'stroke-linecap':'round',opacity:.96});
  g.append(route);
  g.append(svg('path',{d:m.route,fill:'none',stroke:'#fff2c9','stroke-width':3,
    'stroke-linecap':'round','stroke-dasharray':'13 17',opacity:.82,'class':'lightPath'}));
  const pulse=svg('g',{id:'introDot'});
  pulse.append(svg('circle',{r:28,fill:'#fff0ab',opacity:.12}),
    svg('circle',{r:13,fill:'#f9df9d',stroke:'#fffdf6','stroke-width':4}));
  g.append(pulse);
  // Structure silhouettes suggest a venue without claiming real stadium location.
  const architecture=svg('g',{opacity:.63});
  for(let i=0;i<8;i++){
   const x=210+i*68,y=137-(i%3)*4;
   architecture.append(svg('line',{x1:x,y1:y,x2:x+15,y2:y-15,stroke:'#9bc9ae','stroke-width':2,opacity:.42}));
  }
  g.insertBefore(architecture,extShadow);
  const ix=marks;
  function sign(pt,label,align='middle',width=160){
    const x=pt[0],y=pt[1],boxX=x-width/2,boxY=y-69;
    const s=svg('g');s.append(svg('rect',{x:boxX,y:boxY,width,height:41,rx:9,fill:'#0b3629',stroke:'#9fbf9f','stroke-width':1.4}));
    textIn(s,x,boxY+28,label,{'text-anchor':align,'font-size':17});ix.append(s);
  }
  sign(m.start,'START','middle',112);sign(m.turn,course.firstTurn.label,'middle',145);
  const card=svg('g');ix.append(card);
  card.append(svg('rect',{x:352,y:251,width:330,height:111,rx:16,fill:'#0b3027ec',stroke:'#c0d3b3','stroke-width':1.7}));
  textIn(card,517,291,'START → '+course.firstTurn.label,{'text-anchor':'middle','font-size':18,fill:'#d8e8d8'});
  textIn(card,517,342,course.firstTurn.display+'m',{'text-anchor':'middle','font-size':44,fill:'#ffdea0'});
  set('firstTurnName','START → '+course.firstTurn.label);
  set('firstTurn',course.firstTurn.display);set('firstTurnText',course.firstTurn.note);
  set('straight',course.straight);set('courseRise',course.totalElevation);
  set('surfacePill',turf?'TURF':'DIRT');
  set('slopeTag',course.spotlightText);
  set('profileFoot','坂の傾き・位置は非縮尺。総高低差 '+course.totalElevation+'m。');
  const profile=el('profileSVG');profile.replaceChildren();
  const pts=course.profile.map((v,i)=>[17+413*i/(course.profile.length-1),103-78*v]);
  const path='M'+pts.map(a=>a.map(v=>round(v)).join(',')).join(' L');
  profile.append(svg('path',{d:path+' L430 107 L17 107 Z',fill:'#dabd7f',opacity:.16}));
  profile.append(svg('path',{d:path,stroke:turf?'#c5dda8':'#efd18c','stroke-width':5,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}));
  profile.append(svg('line',{x1:14,y1:104,x2:434,y2:104,stroke:'#a2c3ad',opacity:.65}));
  textIn(profile,17,116,'START',{'font-size':11,fill:'#d0ded0'});
  textIn(profile,432,116,'GOAL',{'font-size':11,fill:'#d0ded0','text-anchor':'end'});
  const u=el('notes');u.textContent=course.venue+course.surface+course.distance+'m — 造形・コース輪郭・起伏は非縮尺の模式表現。距離・高低差の数値はコースの公表資料に基づく。参照URL: '+course.sources.join(' / ');
  set('modelLabel',m.shapeTag);
  return {route,pulse};
 }
 const caption=document.querySelector('.courseMiniLabel');
 const span=document.createElement('span');span.id='modelLabel';span.textContent='COURSE MODEL';caption.append(span);
 buildCourse=function(){return createModel()};
 // Preserve the existing narration/phase system, but travel the camera across the course gently.
 updateIntro=function(f){
   // The original Intro scene reads introSegment / introDot by ID.
   originalUpdateIntro(f);
   const t=ease(f),m=verifyModel();
   const scale=1+.075*t;
   const shift=20*t*m.camYaw;
   const group=el('courseModel'),land=el('courseLandmarks');
   const transform='translate('+round(shift,2)+' '+round(t*9,2)+') translate(520 265) scale('+round(scale,4)+') translate(-520 -265)';
   group.setAttribute('transform',transform);land.setAttribute('transform',transform);
 };
 // Preserve v3 track relief but add fine lighting and a visible elevated running surface.
 terrain=function(){
  originalTerrain();
  const root=el('terrainModel');
  const layer=svg('g',{id:'v4Shading',opacity:.8});
  // Side-edge light/track falloff; these are background accents, not speed bands.
  layer.append(svg('path',{d:'M-35 520C290 528 689 528 1110 492L1110 506C686 545 295 543 -35 534Z',
    fill:course.surfacePalette==='turf'?'#436e48':'#6e4d36',opacity:.48}));
  layer.append(svg('path',{d:'M-35 129C325 97 665 102 1110 112',
    stroke:'#fff2cc','stroke-width':9,fill:'none',opacity:.14}));
  root.append(layer);
  const overlay=el('onTrackSigns');
  // v3 duplicates both the HUD's slope label and a distance caption behind the status badge.
  // The persistent HUD and right-side copy already display these facts, so keep this area clear.
  overlay.replaceChildren();
 };
 reviewTerrain=function(){originalReview()};
 renderMarkerPositions=function(f){
  originalRenderMarkerPositions(f);
  // Composition-aware camera: cap zoom to retain the full racing group.
  const f2=ease((f-.09)/.87),z=1+.055*f2;
  const yaw=verifyModel().camYaw,pan=11*yaw*f2;
  el('actionCamera').setAttribute('transform','translate('+round(pan,2)+' '+round(-7*f2,2)+') translate(540 280) scale('+round(z,4)+') translate(-540 -280)');
 };
 // Refine marker disks without changing the 8 frame colors or data.
 const originalBuildMarkers=buildMarkers;
 buildMarkers=function(){
  originalBuildMarkers();
  for(const m of renderedMarkers.concat(reviewMarkers)){
   const g=m.node,front=g.querySelector('circle.rim');
   if(!front)continue;
   front.setAttribute('stroke-width','3.5');
   const gleam=svg('path',{d:'M-13 -12Q-5 -20 7 -17',
     fill:'none',stroke:'#ffffff','stroke-width':2.2,opacity:.45,'stroke-linecap':'round'});
   g.insertBefore(gleam,g.querySelector('text'));
  }
 };
 // Keep scene transitions and copy controlled by data, only improve visual polish.
 if(activeRace)originalLoadRace(activeRace);
})();