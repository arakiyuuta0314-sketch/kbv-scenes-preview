#!/usr/bin/env python3
"""Build Scene03 timing from a real PCM WAV header and explicit, externally confirmed cues.
Never estimates which words occur when. Read-only source audio.
"""
import argparse
import json
import wave
from pathlib import Path

STAGES=("course","slope","formation","review")
ALLOWED=("DEMO_UNALIGNED","USER_CONFIRMED_TIMESTAMPS")
def fail_if(condition,message):
    if condition: raise ValueError("TIMELINE ERROR: "+message)

def build(wav_path:Path,cues_path:Path):
    with wave.open(str(wav_path),"rb") as wav:
        rate=wav.getframerate()
        count=wav.getnframes()
        channels=wav.getnchannels()
        width=wav.getsampwidth()
    fail_if(rate<=0 or count<=0,"invalid WAV duration")
    seconds=round(count/rate,6)
    incoming=json.loads(cues_path.read_text(encoding="utf-8"))
    events=incoming.get("events")
    status=incoming.get("alignmentStatus")
    fail_if(status not in ALLOWED,"alignmentStatus missing/invalid")
    fail_if(not isinstance(events,list) or not 1<=len(events)<=50,"cue events missing")
    fail_if(status=="USER_CONFIRMED_TIMESTAMPS" and
            not str(incoming.get("confirmationSource","")).strip(),
            "user-confirmed cue source missing")
    ids=set()
    previous_time=-1
    previous_order=-1
    for n,event in enumerate(events):
        stage=event.get("stage")
        page=event.get("page")
        at=event.get("atSec")
        fail_if(stage not in STAGES or page not in (0,1),"invalid stage/page "+str(n))
        fail_if(isinstance(at,bool) or not isinstance(at,(int,float)) or not 0<=at<seconds,
                "invalid timestamp "+str(n))
        key=STAGES.index(stage)*2+page
        fail_if(key in ids or key<=previous_order,"cue order invalid "+str(n))
        fail_if(at<=previous_time,"cue time order invalid "+str(n))
        previous_time=at
        previous_order=key
        ids.add(key)
    fail_if(abs(events[0]["atSec"])>0.000001,"first cue must start at 0")
    if incoming.get("wavSeconds") is not None:
        fail_if(abs(seconds-incoming["wavSeconds"])>.03,"WAV duration mismatch")
    return {
       "schema":"kbv.scene03.timestamped_cues/v1",
       "durationSec":seconds,
       "audioFileName":wav_path.name,
       "wavHeader":{"sampleRateHz":rate,"channels":channels,"bitsPerSample":width*8,"frames":count},
       "alignmentStatus":status,
       "confirmationSource":incoming.get("confirmationSource") if status=="USER_CONFIRMED_TIMESTAMPS" else None,
       "events":events
    }

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--wav",required=True,type=Path)
    ap.add_argument("--cues",required=True,type=Path)
    ap.add_argument("--out",required=True,type=Path)
    args=ap.parse_args()
    output=build(args.wav,args.cues)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"durationSec":output["durationSec"],"alignmentStatus":output["alignmentStatus"],
         "cues":len(output["events"]),"output":str(args.out)},ensure_ascii=False))
