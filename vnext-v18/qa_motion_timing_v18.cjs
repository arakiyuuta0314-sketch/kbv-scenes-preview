'use strict';
const pp=require('puppeteer'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const b=await pp.launch({headless:true,executablePath:process.env.CHROME_BIN||'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader']});
 const page=await b.newPage();await page.setViewport({width:1600,height:950,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const r=await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8771/vnext-v18/',{waitUntil:'networkidle0',timeout:45000});
 assert.equal(r.status(),200);
 await page.waitForFunction(()=>!!window.KBV_SCENE03_V18,{timeout:20000});
 const report={status:'PASS',races:[],audioTiming:null,durations:[],failFast:null};
 for(const [key,expected]of [['tokyo',16],['nakayama',12]]){
  await page.evaluate(key=>{const el=document.querySelector('#raceSelect');el.value=key;el.dispatchEvent(new Event('change'));},key);
  const starts=await page.evaluate(()=>KBV_SCENE03_V18.getSegmentStarts());
  const entries=[];
  for(const [label,offset]of [['at-gate',0.0001],['mid-formation',2.2],['beyond-turn',6.6],['review',10]]){
   const t=label==='review'?starts[3]+.6:starts[2]+offset;
   const state=await page.evaluate(t=>{KBV_SCENE03_V18.setTime(t);return KBV_SCENE03_V18.state()},t);
   assert.equal(state.runnerCount,expected);
   assert(state.formationTravel.beyondFirstTurn);
   assert(state.formationTravel.previewEndMeters>state.formationTravel.firstTurnMeters);
   assert(state.positions.every(p=>Number.isFinite(p.distanceFromStartMeters)&&p.distanceFromStartMeters>=0));
   if(label==='beyond-turn'){
    assert(state.positions.every(p=>p.distanceFromStartMeters>state.formationTravel.firstTurnMeters+45),
     key+' expected curved formation positions not past first corner');
    assert(state.positions.every(p=>p.distanceFromStartMeters<state.formationTravel.previewEndMeters+1));
   }
   if(label==='at-gate')assert(state.positions.every(p=>p.distanceFromStartMeters<.1));
   if(label==='review')assert(state.positions.every(p=>p.distanceFromStartMeters>state.formationTravel.firstTurnMeters+45));
   await page.screenshot({path:path.join(__dirname,key+'_'+label+'_v18.png'),clip:{x:0,y:0,width:1600,height:900}});
   entries.push({label,stage:state.segment,firstTurnMeters:state.formationTravel.firstTurnMeters,
    geometricFirstTurnTravelMeters:state.formationTravel.geometricFirstTurnTravelMeters,
    headMax:Math.max(...state.positions.map(p=>p.distanceFromStartMeters)),
    tailMin:Math.min(...state.positions.map(p=>p.distanceFromStartMeters))});
  }
  // Forward motion monotonic by HORSE and frozen after review starts.
  const samples=[];
  for(const time of [0,.6,1.5,3.1,4.8,6.4]){
   const state=await page.evaluate(t=>{const s=KBV_SCENE03_V18.getSegmentStarts();KBV_SCENE03_V18.setTime(s[2]+t);return KBV_SCENE03_V18.state()},time);
   samples.push(state.positions.map(p=>p.distanceFromStartMeters));
  }
  for(let i=1;i<samples.length;i++)for(let horse=0;horse<expected;horse++)
   assert(samples[i][horse]>=samples[i-1][horse]-1e-6,'non-monotonic horse movement '+key);
  report.races.push({key,expected,entries});
 }
 const demo=await page.evaluate(async()=>{
  const input=(await(await fetch('sample_races.json')).json()).races.nakayama;
  const sheet=await(await fetch('wav35_demo_cues.json')).json();
  const race=structuredClone(input);race.id='cue-timeline-test';
  race.scene03={cueSheet:sheet};
  KBV_SCENE03_V18.loadRace(race);
  const at=[0,9.99,10,18.99,19,26.99,27,35.775].map(x=>{
   KBV_SCENE03_V18.setTime(x);const state=KBV_SCENE03_V18.state();
   return {t:x,stage:state.segment,page:state.infoPage,duration:state.sceneSeconds,timingStatus:state.timingStatus};
  });
  const disabled=[...document.querySelectorAll('[data-phase]')].map(x=>[x.dataset.phase,x.disabled]);
  const durationDisabled=document.querySelector('#durationSelect').disabled;
  return {at,disabled,durationDisabled};
 });
 assert.equal(demo.at[0].duration,35.776);
 assert.equal(demo.at[0].timingStatus,'DEMO_UNALIGNED');
 assert.deepEqual(demo.at.map(s=>s.stage),['formation','formation','formation','formation','review','review','review','review']);
 assert.deepEqual(demo.at.map(s=>s.page),[0,0,1,1,0,0,1,1]);
 assert.deepEqual(demo.disabled,[['course',true],['slope',true],['formation',false],['review',false]]);
 assert(demo.durationDisabled);
 report.audioTiming={sampleWavDuration:35.776,mode:'DEMO_UNALIGNED',skippedUnspokenCourseStages:true};
 const focusCues=await page.evaluate(async()=>{
   const sample=(await(await fetch('sample_races.json')).json()).races.nakayama;
   const r=structuredClone(sample);r.id='multi-cue-focus';
   r.scene03={cueSheet:{durationSec:35.776,alignmentStatus:'DEMO_UNALIGNED',
    events:[
      {atSec:0,stage:'formation',page:0},
      {atSec:8,stage:'formation',page:1},
      {atSec:13,stage:'review',page:0},
      {atSec:18,stage:'review',page:1,focusNumbers:[3,5],headline:'3番と5番',detail:'画面切替のデモ'},
      {atSec:29,stage:'review',page:1,focusNumbers:[12],headline:'12番',detail:'次の馬の説明'}
    ]}};
   KBV_SCENE03_V18.loadRace(r);
   const read=t=>{
     KBV_SCENE03_V18.setTime(t);
     const s=KBV_SCENE03_V18.state();
     return {seconds:t,headline:s.narrative.heading,focus:s.activeCue.focusNumbers,
      shown:[...document.querySelectorAll('#focusOverlay .focusNumber')].filter(x=>x.style.display!=='none').map(x=>x.textContent)};
   };
   return {first:read(24),second:read(32)};
 });
 assert.deepEqual(focusCues.first.focus,[3,5]);
 assert.deepEqual(focusCues.first.shown.sort(),['3','5']);
 assert.equal(focusCues.first.headline,'3番と5番');
 assert.deepEqual(focusCues.second.focus,[12]);
 assert.deepEqual(focusCues.second.shown,['12']);
 assert.equal(focusCues.second.headline,'12番');
 report.dynamicFocusCues=focusCues;

 // Invalid cue sheet must fail FAST before mutating current scene.
 const invalid=await page.evaluate(async()=>{
  const d=(await(await fetch('sample_races.json')).json()).races.tokyo;
  const r=structuredClone(d);r.scene03={cueSheet:{durationSec:10,alignmentStatus:'DEMO_UNALIGNED',
   events:[{atSec:0,stage:'formation',page:1},{atSec:5,stage:'course',page:0}]}};
  const before=KBV_SCENE03_V18.state().raceId;
  try{KBV_SCENE03_V18.loadRace(r);return {error:'NO_ERROR'}}catch(e){return {error:String(e.message),unchanged:KBV_SCENE03_V18.state().raceId===before}}
 });
 assert(invalid.error.includes('TIMELINE ERROR'));assert(invalid.unchanged);
 report.failFast=invalid.error;
 // Change back to preset and test 22 / 38 / WAV / 60 dynamically.
 await page.evaluate(async()=>{
  const r=(await(await fetch('sample_races.json')).json()).races.tokyo;
  KBV_SCENE03_V18.loadRace(r);
 });
 for(const [mode,seconds]of [['standard',22],['long',38],['wav',35.776],['minute',60]]){
  const state=await page.evaluate(v=>{KBV_SCENE03_V18.changeDuration(v);return KBV_SCENE03_V18.state()},mode);
  assert(Math.abs(state.sceneSeconds-seconds)<.0001,'total audio length mismatch '+mode);
  report.durations.push({mode,seconds:state.sceneSeconds,status:state.timingStatus});
 }
 // Same early formation endpoint even when scene narration runs for 60 seconds.
 const snapshots=[];
 for(const mode of ['standard','minute']){
  const s=await page.evaluate(mode=>{
   KBV_SCENE03_V18.changeDuration(mode);
   const from=KBV_SCENE03_V18.getSegmentStarts()[2];
   KBV_SCENE03_V18.setTime(from+7.4);
   return KBV_SCENE03_V18.state().positions;
  },mode);
  snapshots.push(s.map(p=>[p.distanceFromStartMeters,p.courseFraction]));
 }
 assert.deepEqual(snapshots[0],snapshots[1],'motion slowed by longer narration');
 assert.deepEqual(errors,[],'JS errors');
 fs.writeFileSync(path.join(__dirname,'qa_motion_timing_results_v18.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,races:report.races.map(r=>({id:r.key,geoTurn:r.entries[2].geometricFirstTurnTravelMeters,
    from:r.entries[2].firstTurnMeters,to:r.entries[2].headMax,tail:r.entries[2].tailMin})),
    cues:demo.at,durations:report.durations,failFast:report.failFast,errors},null,2));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
