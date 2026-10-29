/* JRA public course-diagram geometry manually digitized from official diagrams.
   SOURCE: JRA facility course pages. These coordinates are graphic tracing
   NOT survey/GPS and must NEVER be labeled a measured 3D mesh. */
'use strict';
window.KBV_COURSE_TRACES_V5=Object.freeze({
 'tokyo-d1400':{
   source:"JRA東京競馬場：ダート平面図・立体図・高低断面図",
   flatImage:"https://www.jra.go.jp/facilities/race/tokyo/course/img/pic_course_heimenzu.gif",
   gradeImage:"https://www.jra.go.jp/facilities/race/tokyo/course/img/pic_course_durt.gif",
   lapMeters:1899, widthMeters:25, pictureWidth:568,pictureHeight:386,
   rotation:'left',surface:'dirt',
   // Listed in actual running order from the finish line. Closed route.
   center:[[355,260],[408,257],[442,250],[466,233],[480,204],[484,169],
     [478,137],[461,111],[437,92],[406,80],[364,78],[315,78],
     [251,79],[191,78],[137,80],[100,92],[78,112],[62,143],
     [57,180],[65,214],[85,237],[115,252],[158,259],[236,260],[275,260],[318,260]],
   start:[315,78],firstCorner:[78,112],goal:[355,260],
   // Read visually at rough breakpoints from JRA profile chart, not surveyed elevations.
   grade:[[0,0],[.09,-.4],[.19,-1.15],[.26,-1.85],[.36,-1.15],
       [.42,-1.05],[.51,-2.45],[.68,-2.4],[.76,-2.4],
       [.9,-.05],[1,0]],
   profileMethod:"JRA公式のダート高低断面図を手動サンプリング（位置と標高とも概算）",
   innerLabel:"ダート・左回り",
   // The start section is shown at full course geometry, not an invented oval.
   firstTurnMeters:440
 },
 'nakayama-t2000-A':{
   source:"JRA中山競馬場：芝内回りの平面図・立体図・芝内回り高低断面図",
   flatImage:"https://www.jra.go.jp/facilities/race/nakayama/course/img/pic_course_heimenzu.gif",
   gradeImage:"https://www.jra.go.jp/facilities/race/nakayama/course/img/pic_course_turf.gif",
   lapMeters:1667.1, widthMeters:26, widthMetersRange:[20,32],widthBasis:"JRA公表20～32mの中間値を描画上の代表幅として使用", pictureWidth:572,pictureHeight:438,
   rotation:'right',surface:'turf',
   center:[[238,314],[192,310],[175,307],[152,296],[125,276],[108,248],[105,217],
    [114,187],[136,157],[174,135],[228,123],[286,119],[353,121],
    [408,133],[454,152],[480,179],[495,209],[495,244],
    [481,279],[452,301],[421,310],[352,315],[290,315]],
   start:[421,310],firstCorner:[175,307],goal:[238,314],
   grade:[[0,0],[.1,2.3],[.18,2.7],[.29,1.0],[.43,-1.7],
       [.57,-2.0],[.69,-2.0],[.81,-2.3],[.9,-1.2],[1,0]],
   profileMethod:"JRA公式の芝内回り高低断面図を手動サンプリング（位置と標高とも概算）",
   innerLabel:"芝A・右内回り",
   firstTurnMeters:405
 }
});