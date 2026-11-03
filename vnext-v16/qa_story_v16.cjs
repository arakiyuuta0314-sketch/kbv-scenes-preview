'use strict';
const pp=require('puppeteer'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await pp.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader']});
 const page=await browser.newPage();await page.setViewport({width:1600,height:940,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8769/vnext-v16/',{waitUntil:'networkidle0',timeout:40000});
 await page.waitForFunction(()=>!!window.KBV_SCENE03_V16,{timeout:20000});
 const report={schema:'kbv.scene03.sequential.explanation.qa/v16',cases:[],errors};
 const facts=JSON.parse(fs.readFileSync(path.join(__dirname,'explainer_facts.json'),'utf8')).courses;
 for(const key of ['tokyo','nakayama']){
  await page.evaluate(key=>{const s=document.querySelector('#raceSelect');s.value=key;s.dispatchEvent(new Event('change'));},key);
  const ids={'tokyo':'tokyo-d1400','nakayama':'nakayama-t2000-A'};
  const f=facts[ids[key]],starts=await page.evaluate(()=>KBV_SCENE03_V16.getSegmentStarts());
  const total=await page.evaluate(()=>KBV_SCENE03_V16.state().sceneSeconds);
  const limits=starts.concat([total]);
  const stages=['course','slope','formation','review'];
  let previous=null;
  for(let i=0;i<4;i++){
   for(let side=0;side<=1;side++){
    const t=limits[i]+(limits[i+1]-limits[i])*(side===0?.28:.74);
    const state=await page.evaluate(v=>{KBV_SCENE03_V16.setTime(v);return KBV_SCENE03_V16.state()},t);
    assert.equal(state.segment,stages[i]);assert.equal(state.infoPage,side);
    assert(state.narrative.heading&&state.narrative.detail);
    if(previous)assert.notEqual(state.narrative.heading,previous, 'Headline failed to advance at '+key+' '+i+' '+side);
    previous=state.narrative.heading;
    if(i<2)assert.equal(state.narrative.heading,f[stages[i]][side].headline);
    const ui=await page.evaluate(()=>{
      const s=document.querySelector('#mapCue'),d=document.querySelector('#bottomInfo');
      const r=d.getBoundingClientRect(),a=s.getBoundingClientRect();
      const badge=[...document.querySelectorAll('#focusOverlay .focusNumber')].filter(x=>x.style.display!=='none');
      return {markerDisplayed:s.style.display!=='none',visibleBadges:badge.map(x=>x.textContent),
       panel:{x:r.x,y:r.y,width:r.width,height:r.height},
       cue:{x:a.x,y:a.y,width:a.width,height:a.height},
       step:document.querySelector('#infoStep').textContent};
    });
    if(i<2)assert(ui.markerDisplayed,'map anchor not visible: '+key+' '+i+' '+side);
    assert(ui.panel.y>590&&ui.panel.y+ui.panel.height<860,'explanation panel layout outside safe area');
    if(i===3)assert.equal(ui.visibleBadges.length,side? (key==='tokyo'?4:3):0,'focus reveal timing');
    const label=key+'_'+stages[i]+'_'+(side?'second':'first')+'_v16.png';
    await page.screenshot({path:path.join(__dirname,label),clip:{x:0,y:0,width:1600,height:900}});
    report.cases.push({key,stage:stages[i],page:side,heading:state.narrative.heading,detail:state.narrative.detail,visibleFocusLabels:ui.visibleBadges.length,mapAnchor:ui.markerDisplayed,panel:ui.panel});
   }
  }
 }
 assert.deepEqual(errors,[],'JavaScript page errors');
 report.status='PASS';
 fs.writeFileSync(path.join(__dirname,'qa_story_results_v16.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,cases:report.cases.length,examples:report.cases.map(x=>[x.key,x.stage,x.page,x.heading,x.mapAnchor,x.visibleFocusLabels]),errors},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
