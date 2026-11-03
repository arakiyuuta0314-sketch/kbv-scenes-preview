'use strict';
const pp=require('puppeteer');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const b=await pp.launch({headless:true,executablePath:process.env.CHROME_BIN||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader']});
 const page=await b.newPage();await page.setViewport({width:1600,height:940,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 const url=process.env.PREVIEW_URL||'http://127.0.0.1:8770/vnext-v17/';
 const response=await page.goto(url,{waitUntil:'networkidle0',timeout:40000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>!!window.KBV_SCENE03_V17,{timeout:20000});
 const report={schema:'kbv.scene03.contextual-full-course.v16',status:'PASS',races:[],errors:[]};
 for(const raceName of ['tokyo','nakayama']){
  await page.evaluate(k=>{const s=document.querySelector('#raceSelect');s.value=k;s.dispatchEvent(new Event('change'))},raceName);
  const starts=await page.evaluate(()=>KBV_SCENE03_V17.getSegmentStarts());
  const total=await page.evaluate(()=>KBV_SCENE03_V17.state().sceneSeconds);
  const ends=starts.concat(total);
  const checks=[];
  const expected=raceName==='tokyo'?
   [['startCorridor'],['straightCorridor'],['slopeCorridor'],['afterSlopeCorridor']]:
   [['startCorridor'],['straightCorridor'],['slopeCorridor'],['slopeCorridor']];
  for(let i=0;i<4;i++){
   const stage=i<2?0:1,side=i%2;const from=starts[stage],len=ends[stage+1]-from;
   const f=side===0?.23:.73;
   await page.evaluate(t=>KBV_SCENE03_V17.setTime(t),from+f*len);
   const state=await page.evaluate(()=>KBV_SCENE03_V17.state());
   assert.deepEqual(state.activeCorridors,expected[i],raceName+' unexpected highlight phase '+i);
   assert(state.cameraViewHeight>20,'must keep full-course orthographic view');
   const mapShown=await page.evaluate(()=>document.querySelector('#mapCue').style.display==='block');
   if(i!==0)assert(mapShown,'position callout missing');
   checks.push({description:['start-to-corner','straight','uphill','after-uphill'][i],highlight:state.activeCorridors[0],cameraHeight:state.cameraViewHeight,cameraPosition:state.cameraPosition,callout:mapShown});
  }
  assert.equal(checks[0].cameraHeight,checks[1].cameraHeight);
  assert.equal(checks[0].cameraHeight,checks[2].cameraHeight);
  assert.equal(checks[0].cameraHeight,checks[3].cameraHeight);
  assert.deepEqual(checks[0].cameraPosition,checks[1].cameraPosition,'course and straight must be in same full-course view');
  assert.deepEqual(checks[0].cameraPosition,checks[2].cameraPosition,'slope must NOT crop the course');
  assert.deepEqual(checks[0].cameraPosition,checks[3].cameraPosition,'slope second half must NOT crop the course');
  report.races.push({raceName,cases:checks});
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'qa_context_results_v17.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,races:report.races.map(r=>({race:r.raceName,viewHeight:r.cases[0].cameraHeight,highlights:r.cases.map(x=>x.highlight)})),errors},null,2));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
