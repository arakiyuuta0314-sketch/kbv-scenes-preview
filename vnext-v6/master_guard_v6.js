/* Scene03 v6: course identity only. 3D geometry comes from separately verified trace data. */
'use strict';
(function(){
 const snapshot=window.KBV_COURSE_MASTER_SNAPSHOT;
 if(!snapshot||snapshot.schema!=='kbv.scene03.master-snapshot/v1'||snapshot.source_version!==4||
    snapshot.source_sha256!=='e5a1132f85326442688c6c1e96234742149cd3c9d247c819999a955d6441f79e'||
    !Array.isArray(snapshot.rows)||snapshot.rows.length!==134)
   throw Error('DATA ERROR: pinned KBV course master snapshot missing or invalid');
 window.KBV_ASSERT_COURSE_MASTER=function(r,c){
   if(!c.masterRef)throw Error('DATA ERROR: course.masterRef missing');
   const k=c.masterRef;
   if(!/^\d{2}$/.test(k.venueCode)||!['turf','dirt'].includes(k.surface)||
      !['normal','inner','outer','straight','outer_then_inner'].includes(k.variant)||
      !Number.isInteger(k.distance))throw Error('DATA ERROR: course.masterRef invalid');
   if(k.distance!==c.distance)throw Error('DATA ERROR: course master distance mismatch');
   const candidates=snapshot.rows.filter(x=>
     x.venue_code===k.venueCode&&x.surface===k.surface&&
     x.course_variant===k.variant&&x.distance_m===k.distance);
   if(candidates.length!==1)throw Error('DATA ERROR: course master identity unresolved or ambiguous');
   const row=candidates[0];
   if(!['JRA_DIRECT_COUNT','JRA_ROUTE_DERIVED'].includes(row.verification_status))
      throw Error('DATA ERROR: course master condition not certified');
   const date=/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')?r.date.replaceAll('-',''):null;
   if(date){
     if(date<row.effective_from_ymd||(row.effective_to_ymd&&date>row.effective_to_ymd))
       throw Error('DATA ERROR: race date outside master evidence range');
   }else if(!r.sampleOnly)throw Error('DATA ERROR: race date required for official master validation');
   if(!row.jra_official_url?.startsWith('https://www.jra.go.jp/'))
     throw Error('DATA ERROR: JRA course provenance missing');
   return row;
 };
})();
