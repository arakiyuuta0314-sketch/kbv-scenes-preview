'use strict';
const pp=require('puppeteer'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await pp.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader']});
 const page=await browser.newPage();
 await page.setViewport({width:1600,height:940,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 const r=await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8771/vnext-v18/',{waitUntil:'networkidle0',timeout:40000});
 assert.equal(r.status(),200);
 await page.waitForFunction(()=>!!window.KBV_SCENE03_V18,{timeout:20000});
 const checks=[],testRace=['tokyo','nakayama'];
 for(const key of testRace){
  await page.evaluate(k=>{const select=document.querySelector('#raceSelect');select.value=k;select.dispatchEvent(new Event('change'))},key);
  const starts=await page.evaluate(()=>KBV_SCENE03_V18.getSegmentStarts());
  const end=await page.evaluate(()=>KBV_SCENE03_V18.state().sceneSeconds);
  const bounds=[...starts,end];
  for(let stage=0;stage<4;stage++){
   for(let side=0;side<2;side++){
    const t=bounds[stage]+(bounds[stage+1]-bounds[stage])*(side?.75:.25);
    const status=await page.evaluate(t=>{KBV_SCENE03_V18.setTime(t);return KBV_SCENE03_V18.state()},t);
    const ui=await page.evaluate(()=>{
      const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
      const start=document.querySelector('#startAnchor'),goal=document.querySelector('#goalAnchor');
      const cue=document.querySelector('#mapCue'),card=document.querySelector('#bottomInfo');
      return {start:box(start),goal:box(goal),cue:box(cue),card:box(card),
       startVisible:getComputedStyle(start).display!=='none',
       goalVisible:getComputedStyle(goal).display!=='none',
       cueVisible:getComputedStyle(cue).display!=='none',
       startText:start.innerText,goalText:goal.innerText,
       startColor:getComputedStyle(start).backgroundColor,goalColor:getComputedStyle(goal).backgroundColor};
    });
    assert.equal(ui.startVisible,stage<=1,'START visibility');
    assert.equal(ui.goalVisible,stage<=1,'GOAL visibility');
    if(stage<=1){
     assert(ui.startText.includes('START')&&ui.goalText.includes('GOAL'),'missing identity');
     assert.notEqual(ui.startColor,ui.goalColor,'indistinguishable markers');
     assert.equal(status.startGoal.length,2,'data coordinates missing');
     assert(status.startGoal[0].fraction>=0&&status.startGoal[0].fraction<1);
     assert(status.startGoal[1].fraction>=0&&status.startGoal[1].fraction<1);
     assert.notEqual(status.startGoal[0].fraction,status.startGoal[1].fraction,'start and finish must differ');
     for(const v of [ui.start,ui.goal]){
       assert(v.x>=25&&v.y>80&&v.x+v.w<=1575&&v.y+v.h<800,'marker outside safe area');
     }
     const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*
       Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
     assert.equal(overlap(ui.start,ui.goal),0,'START and GOAL overlap');
     assert.equal(overlap(ui.start,ui.card),0,'START obscured by card');
     assert.equal(overlap(ui.goal,ui.card),0,'GOAL obscured by card');
     if(ui.cueVisible){
       assert.equal(overlap(ui.start,ui.cue),0,'START overlaps explanation cue '+key+' stage='+stage+' side='+side+' start='+JSON.stringify(ui.start)+' cue='+JSON.stringify(ui.cue));
       assert.equal(overlap(ui.goal,ui.cue),0,'GOAL overlaps explanation cue '+key+' stage='+stage+' side='+side+' goal='+JSON.stringify(ui.goal)+' cue='+JSON.stringify(ui.cue));
     }
    }
    checks.push({race:key,stage,side,anchorVisibility:status.anchorVisibility,positions:status.startGoal,actualPixelRect:stage<=1?{start:ui.start,goal:ui.goal}:null});
   }
  }
 }
 assert.deepEqual(errors,[],'browser JavaScript errors');
 const result={status:'PASS',cases:checks,errors};
 fs.writeFileSync(path.join(__dirname,'qa_start_goal_results_v18.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({status:result.status,cases:checks.length,positions:Object.fromEntries(testRace.map(k=>[k,checks.find(x=>x.race===k).positions])),errors}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
