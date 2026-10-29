/* v8 stop-point annotation: derived from the exact same normalized motion function
   as the course inset. Never treat it as surveyed horse-distance telemetry. */
'use strict';
(function(){
 const field=document.querySelector('.reviewField');
 if(!field)throw Error('DATA ERROR: review scene missing');
 const bar=document.createElement('div');
 bar.id='reviewLocationV8';field.append(bar);
 const prev=updateReview;
 updateReview=function(){
   prev();
   const ref=window.KBV_COURSE_MOTION_V7.reference(1);
   const approx=Math.round((1-ref.u)*course.firstTurn.distance);
   if(approx<0||!Number.isFinite(approx))throw Error('DATA ERROR: stop-point projection invalid');
   bar.replaceChildren();
   bar.append(document.createTextNode(course.firstTurn.label+'進入前・先頭想定 '+ref.number+'番 ／ 約'+approx+'m手前'));
   const sub=document.createElement('small');sub.textContent='（映像上の目安）';bar.append(sub);
 };
})();
