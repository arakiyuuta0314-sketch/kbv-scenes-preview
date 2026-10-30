/* Optional visual regression QA: run with NODE_PATH pointing to installed puppeteer. */
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer');
(async()=>{
 const browser=await puppeteer.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args:['--no-sandbox','--allow-file-access-from-files']
 });
 const page=await browser.newPage();
 await page.setViewport({width:1600,height:1050,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const url=pathToFileURL(path.join(__dirname,'index.html')).href;
 await page.goto(url,{waitUntil:'networkidle0'});
 const data=[];
 for(const race of ['tokyo','nakayama']){
  const state=await page.evaluate((race)=>{
   window.KBV_SCENE03.loadRace(window.KBV_RACES[race]);
   return window.KBV_SCENE03.state();
  },race);
  assert(state.runnerCount>=12);
  const atAction=state.phaseWeights.intro+state.phaseWeights.action*.57;
  const modes={};
  for(const mode of ['overview','follow']){
   modes[mode]=await page.evaluate(({mode,atAction})=>{
    window.KBV_CAMERA_V11.setMode(mode);
    window.KBV_SCENE03.renderAt(atAction);
    const st=window.KBV_SCENE03.state();
    return {mode:window.KBV_CAMERA_V11.getMode(),
      phase:st.phase,
      camera:document.querySelector('#actionCamera').getAttribute('transform'),
      markers:st.actionPositions,
      courseId:st.courseId,
      raceName:document.querySelector('#raceName').textContent};
   },{mode,atAction});
   await page.screenshot({path:path.join(__dirname,'qa_'+race+'_'+mode+'_v11.png'),clip:{x:0,y:0,width:1600,height:900}});
  }
  assert.equal(modes.overview.phase,'action');
  assert.equal(modes.follow.phase,'action');
  assert.deepEqual(modes.overview.markers,modes.follow.markers,'Camera must never alter horse movement');
  assert.notEqual(modes.overview.camera,modes.follow.camera,'A/B camera must be visually distinct');
  const output=await page.evaluate(()=>{
   renderMarkerPositions(1);
   return {camera:document.querySelector('#actionCamera').getAttribute('transform'),
     finalAction:window.KBV_SCENE03.state().actionPositions,
     finalReview:window.KBV_SCENE03.state().reviewPositions,
     actionViewBox:el('actionSvg').getAttribute('viewBox'),
     reviewViewBox:el('reviewSvg').getAttribute('viewBox'),
     terrainMatch:el('reviewTerrain').dataset.geometry};
  });
  assert.equal(output.actionViewBox,output.reviewViewBox);
  assert.equal(output.terrainMatch,'shared-with-action-v10');
  assert.match(output.camera,/translate\(0 0\) scale\(1\)/);
  data.push({race,courseId:modes.overview.courseId,cameraA:modes.overview.camera,cameraB:modes.follow.camera,markerCount:state.runnerCount,finalCamera:output.camera,terrainMatch:output.terrainMatch});
 }
 assert.deepEqual(errors,[],'Browser page errors');
 fs.writeFileSync(path.join(__dirname,'qa_camera_v11_results.json'),JSON.stringify({status:'PASS',data,errors},null,2));
 console.log(JSON.stringify({status:'PASS',data,errors},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
