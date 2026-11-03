'use strict';
const pp=require('puppeteer'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await pp.launch({headless:true,executablePath:process.env.CHROME_BIN||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader']});
 const page=await browser.newPage();await page.setViewport({width:1600,height:950,deviceScaleFactor:1});
 const problems=[];page.on('pageerror',e=>problems.push(String(e)));page.on('console',e=>{if(e.type()==='error')problems.push(e.text())});
 const response=await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8770/vnext-v17/',{waitUntil:'networkidle0',timeout:40000});
 assert.equal(response.status(),200);
 try{await page.waitForFunction(()=>!!window.KBV_SCENE03_V17,{timeout:18000})}catch(e){console.log('PAGE ERRORS',JSON.stringify(problems),'BODY',await page.evaluate(()=>document.body.innerText.slice(0,500)));throw e}
 const report={schema:'kbv.scene03.mobile.elevation.qa/v17',cases:[],durations:[],status:'PASS'};
 for(const [key,expectedCount,expectedRelief]of [['tokyo',16,2.5],['nakayama',12,5.3]]){
  await page.evaluate(key=>{const select=document.querySelector('#raceSelect');select.value=key;select.dispatchEvent(new Event('change'))},key);
  const s=await page.evaluate(()=>KBV_SCENE03_V17.state());
  assert.equal(s.runnerCount,expectedCount);
  assert(Math.abs(s.elevation.derivedReliefMeters-expectedRelief)<.02,'official relief wrong');
  assert(s.visibleUI.noSidePanel&&s.visibleUI.noPersistentGraph,'mobile UI clutter not removed');
  const starts=await page.evaluate(()=>KBV_SCENE03_V17.getSegmentStarts());
  const stages=['course','slope','formation','review'];
  for(let i=0;i<stages.length;i++){
   await page.evaluate(t=>KBV_SCENE03_V17.setTime(t),starts[i]+(i===2?5.8:1.8));
   const current=await page.evaluate(()=>KBV_SCENE03_V17.state());
   assert.equal(current.segment,stages[i],key+' stage mismatch');
   const label=key+'_'+stages[i]+'_v17.png';
   await page.screenshot({path:path.join(__dirname,label),clip:{x:0,y:0,width:1600,height:900}});
   report.cases.push({key,stage:stages[i],runnerCount:current.runnerCount});
  }
  const early=await page.evaluate(()=>{const t=KBV_SCENE03_V17.getSegmentStarts()[3]+.25;KBV_SCENE03_V17.setTime(t);return KBV_SCENE03_V17.state().positions});
  const late=await page.evaluate(()=>{const t=KBV_SCENE03_V17.getSegmentStarts()[3]+5.5;KBV_SCENE03_V17.setTime(t);return KBV_SCENE03_V17.state().positions});
  assert.deepEqual(early,late,'formation is not frozen');
 }
 // Nakayama concrete JRA anchors: 180m before finish to 70m before finish is a 2.2m climb.
 const anchored=await page.evaluate(()=>{
  const p=KBV_SCENE03_V17.getProfile(),e=KBV_SCENE03_V17.getElevationCue();
  const at=t=>p.find(x=>Math.abs(x[0]-t)<.000001);
  return {begin:at(e.cueStart),end:at(e.cueEnd),delta:at(e.cueEnd)?.[1]-at(e.cueStart)?.[1]};
 });
 assert(Math.abs(anchored.delta-2.2)<1e-6,'Nakayama official home climb not mapped');
 report.nakayamaOfficialClimb=anchored;
 // 38-second narration variant: identical movement by elapsed 7.5 sec, no stretch.
 await page.evaluate(()=>document.querySelector('#raceSelect').value='tokyo');
 await page.evaluate(()=>document.querySelector('#raceSelect').dispatchEvent(new Event('change')));
 const snapshots=[];
 for(const mode of ['standard','long']){
  await page.evaluate(mode=>KBV_SCENE03_V17.changeDuration(mode),mode);
  const starts=await page.evaluate(()=>KBV_SCENE03_V17.getSegmentStarts());
  const d=await page.evaluate(()=>KBV_SCENE03_V17.state().sceneSeconds);
  const begin=starts[2];
  await page.evaluate(t=>KBV_SCENE03_V17.setTime(t),begin+7.4);
  const horsePositions=await page.evaluate(()=>KBV_SCENE03_V17.state().positions);
  snapshots.push(horsePositions);
  report.durations.push({mode,totalSeconds:d});
 }
 assert.deepEqual(snapshots[0],snapshots[1],'formation speed depends on narration duration');
 const extra=await page.evaluate(async()=>{
  const data=await(await fetch('sample_races.json')).json();
  const original=data.races.tokyo;
  const eight=structuredClone(original);eight.id='test-eight';eight.raceName='8頭・欠番';
  eight.runners=eight.runners.filter(h=>h.number%2===0);eight.focusNumbers=[2,8];
  KBV_SCENE03_V17.loadRace(eight);
  KBV_SCENE03_V17.setTime(KBV_SCENE03_V17.getSegmentStarts()[3]+.2);
  const a=KBV_SCENE03_V17.state(),badges8=document.querySelectorAll('#focusOverlay .focusNumber').length;
  const eighteen=structuredClone(original);eighteen.id='test-18';eighteen.raceName='18頭';
  eighteen.runners.push({number:17,name:'表示テスト17',waku:8,formation:{lane:.62,progress:.38}},
                         {number:18,name:'表示テスト18',waku:8,formation:{lane:.33,progress:.58}});
  eighteen.focusNumbers=[16,14,13,4,17];
  KBV_SCENE03_V17.loadRace(eighteen);
  KBV_SCENE03_V17.setTime(KBV_SCENE03_V17.getSegmentStarts()[3]+.2);
  const b=KBV_SCENE03_V17.state(),badges18=document.querySelectorAll('#focusOverlay .focusNumber').length;
  return {eight:a.runnerCount,positive8:a.positions.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)),
   eighteen:b.runnerCount,positive18:b.positions.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)),
   badges8,badges18};
 });
 assert.equal(extra.eight,8);assert(extra.positive8);assert.equal(extra.badges8,2);
 assert.equal(extra.eighteen,18);assert(extra.positive18);assert.equal(extra.badges18,5);
 await page.screenshot({path:path.join(__dirname,'tokyo_18_review_v17.png'),clip:{x:0,y:0,width:1600,height:900}});
 report.extraRunnerCounts=extra;
 await page.click('#playBtn');await new Promise(r=>setTimeout(r,400));
 const played=await page.evaluate(()=>KBV_SCENE03_V17.state().time);
 await page.click('#playBtn');assert(played>0,'play button did not advance');
 report.playButton='PASS';
 const unsupported=await page.evaluate(()=>{const p={id:'bad',raceName:'unknown',courseId:'no-track',runners:[{number:1,name:'a',waku:1,formation:{lane:.2,progress:.2}}],focusNumbers:[]};try{KBV_SCENE03_V17.loadRace(p);return 'INCORRECT_ACCEPT'}catch(e){return e.message}});
 assert(unsupported.includes('verified geometry'),'unknown course accepted');
 report.unsupportedCourseRejected=unsupported;
 report.errors=problems;
 if(problems.length)report.status='FAIL';
 fs.writeFileSync(path.join(__dirname,'qa_results_v17.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 await browser.close();if(problems.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
