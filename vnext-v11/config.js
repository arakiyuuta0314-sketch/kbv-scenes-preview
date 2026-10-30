/* KBV Scene03 / v2 — data only; engine code has no venue-specific horse names. */
'use strict';
const COURSE_CATALOG = Object.freeze({
 "tokyo-d1400": {
  id:"tokyo-d1400", venue:"東京", surface:"ダート", distance:1400, rotation:"left", layout:"standard",masterRef:{venueCode:"05",surface:"dirt",variant:"normal",distance:1400},
  firstTurn:{label:"3コーナー",distance:440, display:"約440", note:"スタートから3コーナーまで、約440m。"},
  straight:501.6, totalElevation:2.5, spotlightRise:2.4, spotlightText:"直線の上り坂：高低差2.4m",
  gradeTitle:"3角手前の起伏と、直線の長い上り",formationSlopeLabel:"3コーナー手前の上り",
  gradeBody:"序盤は3コーナー手前に上りがあり、その先は下り勾配。直線にも上り坂があります。",
  surfacePalette:"dirt",approachRelief:[.08,.12,.2,.39,.55,.63,.57,.41],
  model4:{outer:"M123 217 C218 155 382 145 565 145 L757 145 C900 146 955 211 944 297 C934 382 840 419 685 433 L336 437 C175 428 77 367 83 286 C86 258 98 235 123 217 Z",inner:"M188 256 C260 215 411 209 563 209 L744 209 C826 210 866 250 860 301 C856 349 779 368 662 375 L355 379 C248 372 167 332 165 292 C164 279 172 267 188 256 Z",start:[744,176],turn:[151,246],route:"M744 171 C525 153 297 165 158 237",shapeTag:"東京ダート・外周イメージ",camYaw:-1},
  shape:{loopScaleX:1,loopScaleY:1, turnRadius:.9},
  // Visual normalized schematic path. NO surveyed ground heights or true grading.
  profile:[.24,.24,.28,.59,.57,.37,.36,.61,.66],
  sources:["https://www.jra.go.jp/facilities/race/tokyo/course/index.html","https://www.jra.go.jp/keiba/thisweek/2026/0201_1/race.html"]
 },
 "nakayama-t2000-A": {
  id:"nakayama-t2000-A", venue:"中山",surface:"芝",distance:2000,rotation:"right",layout:"inner-A",masterRef:{venueCode:"06",surface:"turf",variant:"inner",distance:2000},
  firstTurn:{label:"1コーナー",distance:405,display:"約405",note:"Aコース使用時は、1コーナーまで約405m。"},
  straight:310,totalElevation:5.3,spotlightRise:2.2,spotlightText:"ゴール前の急坂：高低差2.2m",
  gradeTitle:"スタート直後とゴール前、二度の上り",formationSlopeLabel:"スタート直後の上り",
  gradeBody:"スタートして間もなく上り坂。コーナーを経て、最後の短い直線にも急坂があります。",
  surfacePalette:"turf",approachRelief:[.04,.15,.35,.5,.64,.76,.77,.78],
  model4:{outer:"M188 199 C304 126 641 123 799 183 C929 234 967 317 897 378 C841 428 698 447 494 447 L322 443 C187 436 85 379 92 291 C96 244 134 220 188 199 Z",inner:"M236 244 C337 191 635 183 756 231 C835 261 863 308 816 344 C765 383 645 392 490 391 L324 388 C236 383 172 344 173 301 C174 271 195 260 236 244 Z",start:[481,157],turn:[824,228],route:"M481 166 C634 147 766 182 821 234",shapeTag:"中山芝・内周イメージ",camYaw:1},
  shape:{loopScaleX:.9,loopScaleY:.9,turnRadius:.65},
  profile:[.22,.59,.8,.7,.48,.27,.19,.63,.79],
  sources:["https://www.jra.go.jp/facilities/race/nakayama/course/index.html","https://www.jra.go.jp/keiba/g1/satsuki.html"]
 }
});
const tokyoNames=[
 "エコロアゼル","メリディアンスター","バトゥーキ","ベルジュロネット","ノーブルロジャー","タイセイブレイズ",
 "ヨリノレジェンド","ジャスパーゴールド","フェルヴェンテ","アッチャゴーラ","リラエンブレム","ニシキギミッチー",
 "リュウノフライト","アドバンスファラオ","スリーピース","ワイワイレジェンド"
];
const tokyoWaku=[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8];
const originalXY=[[380,333],[582,364],[850,329],[538,303],[701,293],[791,335],[492,343],[432,296],[439,363],[714,369],[649,334],[844,262],[287,277],[289,340],[363,277],[222,312]];
const TOKYO_RUNNERS=tokyoNames.map((name,i)=>({
 number:i+1,name:name,waku:tokyoWaku[i],
 formation:{progress:Math.max(0.035,Math.min(.95,(originalXY[i][0]-222)/685)),lane:Math.max(.11,Math.min(.72,(390-originalXY[i][1])/175))}
}));
const SAMPLE_RUNNERS=Array.from({length:12},(_,i)=>({
 number:i+1,name:"表示テスト馬"+String(i+1).padStart(2,"0"),
 waku:Math.min(8,Math.floor(i*8/12)+1),
 formation:{progress:[.64,.18,.43,.83,.38,.48,.21,.61,.91,.75,.53,.07][i],lane:[.29,.38,.64,.26,.49,.17,.56,.68,.43,.57,.29,.37][i]}
}));
const RACE_SAMPLES=Object.freeze({
 tokyo:{
  schema:"kbv.scene03.v2",id:"2026-10-25_tokyo_d1400",raceName:"神無月ステークス｜予想例",date:"2026-10-25",courseId:"tokyo-d1400",
  runners:TOKYO_RUNNERS, focusNumbers:[16,14,13,4],
  copy:{
   intro:{eyebrow:"COURSE / コースの特徴",heading:"コースを知る。<em>展開を読む。</em>",sub:"スタートから最初のコーナーへ。地形と距離を立体的に整理。",speech:"東京のダート1400m。スタートから3コーナーまでは約440m。3コーナー手前に上りがあり、最後の直線にも高低差2.4mの上り坂があります。",footer:"コースの起伏を知り、序盤の位置取りを考える。"},
   action:{eyebrow:"START & FORMATION / 想定隊列",heading:"ゲートが開き、<em>先手争いへ。</em>",sub:"最初のコーナーに向けて、全頭の位置関係を追う。",speech:"逃げ候補には16番ワイワイレジェンド。14番アドバンスファラオ、13番リュウノフライトも先頭を意識する想定。前後関係が整うまでを見ます。",early:"先手を取るのは誰か。",late:"16番を中心に、先行勢が位置を取る。",body:"⑯を先頭候補に、⑭・⑬も前を意識。内外の進路は映像検証用の仮配置。",footer:"序盤の位置争い。どの馬が前へ出るか。"},
   review:{eyebrow:"FORMATION REVIEW / 隊列を読む",heading:"コーナー進入前。<em>隊列を確認。</em>",sub:"3コーナー進入前で停止。全頭の前後と内外を読む。",speech:"最初のコーナーまでに隊列が整う想定です。先行候補の後ろに好位勢が続きます。先頭争いの長さが展開の焦点になります。",title:"先頭争いの長さが、展開を左右。",body:"逃げ候補がスムーズに隊列を作るか。先頭争いが長引けば、その後ろで脚をためる馬にも注目です。",points:["⑯の出方が先頭争いの焦点","⑭・⑬も前を意識する想定","④の位置取りにも注目"],footer:"先手争いの長さと、後続の脚の残り方に注目。"}
  }
 },
 nakayama:{
  schema:"kbv.scene03.v2",id:"display_test_nakayama_t2000",raceName:"中山芝2000m｜表示テスト",date:"検証サンプル",sampleOnly:true,courseId:"nakayama-t2000-A",
  runners:SAMPLE_RUNNERS,focusNumbers:[12,2,7],
  copy:{
   intro:{eyebrow:"COURSE / コースの特徴",heading:"最初の坂から、<em>レースが動く。</em>",sub:"中山・芝2000m（Aコース）の特徴を確認。",speech:"スタートから1コーナーまで約405m。中山はコース全体の高低差5.3m。ゴール前には高低差2.2mの急坂があります。",footer:"中山の起伏とコーナーまでの距離。"},
   action:{eyebrow:"START & FORMATION / 表示テスト",heading:"坂を越え、<em>最初のコーナーへ。</em>",sub:"頭数・枠色・方向の可変検証用。",speech:"ここにレースごとの展開説明が入ります。馬の位置取りはすべて表示テスト用の仮データです。",early:"頭数の変化を確認。",late:"12頭での隊列配置を確認。",body:"レース予測ではありません。12頭・右回り・芝コース用の表示検証です。",footer:"レースの想定隊列は後からJSONで差し替える。"},
   review:{eyebrow:"FORMATION REVIEW / 表示テスト",heading:"全12頭を、<em>一度に確認。</em>",sub:"実レースの予想ではない、表示検証専用画面。",speech:"頭数やレース条件を変更しても、全頭が読み取れるかを確認しています。",title:"頭数が変わっても、読みやすく。",body:"正式予想のデータが入るまでは、走行位置と展開評価を事実として表示しません。",points:["右回りコースの表示に切り替え","12頭の馬番表示を検証","芝の色・坂・距離を差し替え"],footer:"同じ表現基盤で、異なるコースにも対応。"}
  }
 }
});
window.KBV_COURSES=COURSE_CATALOG;
window.KBV_RACES=RACE_SAMPLES;