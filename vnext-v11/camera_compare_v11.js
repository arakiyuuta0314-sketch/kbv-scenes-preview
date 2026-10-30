/* Scene03 v11 — camera study only. v10 course/lineup data and final coordinates are immutable. */
'use strict';
(function () {
  const VALID = new Set(['overview', 'follow']);
  let mode = new URLSearchParams(location.search).get('camera') || 'overview';
  if (!VALID.has(mode)) mode = 'overview';
  const priorRender = renderMarkerPositions;
  const priorIntro = updateIntro;
  const controls = document.querySelector('.controls');
  if (!controls || !window.KBV_SCENE03) throw Error('Scene03 v11: preview controls/API unavailable');
  const switcher = document.createElement('div');
  switcher.id = 'cameraCompareV11';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'カメラ比較モード');
  switcher.innerHTML =
    '<span class="camLabel">CAMERA TEST v11</span>' +
    '<button type="button" data-camera="overview" title="全頭を見渡す俯瞰ショット">A｜俯瞰</button>' +
    '<button type="button" data-camera="follow" title="注目馬群を斜め上から追うショット">B｜追走</button>';
  controls.insertBefore(switcher, el('seek'));
  const mixCam = (a,b,t)=>a+(b-a)*t;
  const step = x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t)};
  function updateButtons(){
    switcher.querySelectorAll('button').forEach(b=>{
      const selected=b.dataset.camera===mode;
      b.classList.toggle('selected',selected);
      b.setAttribute('aria-pressed',String(selected));
    });
    document.documentElement.dataset.cameraMode=mode;
  }
  function focusCenter(){
    const numbered = renderedMarkers
      .filter(m=>activeRace.focusNumbers.includes(m.horse.number))
      .map(m=>{
        const match=(m.node.getAttribute('transform')||'').match(/translate\(([-.\d]+)\s+([-.\d]+)\)/);
        return match?{x:Number(match[1]),y:Number(match[2])}:null;
      }).filter(Boolean);
    if(!numbered.length)throw Error('Scene03 v11: focus horse markers unavailable');
    return numbered.reduce((p,v)=>({x:p.x+v.x/numbered.length,y:p.y+v.y/numbered.length}),{x:0,y:0});
  }
  function cameraFor(f){
    const t=Math.min(1,Math.max(0,f));
    // Both camera variants settle to EXACT identity at the scene-to-review boundary.
    const arrive=step((t-.025)/.28);
    const leave=1-step((t-.74)/.245);
    const strength=arrive*leave;
    const isFollow=mode==='follow';
    const zoom=1+(isFollow?.19:.047)*strength;
    let anchorX=540,anchorY=276;
    if(isFollow){
      const focus=focusCenter();
      // Limited pan avoids hiding the field and prevents invented horse motion.
      const candidateX=Math.min(640,Math.max(440,focus.x));
      const candidateY=Math.min(325,Math.max(225,focus.y));
      anchorX=mixCam(540,candidateX,.62*strength);
      anchorY=mixCam(276,candidateY,.50*strength);
    }else{
      anchorX=540+(course.rotation==='left'?10:-10)*strength;
      anchorY=276-3*strength;
    }
    const tx=540-zoom*anchorX,ty=276-zoom*anchorY;
    return 'translate('+round(tx,3)+' '+round(ty,3)+') scale('+round(zoom,5)+')';
  }
  renderMarkerPositions=function(f){
    priorRender(f); // Preserve the original race movement, collision and position logic.
    el('actionCamera').setAttribute('transform',cameraFor(f));
  };
  updateIntro=function(f){
    priorIntro(f);
    if(mode!=='follow')return;
    const k=step(f),magnify=1+.065*k;
    const group=el('courseModel'),labels=el('courseLandmarks');
    const original=group.getAttribute('transform')||'';
    const additional='translate('+round(-9*k,2)+' '+round(4*k,2)+') translate(520 260) scale('+round(magnify,5)+') translate(-520 -260) ';
    group.setAttribute('transform',additional+original);
    labels.setAttribute('transform',additional+original);
  };
  function setMode(next){
    if(!VALID.has(next))throw Error('Scene03 v11: unknown camera mode '+next);
    mode=next;updateButtons();
    // Re-render the same race and same moment: no change in narration/formation.
    window.KBV_SCENE03.renderAt(window.KBV_SCENE03.state().progress);
  }
  switcher.querySelectorAll('button').forEach(button=>
    button.addEventListener('click',()=>setMode(button.dataset.camera)));
  window.KBV_CAMERA_V11=Object.freeze({setMode,getMode:()=>mode,cameraFor});
  updateButtons();
  window.KBV_SCENE03.renderAt(window.KBV_SCENE03.state().progress);
})();