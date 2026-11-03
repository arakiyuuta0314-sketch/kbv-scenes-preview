// Deterministic timestamp contract for Scene03. No audio transcription inference.
export const STAGES=Object.freeze(['course','slope','formation','review']);
const statusValues=new Set(['DEMO_UNALIGNED','USER_CONFIRMED_TIMESTAMPS']);
const fail=(ok,why)=>{if(!ok)throw Error('TIMELINE ERROR: '+why)};
const round=x=>Math.round(x*1000000)/1000000;
export function validateCueSheet(input){
 fail(input&&typeof input==='object','cueSheet object missing');
 const {durationSec,events,alignmentStatus}=input;
 fail(Number.isFinite(durationSec)&&durationSec>0&&durationSec<=600,'durationSec invalid');
 fail(statusValues.has(alignmentStatus),'alignmentStatus must be explicit');
 fail(Array.isArray(events)&&events.length>0&&events.length<=50,'event count invalid');
 fail(Math.abs(events[0].atSec)<.000001,'first event must start at zero');
 const ordered=[];
 for(const [i,event]of events.entries()){
  fail(event&&typeof event==='object','event '+i+' invalid');
  fail(STAGES.includes(event.stage),'unknown stage '+i);
  fail(event.page===0||event.page===1,'page must be 0 or 1 at '+i);
  fail(Number.isFinite(event.atSec)&&event.atSec>=0&&event.atSec<durationSec,'atSec out of bounds '+i);
  if(i>0)fail(event.atSec>events[i-1].atSec,'event times not strictly increasing '+i);
  const sequenceId=STAGES.indexOf(event.stage)*2+event.page;
  if(i>0)fail(sequenceId>=ordered[i-1].sequenceId,'stages/pages must be monotonic '+i);
  if(i>0&&sequenceId===ordered[i-1].sequenceId)
   fail(event.focusNumbers!==undefined||typeof event.headline==='string'||typeof event.detail==='string',
     'repeat cue requires a new on-screen focus or approved text '+i);
  if(event.focusNumbers!==undefined){
   fail(Array.isArray(event.focusNumbers)&&event.focusNumbers.every(n=>Number.isInteger(n)&&n>=1&&n<=18)&&
     new Set(event.focusNumbers).size===event.focusNumbers.length,'invalid cue focusNumbers '+i);
  }
  for(const key of ['headline','detail'])if(event[key]!==undefined)
   fail(typeof event[key]==='string'&&event[key].length>0&&event[key].length<=120,
     'invalid cue copy '+key+' '+i);
  ordered.push({...event,atSec:round(event.atSec),sequenceId});
 }
 if(alignmentStatus==='USER_CONFIRMED_TIMESTAMPS')
  fail(typeof input.confirmationSource==='string'&&input.confirmationSource.trim().length>0,
    'confirmed sheet must identify timing evidence');
 return {
  schema:'kbv.scene03.timestamped_cues/v1',
  durationSec:round(durationSec),
  alignmentStatus,
  confirmationSource:input.confirmationSource||null,
  audioFileName:input.audioFileName||null,
  events:ordered
 };
}
export function fromStageDurations(seconds){
 fail(Array.isArray(seconds)&&seconds.length===4&&seconds.every(n=>Number.isFinite(n)&&n>0),'four positive stage durations required');
 const events=[];let at=0;
 for(let i=0;i<4;i++){
  const s=seconds[i];
  events.push({atSec:round(at),stage:STAGES[i],page:0});
  events.push({atSec:round(at+s*.5),stage:STAGES[i],page:1});
  at+=s;
 }
 return validateCueSheet({durationSec:round(at),alignmentStatus:'DEMO_UNALIGNED',events});
}
export function timelineAt(sheet,rawSeconds){
 const t=Math.max(0,Math.min(sheet.durationSec,rawSeconds));
 let k=sheet.events.length-1;
 for(let i=1;i<sheet.events.length;i++)if(t<sheet.events[i].atSec){k=i-1;break}
 const item=sheet.events[k],nextAt=k+1<sheet.events.length?sheet.events[k+1].atSec:sheet.durationSec;
 const first=sheet.events.find(v=>v.stage===item.stage);
 const nextStage=sheet.events.find(v=>STAGES.indexOf(v.stage)>STAGES.indexOf(item.stage));
 const stageEnd=nextStage?nextStage.atSec:sheet.durationSec;
 const elapsed=t-first.atSec,seconds=stageEnd-first.atSec;
 fail(seconds>0&&nextAt>item.atSec,'nonpositive event interval');
 return {index:STAGES.indexOf(item.stage),page:item.page,start:first.atSec,seconds,
  elapsed,stepElapsed:t-item.atSec,stepDuration:nextAt-item.atSec,stepProgress:Math.max(0,Math.min(1,(t-item.atSec)/(nextAt-item.atSec))),cue:item};
}
export function stageStarts(sheet){
 return STAGES.map(stage=>sheet.events.find(v=>v.stage===stage)?.atSec??null);
}
