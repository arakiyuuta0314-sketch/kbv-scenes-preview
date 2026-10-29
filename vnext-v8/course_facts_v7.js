/* Evidence-only bridge for future KBV LLM scenario input.
   No provisional horse positions, invented grade coordinates, pace, or pick scores.
*/
'use strict';
(function(){
 const E=Object.freeze({
  'tokyo-d1400':Object.freeze({
   source:'https://sugo.jra-van.jp/sugotoku/crs/crs05d1400.html',
   statements:[
    {key:'starting_surface',value:'dirt',evidence:'JRA-VAN_COURSE_TEXT'},
    {key:'early_terrain',value:'gentle_uphill_after_initial_straight',evidence:'JRA-VAN_COURSE_TEXT',
     description:'スタートからしばらく進んだところで緩やかな上り坂'},
    {key:'turn3_to_turn4',value:'approximately_flat',evidence:'JRA-VAN_COURSE_TEXT',
     description:'3～4コーナーはほぼ平坦'}
   ]
  }),
  'nakayama-t2000-A':Object.freeze({
   source:'https://sugo.jra-van.jp/sugotoku/crs/crs06t2000.html',
   statements:[
    {key:'starting_surface',value:'turf',evidence:'JRA-VAN_COURSE_TEXT'},
    {key:'early_terrain',value:'uphill_until_midway_between_first_and_second_corners',
     evidence:'JRA-VAN_COURSE_TEXT',description:'1～2コーナーの中間までは上り坂'},
    {key:'finish_terrain',value:'steep_uphill_near_finish',
     evidence:'JRA-VAN_COURSE_TEXT',description:'ゴール前には高低差約2.2mの上り坂'}
   ]
  })
 });
 function fromRace(r){
  if(!r||!r.courseId)throw Error('DATA ERROR: race.courseId required for terrain material');
  const c=r.course||window.KBV_COURSES[r.courseId];
  if(!c)throw Error('DATA ERROR: unknown course');
  const verified=window.KBV_ASSERT_COURSE_MASTER(r,c);
  const e=E[c.id];
  if(!e)throw Error('DATA ERROR: verified qualitative course facts not authored for '+c.id);
  if(!Number.isFinite(c.firstTurn.distance))throw Error('DATA ERROR: missing first-turn distance');
  return JSON.parse(JSON.stringify({
   schema:'kbv.terrain-facts/v1',
   status:'FACTS_ONLY_NO_SCORE',raceId:r.sampleOnly?null:r.id,
   courseIdentity:{
    masterSourceSha256:window.KBV_COURSE_MASTER_SNAPSHOT.source_sha256,
    venue:verified.venue_code,surface:verified.surface,courseVariant:verified.course_variant,
    distanceM:verified.distance_m,cornerCount:verified.corner_count,
    verificationStatus:verified.verification_status,officialUrl:verified.jra_official_url
   },
   facts:{
    firstCornerName:c.firstTurn.label,
    firstTurnDistanceM:{value:c.firstTurn.distance,precision:'approximately',source:e.source},
    qualitative:e.statements,
    straightLengthM:{value:c.straight,source:verified.jra_official_url},
    totalElevationRangeM:{value:c.totalElevation,source:verified.jra_official_url}
   },
   exclusions:[
    'Scene03 diagram-drawn GPS geometry','Scene03 approximate altitude breakpoints',
    'estimated horse lanes and animation timings','pace labels','ability or score adjustments'
   ],
   note:'Do not assume hill effect on a horse or pace without separate race evidence.'
  }));
 }
 window.KBV_TERRAIN_FACTS_V7=Object.freeze({fromRace});
})();
