/* Reads the v10 demo input and JRA hand-traced course data without modifying them. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../vnext-v10');
const sandbox={window:{}};
for(const name of ['config.js','jra_trace_data.js'])vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const races=sandbox.window.KBV_RACES,geometry=sandbox.window.KBV_COURSE_TRACES_V5;
if(!races?.tokyo||!races?.nakayama||!geometry?.['tokyo-d1400']||!geometry?.['nakayama-t2000-A'])throw Error('verified demo input unavailable');
for(const [id,race] of Object.entries(races)){
 if(!geometry[race.courseId])throw Error('missing geometry '+race.courseId);
 if(!Array.isArray(race.runners)||race.runners.some(x=>!Number.isInteger(x.number)||!Number.isFinite(x.formation?.progress)||!Number.isFinite(x.formation?.lane)))throw Error('invalid demo race '+id);
}
fs.writeFileSync(path.join(__dirname,'sample_races.json'),JSON.stringify({schema:'kbv.scene03.demo_races/v1',purpose:'DISPLAY_TEST_NOT_FORMAL_PREDICTION',races},null,2),'utf8');
fs.writeFileSync(path.join(__dirname,'course_geometry.json'),JSON.stringify({schema:'kbv.scene03.approx_jra_trace/v1',accuracy:'DIAGRAM_MANUAL_TRACE_NOT_SURVEYED',courses:geometry},null,2),'utf8');
console.log(JSON.stringify({races:Object.fromEntries(Object.entries(races).map(([k,v])=>[k,{courseId:v.courseId,runnerCount:v.runners.length}])),geometryIds:Object.keys(geometry)},null,2));
