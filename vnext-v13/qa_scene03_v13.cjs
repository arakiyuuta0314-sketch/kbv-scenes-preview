const pp=require('puppeteer'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await pp.launch({headless:true,executablePath:process.env.CHROME_BIN||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader']});
 const page=await browser.newPage();await page.setViewport({width:1600,height:1050,deviceScaleFactor:1});
 const errors=[],logErrors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 page.on('console',m=>{if(m.type()==='error')logErrors.push(m.text())});
 const response=await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765/vnext-v13/',{waitUntil:'networkidle0',timeout:45000});
 assert.equal(response.status(),200);
 try{await page.waitForFunction(()=>!!window.KBV_SCENE03_V13,{timeout:12000})}catch(err){console.log('BOOT_ERRORS',JSON.stringify({errors,logErrors,body:await page.evaluate(()=>document.body.innerText.slice(0,500))}));throw err;}
 const cases=[];
 for(const name of ['tokyo','nakayama']){
  await page.evaluate(name=>document.querySelector('#raceSelect').value=name,name);
  await page.evaluate(()=>document.querySelector('#raceSelect').dispatchEvent(new Event('change')));
  for(const [stage,prog] of [['course',.08],['terrain',.25],['formation',.53],['review',.91]]){
   const state=await page.evaluate(prog=>{window.KBV_SCENE03_V13.setProgress(prog);return window.KBV_SCENE03_V13.state()},prog);
   assert.equal(state.phase,stage);assert.equal(state.fromCS,true);
   assert(state.runnerCount===16||state.runnerCount===12);
   const file=name+'_'+stage+'_v13.png';
   await page.screenshot({path:path.join(__dirname,file),clip:{x:0,y:0,width:1600,height:900}});
   cases.push({name,stage,courseId:state.courseId,count:state.runnerCount});
  }
  const first=await page.evaluate(()=>{KBV_SCENE03_V13.setProgress(.9);return KBV_SCENE03_V13.state().positions});
  const later=await page.evaluate(()=>{KBV_SCENE03_V13.setProgress(.98);return KBV_SCENE03_V13.state().positions});
  assert.deepEqual(first,later,'Review must be frozen');
 }
 const unsupported=await page.evaluate(()=>{
  const race={id:'unsupported',raceName:'未登録コース',courseId:'unknown-turf-1400',runners:[{number:1,name:'A',waku:1,formation:{lane:.5,progress:.5}}],focusNumbers:[1]};
  try{KBV_SCENE03_V13.loadRace(race);return 'INVALID_ACCEPTED'}catch(e){return String(e.message)}
 });
 assert(unsupported.includes('geometry unregistered'));
 // Same renderer must serve a changed runner count, no race-specific hardcoding.
 const eight=await page.evaluate(async()=>{
  const response=await fetch('sample_races.json'),pack=await response.json();
  const race=structuredClone(pack.races.tokyo);
  race.id='test-eight';race.raceName='8頭・番号飛び表示テスト';race.runners=race.runners.filter(h=>h.number%2===0);
  race.focusNumbers=[2,8];KBV_SCENE03_V13.loadRace(race);
  KBV_SCENE03_V13.setProgress(.55);return KBV_SCENE03_V13.state()
 });
 assert.equal(eight.runnerCount,8);
 assert(eight.positions.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
 const eighteen=await page.evaluate(async()=>{
  const pack=await(await fetch('sample_races.json')).json();
  const race=structuredClone(pack.races.tokyo);
  race.id='test-eighteen';race.raceName='18頭・表示テスト';
  race.runners.push({number:17,name:'表示テスト17',waku:8,formation:{progress:.21,lane:.61}},
                    {number:18,name:'表示テスト18',waku:8,formation:{progress:.48,lane:.35}});
  KBV_SCENE03_V13.loadRace(race);KBV_SCENE03_V13.setProgress(.82);return KBV_SCENE03_V13.state();
 });
 assert.equal(eighteen.runnerCount,18);
 assert(eighteen.positions.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
 const failure=errors.concat(logErrors);
 console.log(JSON.stringify({status:failure.length?'FAIL':'PASS',cases,unsupported,eightHorse:8,eighteenHorse:18,errors:failure},null,2));
 fs.writeFileSync(path.join(__dirname,'qa_results_v13.json'),JSON.stringify({status:failure.length?'FAIL':'PASS',cases,unsupported,eightHorse:8,eighteenHorse:18,errors:failure},null,2));
 await browser.close();if(failure.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
