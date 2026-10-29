/* KBV Scene03 v3 — illustrative terrain / camera upgrade.
   Requires the original v2 application. No surveyed geometry is inferred. */
'use strict';
(function(){
 const baseTerrain=terrain;
 const baseBuildCourse=buildCourse;
 const baseUpdateIntro=updateIntro;
 const baseUpdateAction=updateAction;
 const baseRenderMarkerPositions=renderMarkerPositions;
 const baseSampleTarget=sampleTarget;
 const baseReviewTerrain=reviewTerrain;
 const rootAction=document.querySelector('.trackStage');
 const hud=document.createElement('div');hud.id='gradeHud';hud.innerHTML=
   '<div class="gradeHead"><span class="gradeFlag">ELEVATION / 起伏（模式）</span><span class="gradeStage" id="gradeStage">APPROACH</span></div>'+
   '<div class="gradeName" id="gradeName"></div>'+
   '<svg class="gradeSVG" viewBox="0 0 390 76" aria-label="最初のコーナーまでの起伏の模式図" role="img"><path id="gradeFill"/><path id="gradeLine"/><line x1="15" y1="66" x2="377" y2="66" class="gradeBase"/><g id="gradeCursor"><circle r="7" class="gradeDot"/><circle r="15" class="gradeGlow"/></g></svg>'+
   '<div class="gradeFoot"><span>START</span><span>勾配は説明用・非縮尺</span><span id="gradeFinish">TURN</span></div>';
 rootAction.appendChild(hud);
 // The course's visual elevation profile and sectional elevation are authoring input,
 // not measured height data. Keep this separate from JRA's factual numerical fields.
 function approach(){
  const v=course.approachRelief;
  if(!Array.isArray(v)||v.length<3||v.some(x=>!Number.isFinite(x)||x<0||x>1))
    throw Error('DATA ERROR: course.approachRelief missing / invalid; do not synthesize slopes');
  return v;
 }
 function heightAt(t){
  const a=approach(),v=clamp(t)*(a.length-1),i=Math.min(a.length-2,Math.floor(v));
  return mix(a[i],a[i+1],v-i);
 }
 function tForX(x){return course.rotation==='left'?clamp((920-x)/735):clamp((x-166)/735)}
 function trackPoint(x,lane){
  const rise=heightAt(tForX(x))*29;
  const yy=lane===0?159:lane===1?506:533;
  return {x,y: yy - 0.047*x - rise + (lane===1?35*Math.sin(Math.PI*x/1080):0)};
 }
 function trackPolyline(ln,points=30){const arr=[];for(let i=0;i<=points;i++)arr.push(trackPoint(-30+(1140*i/points),ln));return arr}
 function drawSurface(){
  const base=el('terrainModel'),gr=el('terrainGrain');base.replaceChildren();gr.replaceChildren();
  const far=trackPolyline(0),near=trackPolyline(2),rail=trackPolyline(1);
  const flipped=course.rotation==='right',turf=course.surfacePalette==='turf';
  const long=e=>e.map(p=>round(p.x)+','+round(p.y)).join(' ');
  base.append(svg('rect',{width:1080,height:555,fill:'url(#actionGrass)'}));
  base.append(svg('ellipse',{cx:535,cy:565,rx:635,ry:85,fill:'#0c261b',opacity:.4}));
  // Visible side face of the raised track. Profile varies with view x but is not to scale.
  const under=near.map(p=>({x:p.x,y:p.y+22}));
  base.append(svg('polygon',{points:long(near.concat(under.slice().reverse())),fill:turf?'#496b43':'#6c4a35',opacity:.92}));
  base.append(svg('polygon',{points:long(far.concat(near.slice().reverse())),fill:turf?'#739d69':'url(#actionSand)'}));
  if(!turf)gr.append(svg('polygon',{points:long(far.concat(near.slice().reverse())),fill:'url(#grain)',opacity:.75}));
  // Hillock side shading: perspective cues, not a surveyed hill grade
  const slice=[];
  for(let i=0;i<=40;i++){
    const x=22+1040*i/40, y=trackPoint(x,0).y;
    slice.push({x,y:y+4});
  }
  base.append(svg('polyline',{points:long(slice),fill:'none',stroke:'#ffffd1',opacity:.18,'stroke-width':15}));
  base.append(svg('polyline',{points:long(far),fill:'none',stroke:turf?'#d8eab5':'#f9e5c9','stroke-width':5,opacity:.8}));
  base.append(svg('polyline',{points:long(near),fill:'none',stroke:'#fdf6df','stroke-width':12,opacity:.96}));
  base.append(svg('polyline',{points:long(near.map(p=>({x:p.x,y:p.y+3}))),fill:'none',stroke:'#789b6c','stroke-width':3,opacity:.95}));
  // Subtle parallel trajectories help convey a continuous riding surface; not inferred horse lanes.
  for(let f of [.34,.7]){
   const points=far.map((p,i)=>({x:p.x,y:mix(p.y,near[i].y,f)}));
   base.append(svg('polyline',{points:long(points),fill:'none',stroke:'#fff5d0',opacity:.13,'stroke-width':2,'stroke-dasharray':'13 23'}))
  }
  // Repeated fence posts on near rail, drawn in perspective order
  for(let x=18;x<=1080;x+=56){
    const p=trackPoint(x,2),elev=16+8*(x/1080);
    base.append(svg('path',{d:'M'+round(x)+' '+round(p.y)+'l0 '+(-round(elev)),stroke:'#f2f5e8','stroke-width':2.4,opacity:.83}));
    base.append(svg('circle',{cx:round(x),cy:round(p.y-elev),r:2,fill:'#ffffff'}));
  }
  // Course position badge, independent of the fictive grade model
  const label=document.createElementNS(NS,'text');
  label.setAttribute('x','810');label.setAttribute('y','85');
  label.setAttribute('fill','#f9ead6');label.setAttribute('font-size','16');label.setAttribute('font-weight','900');
  label.textContent='最初のコーナーまで '+course.firstTurn.display+'m';base.append(label);
  base.dataset.handedness=flipped?'right':'left';base.dataset.terrain='2.5d-relief-v3';
 }
 terrain=function(){baseTerrain();drawSurface();renderGrade(0);};
 sampleTarget=function(h,kind){
  const p=baseSampleTarget(h,kind);
  // A small terrain-aware adjustment of the on-course marker projection
  if(kind==='action')p.y-=heightAt(tForX(p.x))*9;
  return p;
 };
 // Visual evidence separate from measured slope data: render a labeled illustration.
 function renderGrade(f){
  const a=approach(),svgPts=a.map((v,i)=>({x:15+362*i/(a.length-1),y:59-38*v}));
  const str=(x)=>round(x.x)+','+round(x.y);
  const points=svgPts.map(str).join(' ');
  el('gradeFill').setAttribute('d','M'+points.replaceAll(' ',' L')+' L377,66 L15,66 Z');
  el('gradeLine').setAttribute('d','M'+points.replaceAll(' ',' L'));
  const g=heightAt(f),cx=15+362*f,cy=59-38*g;
  el('gradeCursor').setAttribute('transform','translate('+round(cx,2)+','+round(cy,2)+')');
  set('gradeName',course.formationSlopeLabel);
  set('gradeFinish',course.firstTurn.label);
  set('gradeStage',f<.12?'START':f>.88?'TURN APPROACH':'UP / DOWN');
 }
 // The final route-motion module can drive this from the actual projected lead position.
 window.KBV_ELEVATION_RENDER_V7=renderGrade;
 updateAction=function(f){
  baseUpdateAction(f);renderGrade(f);
  // Label this correctly: projected motion isn't real meters or elapsed race time.
  set('distanceCount','コーナーまで '+course.firstTurn.display+'m ／ 動きは想定イメージ');
 };
 renderMarkerPositions=function(f){
  baseRenderMarkerPositions(f);
  // Subtle tracking shot, with range limits chosen so the field stays in frame.
  const v=ease((f-.14)/.8),z=1+v*.065;
  const dx=course.rotation==='left'?-12*v:12*v;
  const dy=-6*v;
  el('actionCamera').setAttribute('transform',
     'translate('+round(dx)+' '+round(dy)+') translate(540 276) scale('+round(z,4)+') translate(-540 -276)');
 };
 // Stadium is a functional location cue; no architecture is asserted as surveyed.
 function enhanceCourseModel(){
  const parent=el('courseModel');const world=parent.firstElementChild;if(!world)return;
  const deco=svg('g',{opacity:.93});
  // External embankment terraces for scale. Keep them behind top road model.
  for(let j=0;j<4;j++){
   deco.append(svg('path',{
     d:'M190 '+(155-j*9)+' C340 '+(80-j*9)+' 700 '+(80-j*9)+' 854 '+(154-j*9),
     stroke:j%2?'#244c39':'#347755','stroke-width':6,fill:'none',opacity:.36
   }))
  }
  world.insertBefore(deco,world.firstChild);
  // Additional topographic contour inside infield, not a track path.
  const green=svg('g',{opacity:.6});
  green.append(svg('path',{d:'M288 284Q490 222 731 280',stroke:'#a8d4a4','stroke-width':2,fill:'none','stroke-dasharray':'8 18'}));
  green.append(svg('path',{d:'M272 319Q503 250 745 320',stroke:'#a8d4a4','stroke-width':2,fill:'none','stroke-dasharray':'8 18'}));
  world.append(green);
  // Exposed side bank adds a clear height cue to the rail section.
  const bank=svg('g');
  bank.append(svg('path',{d:'M153 384 C302 448 690 449 816 389L816 422C684 478 310 482 153 412Z',fill:'#4d3628',opacity:.39}));
  // do not cover the horses, this is a course-only world
  world.append(bank);
 }
 buildCourse=function(){
  const ret=baseBuildCourse();
  enhanceCourseModel();
  return ret;
 };
 updateIntro=function(f){
  baseUpdateIntro(f);
  // Keep the original course zoom but add subtle pan for a cinematic move.
  const g=el('courseModel'),h=el('courseLandmarks');
  const drift=ease(f),old=g.getAttribute('transform')||'';
  const matrix='translate('+round(-18*drift,2)+' '+round(5*drift,2)+') '+old;
  g.setAttribute('transform',matrix);h.setAttribute('transform',matrix);
 };
 const baseCourseModel=reviewTerrain;
 reviewTerrain=function(){baseCourseModel();const g=el('reviewTerrain');
   // Route marker keeps overview legible; no meter distances on this view.
   const s=svg('g');
   s.append(svg('rect',{x:193,y:25,width:308,height:41,rx:8,fill:'#104331',opacity:.95}));
   const text=svg('text',{x:210,y:51,fill:'#fce1a2','font-size':17,'font-weight':900});text.textContent=course.firstTurn.label+'までに形成した隊列';s.append(text);g.append(s);
 };
 // Recreate using updated functions; preserve current data only.
 // V7 defers the first race load until its route-motion model is installed.
 if(activeRace)loadRace(activeRace);
})();