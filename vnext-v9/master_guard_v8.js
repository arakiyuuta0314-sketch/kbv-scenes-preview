/* Scene03 v8: validate race against the published v5 course master identity.
   No effective-date filters: v5 explicitly removed those fabricated date ranges. */
'use strict';
(function(){
 const snapshot=window.KBV_COURSE_MASTER_SNAPSHOT;
 const expectedSha='8f7e7c5f0a3d7ef724bc67f4e395cc8bb11c64f1484565a69e9c4b68a14ab884';
 if(!snapshot||snapshot.schema!=='kbv.scene03.master-snapshot/v2'||
    snapshot.source_version!==5||snapshot.source_sha256!==expectedSha||
    !Array.isArray(snapshot.rows)||snapshot.rows.length!==134)
  throw Error('DATA ERROR: published KBV v5 course master mismatch / missing');
 const status=new Set(['JRA_DIRECT_COUNT','JRA_ROUTE_DERIVED']);
 window.KBV_ASSERT_COURSE_MASTER=function(r,c){
   if(!c.masterRef)throw Error('DATA ERROR: course.masterRef missing');
   const k=c.masterRef;
   if(!/^\d{2}$/.test(k.venueCode)||!['turf','dirt'].includes(k.surface)||
      !['normal','inner','outer','straight','outer_then_inner'].includes(k.variant)||
      !Number.isInteger(k.distance)||k.distance!==c.distance)
     throw Error('DATA ERROR: invalid course master identity');
   if(!r.sampleOnly){
     const date=r.date||'';
     const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
     if(!m||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)
       throw Error('DATA ERROR: race must have a valid YYYY-MM-DD date');
   }
   const matches=snapshot.rows.filter(row=>
     row.venue_code===k.venueCode&&row.surface===k.surface&&
     row.course_variant===k.variant&&row.distance_m===k.distance);
   if(matches.length!==1)throw Error('DATA ERROR: course master key unresolved or ambiguous');
   const row=matches[0];
   if(!status.has(row.verification_status)||!Number.isInteger(row.corner_count)||
      row.jra_diagram_url?.startsWith('https://www.jra.go.jp/')!==true||
      row.jra_official_url?.startsWith('https://www.jra.go.jp/')!==true||
      row.source_authority!=='JRA')
      throw Error('DATA ERROR: course master evidence incomplete');
   // v5 is a single current course definition and cannot certify old revisions of the course.
   return row;
 };
})();
