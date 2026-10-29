/* Coarse staging label: a narrative checkpoint, not surveyed horse telemetry.
   The animated normalized u is deliberately NOT converted into race meters.
   Exact stage placement is not part of the prediction model.
*/
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
   if(!Number.isInteger(ref.number)||!course.firstTurn?.label)
     throw Error('DATA ERROR: incomplete coarse formation checkpoint');
   bar.replaceChildren();
   bar.append(document.createTextNode(course.firstTurn.label+'進入前付近・隊列の区切り'));
   const sub=document.createElement('small');
   sub.textContent='先頭想定 '+ref.number+'番 ／ 位置は模式表現';
   bar.append(sub);
 };
})();
