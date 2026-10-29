/* KBV v5: course shape and elevation reconstructed from official JRA diagrams.
   Diagram-derived geometry is approximate, not surveyed/GIS; no horse route is fact. */
'use strict';
(function(){
  const baseIntro=updateIntro, baseAction=updateAction,baseReview=reviewTerrain;
  const baseLoad=loadRace,baseBuildMarkers=buildMarkers;
  const root=window.KBV_COURSE_TRACES_V5;
  const rgbSurface={dirt:['#efd2a2','#c9a373','#ad8153'],turf:['#b7d198','#91b97a','#699367']};
  let model=null;
  const svgtext=(parent,x,y,str,a={})=>{
    const e=svg('text',{x,y,'font-family':'sans-serif','font-size':17,'font-weight':900,fill:'#f9f3e7',...a});
    e.textContent=str;parent.append(e);return e;
  };
  const pt=(x,y)=>round(x,2)+','+round(y,2);
  const poly=(parent,points,atts={})=>{
    const e=svg('polygon',{points:points.map(p=>pt(p.x,p.y)).join(' '),...atts});parent.append(e);return e;
  };
  const path=(parent,points,atts={})=>{
    const e=svg('path',{d:points.map((p,i)=>(i?'L':'M')+pt(p.x,p.y)).join(' '),fill:'none',...atts});parent.append(e);return e;
  };
  function measuredFraction(v){
    const a=model.distanceAnchors;if(!a)return(v%1+1)%1;
    v=(v%1+1)%1;
    for(let i=0;i<a.length-1;i++){const p=a[i],q=a[i+1];
      if(v>=p[0]&&v<=q[0])return mix(p[1],q[1],(v-p[0])/(q[0]-p[0]));
    }return v;
  }
  const lerpGrade=(key,v)=>{
    const g=model.trace.grade;v=measuredFraction(v);
    for(let i=0;i<g.length-1;i++){
      const a=g[i],b=g[i+1];if(v>=a[0]&&v<=b[0])return mix(a[1],b[1],(v-a[0])/(b[0]-a[0]));
    }
    return g[0][1];
  };
  function spline(closed,N=14){
    const p=closed;const n=p.length,out=[];
    const herm=(p0,p1,p2,p3,t)=>{
      const t2=t*t,t3=t2*t;
      return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);
    };
    for(let i=0;i<n;i++){
      const a=p[(i-1+n)%n],b=p[i],c=p[(i+1)%n],z=p[(i+2)%n];
      for(let j=0;j<N;j++){
        const t=j/N;
        out.push({x:herm(a[0],b[0],c[0],z[0],t),
                  y:herm(a[1],b[1],c[1],z[1],t)});
      }
    }
    const dist=[0];for(let i=1;i<out.length;i++)dist.push(dist[i-1]+Math.hypot(out[i].x-out[i-1].x,out[i].y-out[i-1].y));
    const total=dist[dist.length-1]+Math.hypot(out[0].x-out.at(-1).x,out[0].y-out.at(-1).y);
    out.forEach((p,i)=>p.f=dist[i]/total);
    return{points:out,total};
  }
  function closestF(needle){
    let nearest=model.pts[0],min=Infinity;
    for(const p of model.pts){
      const delta=(p.x-needle[0])**2+(p.y-needle[1])**2;
      if(delta<min){min=delta;nearest=p;}
    }return nearest.f;
  }
  function selectPoint(f){
    f=(f%1+1)%1;const pts=model.pts;
    let lo=0,hi=pts.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(pts[mid].f<f)lo=mid+1;else hi=mid;}
    const j=lo,i=(j-1+pts.length)%pts.length;
    const a=pts[i],b=pts[j];
    let da=a.f,db=b.f,ff=f;
    if(i>j){db+=1;if(ff<da)ff+=1}
    const t=clamp((ff-da)/(db-da||1));
    return{x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),f};
  }
  function projected(point,altitude){
    const xmin=model.bounds.xmin,ymin=model.bounds.ymin,xmax=model.bounds.xmax,ymax=model.bounds.ymax;
    const scaleX=835/(xmax-xmin),scaleY=216/(ymax-ymin);
    const x=520+(point.x-(xmin+xmax)/2)*scaleX;
    const y=298+(point.y-(ymin+ymax)/2)*scaleY-(altitude+1.2)*6.2;
    return{x,y};
  }
  function crossSection(f){
    const p=selectPoint(f),other=selectPoint(f+.002);
    const tx=other.x-p.x,ty=other.y-p.y,len=Math.hypot(tx,ty)||1;
    const normal={x:-ty/len,y:tx/len},half=model.trackWidth/2;
    const h=lerpGrade(null,f),sign=model.trace.rotation==='left'?-1:1;
    return{inside:projected({x:p.x+sign*half*normal.x,y:p.y+sign*half*normal.y},h),
           outside:projected({x:p.x-sign*half*normal.x,y:p.y-sign*half*normal.y},h),
           ground:projected(p,0),center:projected(p,h),height:h};
  }
  function drawModel(){
    const m=model,root=el('courseModel'),marks=el('courseLandmarks');
    root.replaceChildren();marks.replaceChildren();
    const g=svg('g');root.append(g);
    g.append(svg('ellipse',{cx:520,cy:445,rx:462,ry:60,fill:'#001a12',opacity:.7}));
    const turf=course.surfacePalette==='turf',cols=rgbSurface[course.surfacePalette]||rgbSurface.dirt;
    const samples=[];
    for(let i=0;i<230;i++)samples.push(crossSection(i/230));
    // Infield from closed inner boundary, consistent source direction.
    poly(g,samples.map(q=>q.inside),{fill:'#24583d',opacity:.96});
    for(let i=0;i<samples.length;i++){
      const a=samples[i],b=samples[(i+1)%samples.length],side=svg('g');
      if((a.outside.y+b.outside.y)/2>300)
        poly(g,[a.outside,b.outside,{x:b.outside.x,y:b.outside.y+17},{x:a.outside.x,y:a.outside.y+17}],
          {fill:turf?'#466b45':'#725238',opacity:.88});
      const fill=turf?'#86ad78':'#d0ad7e';
      poly(g,[a.inside,b.inside,b.outside,a.outside],
        {fill,stroke:fill,'stroke-width':.45});
    }
    // The two rail-edge lines use the same traced curve and elevation.
    const inn=samples.map(q=>q.inside),out=samples.map(q=>q.outside);
    path(g,inn.concat(inn[0]),{stroke:'#fff4dc','stroke-width':3.4,opacity:.9});
    path(g,out.concat(out[0]),{stroke:turf?'#cde2bc':'#f6e5bc','stroke-width':2.4,opacity:.75});
    // highlight the authentic first-corner approach with no arbitrary segment coordinates.
    const route=[];
    for(let i=0;i<=100;i++){
      const f=(m.startF+m.toCorner*(i/100))%1;
      route.push(crossSection(f).center);
    }
    const run=path(g,route,{id:'introSegment',stroke:'#f2c879','stroke-width':9,'stroke-linecap':'round',opacity:.96});
    path(g,route,{stroke:'#fff4c0','stroke-width':2.3,'stroke-dasharray':'8 13','class':'lightPath'});
    const dot=svg('g',{id:'introDot'});
    dot.append(svg('circle',{r:19,fill:'#f9d487',opacity:.15}),svg('circle',{r:9,fill:'#f9d487',stroke:'#ffffff','stroke-width':3}));
    g.append(dot);
    const a=crossSection(m.startF).center,b=crossSection(m.turnF).center;
    const target=(p,label)=>{
      const g=svg('g');marks.append(g);
      const bx=clamp(p.x-65,12,897),by=clamp(p.y-63,9,476);
      g.append(svg('rect',{x:bx,y:by,width:130,height:37,rx:8,fill:'#123e2c',stroke:'#b3cbb4','stroke-width':1.3}));
      svgtext(g,bx+65,by+25,label,{'text-anchor':'middle','font-size':16});
    };
    target(a,'START');target(b,course.firstTurn.label);
    const finish=crossSection(0).center;
    marks.append(svg('line',{x1:round(finish.x),y1:round(finish.y-9),x2:round(finish.x),y2:round(finish.y+10),stroke:'#fffdf7','stroke-width':3.2}));
    const goalLabel=svg('g');marks.append(goalLabel);
    const gx=clamp(finish.x-45,10,945),gy=clamp(finish.y+21,5,491);
    goalLabel.append(svg('rect',{x:gx,y:gy,width:90,height:29,rx:7,fill:'#12362a',stroke:'#b7caa9','stroke-width':1.1}));
    svgtext(goalLabel,gx+45,gy+21,'GOAL',{'text-anchor':'middle','font-size':13});
    const c=svg('g');marks.append(c);
    c.append(svg('rect',{x:356,y:270,width:338,height:90,rx:13,fill:'#0c382ce8',stroke:'#d4ca89','stroke-width':1.8}));
    svgtext(c,525,303,'START → '+course.firstTurn.label,{'text-anchor':'middle','font-size':16,fill:'#dfead7'});
    svgtext(c,525,345,course.firstTurn.display+'m',{'text-anchor':'middle','font-size':35,fill:'#ffdc92'});
    set('modelLabel',m.trace.innerLabel+' / JRA図トレース');
    set('firstTurnName','START → '+course.firstTurn.label);
    set('firstTurn',course.firstTurn.display);set('firstTurnText',course.firstTurn.note);
    set('straight',course.straight);set('courseRise',course.totalElevation);
    set('surfacePill',turf?'TURF':'DIRT');
    set('slopeTag',course.spotlightText);
    set('profileFoot','JRA高低断面図から概略読み取り。標高位置・角度は非縮尺。');
    const profile=el('profileSVG');profile.replaceChildren();
    const data=m.trace.grade.map(([f,h])=>({x:13+416*f,y:95-(h+2.7)*14.6}));
    path(profile,data,{stroke:turf?'#d1e6a7':'#f3d28c','stroke-width':4,'stroke-linecap':'round'});
    profile.append(svg('line',{x1:12,y1:95,x2:437,y2:95,stroke:'#a5beac',opacity:.45}));
    svgtext(profile,16,116,'GOAL',{'font-size':11,fill:'#cfdfd0'});
    svgtext(profile,431,116,'GOAL',{'text-anchor':'end','font-size':11,fill:'#cfdfd0'});
    set('notes',m.trace.source+'。コース輪郭は公式平面図からの手動トレース、起伏は公式断面図からの概略数値化。実測GIS・測量3Dではありません。各馬の進路はKBVの想定入力値です。');
  }
  function createTrace(){
    const t=root[course.id];
    if(!t)throw Error('DATA ERROR: JRAトレース未登録。コースを楕円に自動補完しません: '+course.id);
    const a=spline(t.center);
    const trace={trace:t,pts:a.points,lapPixelLength:a.total,
       trackWidth:a.total*(t.widthMeters/t.lapMeters),bounds:{
       xmin:Math.min(...a.points.map(x=>x.x)),xmax:Math.max(...a.points.map(x=>x.x)),
       ymin:Math.min(...a.points.map(x=>x.y)),ymax:Math.max(...a.points.map(x=>x.y)) }};
    model=trace;
    model.startF=closestF(t.start);model.turnF=closestF(t.firstCorner);
    model.toCorner=(model.turnF-model.startF+1)%1;
    const startDistance=t.lapMeters-(course.distance%t.lapMeters);
    const turnDistance=(startDistance+course.firstTurn.distance)%t.lapMeters;
    const anchors=[[0,0],[model.startF,startDistance/t.lapMeters],
      [model.turnF,turnDistance/t.lapMeters],[1,1]].sort((a,b)=>a[0]-b[0]);
    for(let i=1;i<anchors.length;i++){
      if(anchors[i][1]<=anchors[i-1][1])throw Error('DATA ERROR: traced route and official start/turn ordering disagree');
    }
    model.distanceAnchors=anchors;
    if(model.toCorner<.05||model.toCorner>.6)throw Error('DATA ERROR: source trace start/corner path invalid');
    // JRA profile chart digitized heights; normalize for the existing v3 grade HUD.
    // This is derived from source diagram, NOT invented with a random up-down curve.
    const samples=[];
    for(let j=0;j<10;j++){
      const f=(model.startF+model.toCorner*j/9)%1;
      samples.push(lerpGrade(null,f));
    }
    const min=Math.min(...samples),max=Math.max(...samples);
    course.approachRelief=samples.map(v=>max===min?.5:(v-min)/(max-min));
    return trace;
  }
  buildCourse=function(){
    createTrace();drawModel();
  };
  const introBefore=updateIntro;
  updateIntro=function(f){introBefore(f);const val=ease(f),s=1+.09*val,tx=val*8;
    for(const id of ['courseModel','courseLandmarks'])
      el(id).setAttribute('transform','translate('+round(tx)+' '+round(val*6)+') translate(520 260) scale('+round(s,3)+') translate(-520 -260)');
  };
  // A zoomed course segment follows the ACTUAL traced centerline (not a hand-drawn
  // linear bend). Scene positions are illustrative but share this map geometry.
  const routeOffset=(u)=>{
    const start=selectPoint(model.startF),end=selectPoint(model.turnF);
    const f=(model.startF+model.toCorner*clamp(u))%1;
    const q=selectPoint(f);
    const dx=end.x-start.x,dy=end.y-start.y,len=Math.hypot(dx,dy)||1;
    const chord={x:mix(start.x,end.x,clamp(u)),y:mix(start.y,end.y,clamp(u))};
    return ((q.x-chord.x)*(-dy)+(q.y-chord.y)*dx)/len;
  };
  function onRoute(u){
    const p=clamp(u),f=(model.startF+model.toCorner*p)%1;
    const z=lerpGrade(null,f)-lerpGrade(null,model.startF);
    const deviation=routeOffset(p);
    const x=course.rotation==='left'?mix(936,163,p):mix(144,917,p);
    // The grade uses the JRA profile; the visual camera exaggerates height only
    // and DOES NOT claim any measured slope angle or speed.
    return{x,y:357+deviation*.48-z*9};
  }
  function pathAt(u){
    if(u>=0&&u<=1)return onRoute(u);
    // Extend the tangent outside the visible segment so the road itself does not
    // collapse into a vertical boundary at the ends of the SVG.
    const left=u<0,edge=left?0:1,near=onRoute(left?.008:.992),end=onRoute(edge);
    const delta=(u-edge)/(left?.008:-.008);
    return{x:end.x+(end.x-near.x)*(-delta),y:end.y+(end.y-near.y)*(-delta)};
  }
  function fieldPos(u,lane){
    const a=pathAt(u),b=pathAt(u+.007),dx=b.x-a.x,dy=b.y-a.y;
    const l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;
    // Always put "inner" on the near rail of the displayed course;
    // left/right-handed geometry is handled by the route/camera orientation.
    const offset=(lane-.5)*263*(course.rotation==='left'?1:-1);
    return{x:a.x+nx*offset,y:a.y+ny*offset};
  }
  sampleTarget=function(h,kind){
    // Identical horse positions in the action and the review: no teleport on the cut.
    // In both views the terrain and camera may change, but the lane/progress data do not.
    return fieldPos(.91-.73*h.formation.progress,clamp(h.formation.lane,.06,.84));
  };
  const gateLane=(h)=>{
    const sorted=activeRace.runners.slice().sort((a,b)=>a.number-b.number);
    const i=sorted.findIndex(x=>x.number===h.number);
    if(i<0)throw Error('DATA ERROR: marker does not exist in race');
    return i/Math.max(1,sorted.length-1);
  };
  gatePosition=function(h){return fieldPos(.02,gateLane(h));};
  // There is only ONE horse/course-distance source for animation and map HUD.
  // The time-progress mapping remains a visualization, not real pace/sectional data.
  const horseDistance=(h,sceneProgress)=>{
    const forward=ease((sceneProgress-.04)/.88);
    const dest=.91-.73*h.formation.progress;
    return mix(.02,dest,forward);
  };
  window.KBV_COURSE_MOTION_V7=Object.freeze({
    position(h,f){
      const lane=mix(gateLane(h),h.formation.lane,ease((f-.16)/.78));
      const u=horseDistance(h,f);
      return fieldPos(u,lane);
    },
    reference(f){
      const hs=activeRace.runners.slice().sort((a,b)=>
        a.formation.progress-b.formation.progress||a.number-b.number);
      if(!hs.length)throw Error('DATA ERROR: no runners for slope reference');
      const h=hs[0];
      return Object.freeze({number:h.number,u:horseDistance(h,f),
        method:'projected-frontmost-runner',sourceType:'PREDICTION_RENDER_ONLY'});
    },
    // Course geometry is traced/approximate; do not send these pixels to PICK.
    modelQuality:'JRA_DIAGRAM_APPROXIMATE',
  });
  // The inset identifies the exact segment used by the enlarged racing view.
  // It shares the same traced path and START/turn anchors as the full course map.
  function mapPoint(q){
    const b=model.bounds,rx=(q.x-b.xmin)/(b.xmax-b.xmin),ry=(q.y-b.ymin)/(b.ymax-b.ymin);
    return{x:27+rx*266,y:30+ry*117};
  }
  function drawMiniMap(){
    const stage=document.querySelector('.trackStage');
    let container=el('miniMapV6');
    if(!container){
      container=document.createElement('div');container.id='miniMapV6';
      container.innerHTML='<div class="miniMapTitle">COURSE POSITION <span>スタート → コーナー</span></div><svg viewBox="0 0 320 180" id="miniSvgV6" aria-label="公式コース図を基にした現在位置"><g id="miniPathsV6"></g><circle id="miniDotV6" r="7" fill="#f8db93" stroke="#fff" stroke-width="3"/><circle id="miniHaloV6" r="13" fill="none" stroke="#f8db93" stroke-width="2" opacity=".5"/></svg><div class="miniMapSource">JRA図を基に作図・非縮尺</div>';
      stage.append(container);
    }
    const root=el('miniPathsV6');root.replaceChildren();
    const pts=model.pts.map(mapPoint);
    const full=path(root,pts.concat(pts[0]),{stroke:'#6fa992','stroke-width':10,opacity:.55,'stroke-linecap':'round','stroke-linejoin':'round'});
    path(root,pts.concat(pts[0]),{stroke:'#e4e9c9','stroke-width':2.2,opacity:.68,'stroke-linecap':'round','stroke-linejoin':'round'});
    const highlight=[];
    for(let i=0;i<=90;i++)highlight.push(mapPoint(selectPoint((model.startF+model.toCorner*i/90)%1)));
    path(root,highlight,{stroke:'#f9d481','stroke-width':6,'stroke-linecap':'round','stroke-linejoin':'round'});
    for(const [coord,text] of [[mapPoint(selectPoint(model.startF)),'S'],[mapPoint(selectPoint(model.turnF)),'1']]){
      root.append(svg('circle',{cx:round(coord.x),cy:round(coord.y),r:8,fill:'#153729',stroke:'#ffe0a1','stroke-width':1.5}));
      svgtext(root,coord.x,coord.y+4,text,{'text-anchor':'middle','font-size':10,fill:'#ffedc3'});
    }
    updateMiniMap(0);
  }
  function updateMiniMap(progress){
    // At the gate the two outside numbers sit under the inset. Reveal the map
    // only once they have moved past it; never hide a runner number behind UI.
    el('miniMapV6').style.opacity=round(clamp((progress-.27)/.10),3);
    const f=(model.startF+model.toCorner*clamp(progress))%1;
    const q=mapPoint(selectPoint(f));
    for(const id of ['miniDotV6','miniHaloV6']){
      el(id).setAttribute('cx',round(q.x,2));el(id).setAttribute('cy',round(q.y,2));
    }
  }
  function trackAction(){
    const parent=el('terrainModel'),gr=el('terrainGrain'),gates=el('gateModel'),annotations=el('onTrackSigns');
    parent.replaceChildren();gr.replaceChildren();gates.replaceChildren();annotations.replaceChildren();
    parent.append(svg('rect',{width:1080,height:555,fill:'#2b654c'}));
    const turf=course.surfacePalette==='turf',s=[];
    for(let i=0;i<=100;i++){
      const u=-.19+1.4*i/100,a=fieldPos(u,0),b=fieldPos(u,1);
      s.push({a,b});
    }
    poly(parent,s.map(q=>q.a).concat(s.map(q=>q.b).reverse()),
      {fill:turf?'#85aa73':'#c7a178',stroke:turf?'#acc798':'#e1c7a0','stroke-width':2});
    for(let i=0;i<100;i++){
      const a=s[i],b=s[i+1];
      poly(parent,[a.a,b.a,{x:b.a.x,y:b.a.y+16},{x:a.a.x,y:a.a.y+16}],
        {fill:turf?'#365a36':'#66462c',opacity:.6});
    }
    if(!turf)poly(gr,s.map(q=>q.a).concat(s.map(q=>q.b).reverse()),
      {fill:'url(#grain)',opacity:.55});
    const near=s.map(q=>q.a),far=s.map(q=>q.b);
    path(parent,near,{stroke:'#fff7e0','stroke-width':10});
    path(parent,far,{stroke:'#f6edce','stroke-width':4,opacity:.85});
    for(let i=0;i<=36;i++){
      const p=fieldPos(i/36,0),size=10;
      parent.append(svg('line',{x1:p.x,y1:p.y,x2:p.x,y2:p.y-15,
        stroke:'#faf7d8','stroke-width':2,opacity:.9}));
    }
    // Linear guide aligned to the actual start->corner trajectory, no synthetic lap clock.
    const middle=s.map(q=>({x:(q.a.x+q.b.x)/2,y:(q.a.y+q.b.y)/2}));
    path(parent,middle,{stroke:'#fff1d0','stroke-width':1.8,'stroke-dasharray':'11 19',opacity:.43});
    const sign=course.rotation==='left'?'◀':'▶';
    // The matching position inset provides this heading; no overlapping label.
    el('terrainModel').dataset.reconstruction='jra-traced-v6';
    drawMiniMap();
  }
  const baseTerrain=terrain;
  terrain=function(){baseTerrain();trackAction()};
  const renderBefore=renderMarkerPositions;
  renderMarkerPositions=function(f){renderBefore(f)};
  const buildBefore=buildMarkers;
  buildMarkers=function(){buildBefore()};
  const reviewBefore=reviewTerrain;
  reviewTerrain=function(){reviewBefore();};
  const actionBefore=updateAction;
  updateAction=function(f){actionBefore(f);
    const marker=window.KBV_COURSE_MOTION_V7.reference(f);
    const u=marker.u;
    updateMiniMap(u);
    if(typeof window.KBV_ELEVATION_RENDER_V7!=='function')throw Error('DATA ERROR: elevation renderer missing');
    window.KBV_ELEVATION_RENDER_V7(u);
    const a=course.approachRelief,k=Math.min(a.length-2,Math.floor(u*(a.length-1)));
    const slope=a[k+1]-a[k];
    const tag=u<.07?'発走直後':u>.88?'コーナー手前':
      slope>.04?'上り':slope<-.04?'下り':'起伏小';
    set('gradeStage',tag);
    set('gradeName',course.formationSlopeLabel);
    set('gradeReferenceV7','先頭想定 '+marker.number+'番の概略位置');
    set('distanceCount','先頭位置に連動した模式表示 ／ 区間 '+course.firstTurn.display+'m');
  };
  // Registered course geometry and traced grade are required; never fabricate missing courses.
  const oldCourseValidate=checkCourse;
  checkCourse=function(c){oldCourseValidate(c);if(!root[c.id])throw Error('DATA ERROR: JRAコーストレース未登録 '+c.id)};
  const gradeReference=document.querySelector('#gradeHud .gradeFoot span:nth-child(2)');
  if(!gradeReference)throw Error('DATA ERROR: elevation reference label missing');
  gradeReference.id='gradeReferenceV7';
  loadRace(activeRace||window.KBV_RACES.tokyo);
})();