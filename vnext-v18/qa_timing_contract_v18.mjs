import assert from 'node:assert/strict';
import {fromStageDurations,validateCueSheet,timelineAt,stageStarts} from './timing.mjs';
const f=fromStageDurations([5,5,7,5]);
assert.equal(f.durationSec,22);
assert.equal(f.alignmentStatus,'DEMO_UNALIGNED');
assert.deepEqual(stageStarts(f),[0,5,10,17]);
assert.equal(timelineAt(f,12).index,2);
assert.equal(timelineAt(f,20).index,3);
assert.equal(timelineAt(f,22).page,1);
const v=validateCueSheet({durationSec:35.776,alignmentStatus:'DEMO_UNALIGNED',events:[
{atSec:0,stage:'formation',page:0},{atSec:10,stage:'formation',page:1},
{atSec:19,stage:'review',page:0},{atSec:27,stage:'review',page:1}
]});
assert.deepEqual(stageStarts(v),[null,null,0,19]);
assert.deepEqual([timelineAt(v,0).page,timelineAt(v,9.99).page,timelineAt(v,10).page],[0,0,1]);
assert.deepEqual([timelineAt(v,18.999).index,timelineAt(v,19).index],[2,3]);
assert.equal(timelineAt(v,35.776).stepProgress,1);
const invalid=[
{...v,events:[{atSec:0,stage:'review',page:0},{atSec:2,stage:'course',page:0}]},
{...v,events:[{atSec:0,stage:'formation',page:0},{atSec:0,stage:'formation',page:1}]},
{...v,events:[{atSec:0,stage:'formation',page:0},{atSec:45,stage:'review',page:0}]},
{...v,alignmentStatus:'USER_CONFIRMED_TIMESTAMPS',confirmationSource:null},
{...v,alignmentStatus:'UNKNOWN'},
];
for(const i of invalid) assert.throws(()=>validateCueSheet(i),/TIMELINE ERROR/);
const repeated=validateCueSheet({durationSec:35.776,alignmentStatus:'DEMO_UNALIGNED',events:[
{atSec:0,stage:'formation',page:0},
{atSec:11,stage:'review',page:0},
{atSec:18,stage:'review',page:1,focusNumbers:[2,7],headline:'デモ画面'},
{atSec:29,stage:'review',page:1,focusNumbers:[12],detail:'別の注目馬'}
]});
assert.equal(timelineAt(repeated,22).cue.focusNumbers.length,2);
assert.deepEqual(timelineAt(repeated,30).cue.focusNumbers,[12]);
assert.throws(()=>validateCueSheet({...repeated,events:[
{atSec:0,stage:'review',page:1},{atSec:10,stage:'review',page:1}]}),/TIMELINE ERROR/);
assert.equal(fromStageDurations([6,6,15,33]).durationSec,60);
console.log(JSON.stringify({status:'PASS',cases:13,actualSampleDuration:35.776,minuteDuration:60,
    producesTimestampsWithoutInventingSpeech:false}));
