const pp=require('puppeteer'),fs=require('fs'),path=require('path');
(async()=>{
 const browser=await pp.launch({headless:true,executablePath:process.env.CHROME_BIN||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader']});
 const page=await browser.newPage();await page.setViewport({width:1600,height:920,deviceScaleFactor:1});
 const errors=[],consoleLogs=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')consoleLogs.push(m.text())});
 const res=await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765/vnext-v12/',{waitUntil:'networkidle0',timeout:40000});
 console.log('PAGE',res.status());
 await page.waitForFunction(()=>!!window.KBV_VISUAL_V12,{timeout:30000});
 const outDir=__dirname;
 const list=[];
 for(const style of ['flat','real'])for(const shot of ['overview','formation']){
  const state=await page.evaluate(({style,shot})=>{KBV_VISUAL_V12.select(style,shot);return KBV_VISUAL_V12.state()},{style,shot});
  await page.screenshot({path:path.join(outDir,style+'_'+shot+'_tokyo.png'),clip:{x:0,y:0,width:1600,height:900}});
  if(state.courseId!=='tokyo-d1400'||state.runnerCount!==16)throw Error('Unexpected course or runner count');
  list.push(state);
 }
 console.log(JSON.stringify({list,errors,consoleLogs},null,2));await browser.close();
 if(errors.length||consoleLogs.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
