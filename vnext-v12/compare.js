import * as THREE from './three.module.js';

const trace=window.KBV_COURSE_TRACES_V5?.['tokyo-d1400'];
const data=window.KBV_RACES?.tokyo;
if(!trace||!data||data.runners.length!==16)throw Error('DATA ERROR: authentic course trace or 16-runner sample unavailable');
const view=document.querySelector('#sceneCanvas');
const renderer=new THREE.WebGLRenderer({canvas:view,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);
renderer.setSize(1560,592,false);
renderer.setClearColor(0x0e3025);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.31;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#1d4230');
scene.fog=new THREE.Fog('#1d4230',35,92);
const ambient=new THREE.HemisphereLight(0xe8f7ff,0x31533b,2.05);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffe7b3,3.45);
sun.position.set(-13,27,22);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:95});
sun.shadow.bias=-.0007;sun.shadow.normalBias=.019;
scene.add(sun);
const fill=new THREE.DirectionalLight(0xb1dfd3,.65);fill.position.set(16,10,-13);scene.add(fill);

const scale=.066;
const source=trace.center.map(([x,z])=>new THREE.Vector3((x-270)*scale,0,(z-178)*scale));
const curve=new THREE.CatmullRomCurve3(source,true,'centripetal',.5);
const N=320, width=1.75;
const pts=[], normals=[];
const area=source.reduce((s,p,i)=>{const q=source[(i+1)%source.length];return s+p.x*q.z-q.x*p.z},0);
const innerSign=area>=0?1:-1;
function centerAt(t){return curve.getPointAt((t%1+1)%1)}
function normalAt(t){const v=curve.getTangentAt((t%1+1)%1);return new THREE.Vector3(-v.z,0,v.x).normalize().multiplyScalar(innerSign)}
function grade(t){const a=trace.grade;for(let i=1;i<a.length;i++)if(t<=a[i][0]){const f=(t-a[i-1][0])/(a[i][0]-a[i-1][0]);return a[i-1][1]+(a[i][1]-a[i-1][1])*f}return a.at(-1)[1]}
function heightAt(t,rich){return rich?(.43+(grade(t)-Math.min(...trace.grade.map(x=>x[1])))*.08):.20}
for(let i=0;i<=N;i++){const t=i/N;pts.push(centerAt(t));normals.push(normalAt(t))}
function nearestF(xy){
 const test=new THREE.Vector3((xy[0]-270)*scale,0,(xy[1]-178)*scale);
 let best={t:0,d:Infinity};
 for(let i=0;i<600;i++){const p=centerAt(i/600),d=p.distanceToSquared(test);if(d<best.d)best={t:i/600,d}}
 return best.t;
}
const startF=nearestF(trace.start),cornerF=nearestF(trace.firstCorner);
const toCorner=(cornerF-startF+1)%1;
if(toCorner<=.07||toCorner>=.5)throw Error('DATA ERROR: start and corner ordering invalid');
function routeF(u){return (startF+toCorner*u)%1}
function onTrack(t,lane,rich){const p=centerAt(t),n=normalAt(t);return p.addScaledVector(n,(.5-lane)*width).setY(heightAt(t,rich)+.11)}
function rand(seed){let x=Math.sin(seed*127.1+25.6)*43758.5453123;return x-Math.floor(x)}
function material(hex,rich=false,extra={}){
 return rich?new THREE.MeshStandardMaterial({color:hex,roughness:.94,metalness:0,...extra}):
  new THREE.MeshBasicMaterial({color:hex,...extra});
}
function ribbon(rich,upper=true){
 const positions=[],uv=[],indices=[],colors=[];
 const colA=new THREE.Color(rich?'#b78b58':'#bd9d6d'),colB=new THREE.Color(rich?'#ddba89':'#dfc496');
 for(let i=0;i<=N;i++){
  const t=i/N,p=pts[i],n=normals[i],y=upper?heightAt(t,rich):.015;
  for(let j=0;j<=1;j++){
   const side=j===0?-.5:.5;
   positions.push(p.x+n.x*side*width,y,p.z+n.z*side*width);
   uv.push(j,i*14/N);
   const c=colA.clone().lerp(colB,(j*.30)+.38+(rich?Math.sin(t*60)*.045:0));
   colors.push(c.r,c.g,c.b);
  }
  if(i<N){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(positions.length).fill(0),3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.setIndex(indices);geo.computeVertexNormals();
 return geo;
}
function terrainTexture(color1,color2,seed){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.fillStyle=color1;ctx.fillRect(0,0,512,512);
 for(let i=0;i<19000;i++){
  const x=rand(i*3+seed)*512,y=rand(i*5+seed+13)*512;
  ctx.globalAlpha=.06+.22*rand(i*7+seed);
  ctx.fillStyle=i%3===0?color2:'#ffffff';
  ctx.fillRect(x,y,.4+rand(i*8+seed)*2,.3+rand(i*9+seed)*1.5);
 }
 ctx.globalAlpha=1;
 const texture=new THREE.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(3,10);texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=4;
 return texture;
}
const grassTexture=terrainTexture('#416349','#28432f',9);
const dirtTexture=terrainTexture('#b79c7e','#7b6550',2);
function addGround(group,rich){
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,85),
  rich?material('#a0ba95',true,{map:grassTexture}):material('#376a51'));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.18;ground.receiveShadow=true;group.add(ground);

 if(rich){
  const stripes=new THREE.Group();
  for(let i=0;i<34;i++){
   const tile=new THREE.Mesh(new THREE.PlaneGeometry(2.2,44),new THREE.MeshBasicMaterial({color:i%2?'#7cac6b':'#2c6b43',transparent:true,opacity:.017,depthWrite:false}));
   tile.rotation.x=-Math.PI/2;tile.position.set((i-17)*2.2,-.147,0);stripes.add(tile);
  }group.add(stripes);
 }
 const shade=new THREE.Mesh(new THREE.PlaneGeometry(58,30),
   new THREE.MeshBasicMaterial({color:0x0e2920,transparent:true,opacity:0,depthWrite:false}));
 shade.rotation.x=-Math.PI/2;shade.position.set(0,-.145,0);group.add(shade);
}
function tube(points,radius,mat,closed=false){
 const curve3=new THREE.CatmullRomCurve3(points,closed,'centripetal');
 const geometry=new THREE.TubeGeometry(curve3,Math.max(48,points.length*2),radius,richSides(mat),closed);
 const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function richSides(mat){return mat.type==='MeshBasicMaterial'?5:8}
function edgePoints(lane,rich,addHeight=0){
 return Array.from({length:161},(_,i)=>{const t=i/160;const p=onTrack(t,lane,rich);p.y+=addHeight;return p});
}
function addCourse(group,rich){
 addGround(group,rich);
 const top=new THREE.Mesh(ribbon(rich),rich?
  new THREE.MeshStandardMaterial({color:'#e2d0b5',vertexColors:true,map:dirtTexture,roughness:1,metalness:0,side:THREE.DoubleSide}):
  new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
 top.castShadow=rich;top.receiveShadow=rich;group.add(top);
 const walls=[];
 for(const lane of [0,1]){
  const pos=[],indices=[];
  for(let i=0;i<=N;i++){
   const t=i/N,q=onTrack(t,lane,rich);
   pos.push(q.x,q.y-.11,q.z,q.x,.008,q.z);
   if(i<N){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material(rich?'#71533a':'#8d754f',rich,{side:THREE.DoubleSide}));
  mesh.castShadow=rich;mesh.receiveShadow=rich;group.add(mesh);walls.push(mesh);
 }
 // Genuine independent rail tubes + supported posts in the 3D version.
 const railMat=material(rich?'#f9fbef':'#fff1ce',rich,{roughness:.39});
 for(const lane of [0,1]){
  const points=edgePoints(lane,rich,rich?.45:.10);
  group.add(tube(points,rich?.042:.027,railMat,true));
  if(rich){
   const support=new THREE.CylinderGeometry(.023,.029,.45,6);
   for(let i=0;i<84;i++){
     const f=i/84,point=onTrack(f,lane,rich);
     const post=new THREE.Mesh(support,railMat);
     post.position.set(point.x,point.y+.225,point.z);
     post.castShadow=true;group.add(post);
   }
  }
 }
 if(rich){
  // Independent track surface accents; decorative and not actual running lanes.
  const accent=material('#edd6aa',true,{transparent:true,opacity:.16});
  for(const lane of [.055,.945]){
    const ps=edgePoints(lane,true,.012);
    group.add(tube(ps,.014,accent,true));
  }
 }
}
const flatGroup=new THREE.Group(),realGroup=new THREE.Group();
scene.add(flatGroup,realGroup);addCourse(flatGroup,false);addCourse(realGroup,true);
function markerSprite(text,accent,focus){
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;
 const ctx=canvas.getContext('2d');
 ctx.shadowColor='#00190d';ctx.shadowBlur=12;
 ctx.beginPath();ctx.arc(96,96,74,0,Math.PI*2);ctx.fillStyle=focus?'#e6bd67':'#153b31';ctx.fill();
 ctx.shadowBlur=0;ctx.lineWidth=12;ctx.strokeStyle=focus?'#ffefad':'#f3e9c8';ctx.stroke();
 ctx.beginPath();ctx.arc(96,96,61,0,Math.PI*2);ctx.fillStyle=accent;ctx.fill();
 const darkText=['#f8f8f5','#eec839','#eaa2b6','#e88a34'].includes(accent);
 ctx.fillStyle=darkText?'#13231e':'#ffffff';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 82px Arial,sans-serif';
 ctx.strokeStyle=darkText?'#fff3d8':'#152821';ctx.lineWidth=2.5;ctx.strokeText(text,96,100);ctx.fillText(text,96,100);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 return tex;
}
const waku=['#f8f8f5','#181a1d','#d93339','#315fbd','#eec839','#3c914b','#e88a34','#eaa2b6'];
const markers=new THREE.Group();scene.add(markers);
const pop=[];for(const horse of data.runners){
 const f=routeF(.91-.73*horse.formation.progress);
 const p=onTrack(f,horse.formation.lane,true);
 const focus=data.focusNumbers.includes(horse.number);
 const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:markerSprite(String(horse.number),waku[(horse.waku||1)-1],focus),transparent:true,depthTest:false}));
 spr.position.set(p.x,1.9,p.z);spr.scale.set(1.1,1.1,1);
 spr.renderOrder=200;markers.add(spr);pop.push({spr,horse,position:p});
}
const routeLines=new THREE.Group();scene.add(routeLines);
const routePts=Array.from({length:101},(_,i)=>onTrack(routeF(i/100),.5,true).add(new THREE.Vector3(0,.18,0)));
routeLines.add(tube(routePts,.067,new THREE.MeshBasicMaterial({color:'#f9cd6c'}),false));
function captionSprite(text){
 const c=document.createElement('canvas');c.width=256;c.height=112;const t=c.getContext('2d');
 t.fillStyle='#103e30';t.beginPath();t.roundRect(8,8,240,96,20);t.fill();
 t.strokeStyle='#eec66c';t.lineWidth=5;t.stroke();
 t.font='900 48px Arial';t.textAlign='center';t.textBaseline='middle';t.fillStyle='#ffe9b4';t.fillText(text,128,60);
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false}));
 s.scale.set(2.2,.96,1);s.renderOrder=220;return s;
}
for(const [t,label] of [[startF,'START'],[cornerF,'3C']]){
 const p=onTrack(t,.5,true);p.y+=1.15;
 const sprite=captionSprite(label);sprite.position.copy(p);routeLines.add(sprite);
}
const camera=new THREE.OrthographicCamera(-18.2,18.2,6.93,-6.93,.1,200);
const target=new THREE.Vector3();
let style='flat',shot='overview';
function update(){
 const overview=shot==='overview';
 const t=overview?new THREE.Vector3(0,.25,0):centerAt(routeF(.52)).setY(.45);
 target.copy(t);
 const height=overview?17.0:7.6,aspect=1560/592;
 camera.left=-height*aspect/2;camera.right=height*aspect/2;
 camera.top=height/2;camera.bottom=-height/2;
 camera.near=.1;camera.far=200;camera.updateProjectionMatrix();
 camera.position.copy(target).add(new THREE.Vector3(6,24,22));
 camera.lookAt(target);
 flatGroup.visible=style==='flat';realGroup.visible=style==='real';
 markers.visible=!overview;routeLines.visible=overview;
 for(const {spr,horse,position} of pop){
   const f=routeF(.91-.73*horse.formation.progress);
   const p=onTrack(f,horse.formation.lane,style==='real');
   spr.position.set(p.x,p.y+(overview?.8:.65),p.z);
   spr.scale.set(overview?.8:.79,overview?.8:.79,1);
 }
 if(style==='flat'){
   renderer.toneMappingExposure=1.05;sun.intensity=0;ambient.intensity=1.8;scene.background=new THREE.Color('#1f493a');
 }else{
   renderer.toneMappingExposure=1.3;sun.intensity=3.45;ambient.intensity=1.65;scene.background=new THREE.Color('#213e31');
 }
 document.querySelector('#sceneBadge').textContent=overview?'COURSE OVERVIEW / コース全景':'FORMATION / 全16頭の想定隊列';
 document.querySelector('#styleTag').textContent=style==='flat'?'A｜高品質2.5D風':'B｜立体メッシュ＋3Dライティング';
 document.querySelector('#trackInfo').textContent=style==='flat'?'走路の形状と奥行き':'立体走路・接地影・ラチの造形';
 document.querySelector('#trackBody').textContent=style==='flat'?'フラットな配色とラチの輪郭で、形状を読みやすく整理。':'立体的な路盤と陰影、路面の粒状感、立体ラチを描画。';
 for(const btn of document.querySelectorAll('[data-style]'))btn.classList.toggle('selected',btn.dataset.style===style);
 for(const btn of document.querySelectorAll('[data-scene]'))btn.classList.toggle('selected',btn.dataset.scene===shot);
 renderer.render(scene,camera);
}
for(const button of document.querySelectorAll('[data-style]'))button.addEventListener('click',()=>{style=button.dataset.style;update()});
for(const button of document.querySelectorAll('[data-scene]'))button.addEventListener('click',()=>{shot=button.dataset.scene;update()});
window.KBV_VISUAL_V12={
 select:(nextStyle,nextScene)=>{if(!['flat','real'].includes(nextStyle)||!['overview','formation'].includes(nextScene))throw Error('invalid style/scene');style=nextStyle;shot=nextScene;update()},
 state:()=>({style,shot,courseId:'tokyo-d1400',runnerCount:data.runners.length,startF,cornerF,toCorner,geometry:'JRA_DIAGRAM_APPROXIMATE',engine:'THREE_WEBGL_RENDERER_BOTH_2_5D_STYLE_AND_3D_STYLE'})
};
update();
