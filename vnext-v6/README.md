# KBV Scene03 Cinematic Lab v2

## 役割と完成範囲
コースの立体模式図 → スタートから最初のコーナーまでの隊列形成 → 全頭静止の展開解説、というHTML試作品。
既存 /vnext/ と / は変更しない。KBV本番・公開動画への組み込みは未実施。

## レース可変のデータ契約
- config.js：COURSE_CATALOG（コース）とRACE_SAMPLES（レース）を分離。
- コース：venue, surface, distance, rotation, firstTurn, straight, totalElevation, spotlightRise, profile, sources など。表示エンジンには特定場の距離値を埋め込まない。
- レース：schema=kbv.scene03.v2, id, raceName, date, courseId, runners, focusNumbers, copy。
- runners：2～24頭。number, name, waku, formation:{progress,lane} が必須。progress は隊列完成時の前後位置（0先頭～1後方）、lane は内外位置（0内寄り～1外寄り）。
- waku（枠）とlane（進路）は独立。枠から進路を勝手に推測しない。
- focusNumbers：強調したい馬番。存在しない番号はエラー。
- copy.intro / action / review：speech（ナレーション内容の要約・方向）および見出し／本文。speech の文字数比率から各パートの長さの割合を自動計算。秒数の固定指定はしない。
- レースJSONはブラウザから読込可能。未知のコースはJSON内にcourseオブジェクトを同梱。欠損や不正値はエラー（補完しない）。
- ナレーションWAVを指定した場合、実際のaudio.durationを総尺とする。音声未指定時は操作確認用のプレビュー再生。
- 音声内容の認識、語句ごとの完全同期、MP4書き出しは未実装。

## 検証用の2レース
1. 神無月ステークス（2026-10-25、東京ダート1400m、16頭）
   - 馬名・馬番・枠は既存KBV参考。前後・内外の走行位置は表示試作用の仮配置であり、実際の走行位置や確定予想ではない。
   - 3コーナーまで約440m。直線501.6m。直線の上り高低差2.4m。コース全体の高低差2.5m。
2. 中山芝2000m（Aコース、12頭、表示テスト）
   - 架空の「表示テスト馬01」など。実在レースの予想ではない。
   - 1コーナーまで約405m、直線310m、全高低差5.3m、直線の急坂高低差2.2m。右回りと芝表示を確認。

## コース資料
- JRA 東京 https://www.jra.go.jp/facilities/race/tokyo/course/index.html
- JRA 根岸S https://www.jra.go.jp/keiba/thisweek/2026/0201_1/race.html
- JRA 中山 https://www.jra.go.jp/facilities/race/nakayama/course/index.html
- JRA 皐月賞 https://www.jra.go.jp/keiba/g1/satsuki.html

3D風モデル、高低断面、コース線形、馬の軌跡はすべて非縮尺の模式図。測量済み地形や実際の通過地点とは扱わない。

## 品質管理
- 16頭／12頭の両方で欠落・番号重複・JavaScriptエラーがないことを確認。
- 進行率指定により各場面を静止画像として検証可能。
- 音声の長さをWAV実ファイルで検証。話題転換の厳密な同期は別工程。
- Git規則 main→issue→work。正式公開の指示なくmainに統合しない。

## 次の段階
より正確なコース形状を再現するなら公的な幾何情報が必要。必要な場所が出た時だけ非縮尺モデルを差し替える。制作フローでは、NARRATIONとPICKの確定JSONから語句・演出を供給し、DaVinci ResolveのWAVを正本にした動画書き出しにつなぐ。


## v3 追加内容（2026-10-29）
- コースの起伏を紹介画面から独立させず、スタートからコーナーまで馬番が動く画面内にも表示する。cinematic.js が terrainModel をパラメトリックに描き、起伏モデルに応じて路面の端を視覚上上下させる。
- 立体路盤（側面）、手前の内ラチ・支柱、路面の模様とコース図の高低補助線を追加。
- 各コースの approachRelief に0〜1の正規化された演出用起伏を必須で与える。JRA公表の勾配・実測標高ではない。未知コースの起伏は作らずエラーにする。
- ELEVATION / 起伏 のHUDで、コーナーまでの登り／下りを文章と簡易グラフで表示。マーカーはアニメーションの進捗に対応し、実際の走行距離やラップ時計ではない。
- ズーム・カメラ移動は約6.5%以内に制限し、全馬番の読みやすさを維持する。動画尺は引き続きナレーションWAVが正。固定秒数指定なし。
- 最初のコーナーまでの数字はコースの距離だが、馬番移動の進行率は説明映像の進捗。擬似的な走破距離をリアルタイム表示する処理を廃止。
- 東京16頭・中山芝2000m（右回り）12頭で描画・移動・方向を検証。39.04秒の既存WAVで音声長を取得。
- 元のv2ファイルは変更せず、vnext-v3 に別版を保持する。

## 追加で必要な精度改善
- 現時点のコース俯瞰図は競馬場のイメージを伝える模式図。実際のコーナーの曲率、起伏の測定位置、内ラチの正確な線形は未対応。
- 正確なコースモデルが必要ならJRA公式のコース図を一次資料として用い、測量値の有無は別途確認する。実測していないものを実測3Dとは呼ばない。
- 馬の前後位置・走行レーンは従来隊列の表示試用値。枠番号を走行レーンと同一視しない。


## v4 — 画づくり・カメラ・コース別造形の改修（2026-10-30）

- v3を変更せずvnext-v4に分岐。追加ファイル visual_v4.js / visual_v4.css。
- コース辞書の model4 に outer（外周輪郭）、inner（内側境界）、route（強調区間）、start（発走点）、turn（最初のコーナー）、camYaw（緩いカメラの寄せ方向）、shapeTag を追加。
- 東京ダ1400mと中山芝2000mの2例で別個の描画データを用意。ここでの位置・曲率・横幅はデザイン用の非縮尺形状であり、測量値ではない。
- 路盤を別ポリゴンとして押し出し、コース側面・光源方向を意識したグラデーション・路面粒子・内ラチの縁取り・影を追加。
- コース全景のカメラを時間（ナレーションから得た進行率）に応じて滑らかに移動。馬群場面のズームは小さく抑えて全馬視認性を維持。
- 馬番のハイライトと縁・落ち影、コース情報カードのコントラストを調整。画面内に重複していた勾配と距離の文字注釈を削除。
- 馬群の重なり抑制を改善。走行位置は引き続きデモデータで、実測や確定予想ではない。
- 既存のナレーションWAVの実尺39.04秒、東京16頭・中山12頭、右左回り、モバイル幅、不正入力例をブラウザでQA。
- 最初のコーナーまでの距離は実際のコース情報であって、動画上で馬番が移動する速さは実際の競走速度ではない。
- 正確な競馬場コース図への置換は未完了。今後レース別形状データに公式図の検証結果を接続可能だが、実測3D表現と断言しない。
- 秒数は固定しない。WAV durationが全体の正本。字幕と発声タイミングの完全一致・MP4出力は未実装。

### ファイル

- config.js：競馬場・レース別の入力値。model4を追加。
- app.js：共通のレース入力検証、描画、ナレーション連動、隊列。
- cinematic.js：v3で導入した地形・起伏・カメラの基礎。
- visual_v4.js：v4のコース別曲線とライティング・カメラ演出・情報重複解消。
- style.css / cinematic.css / visual_v4.css：表示スタイルを段階別に分離。
- comparison_v4.jpg：実際のブラウザ描画から生成した四場面の比較画像。


## v5 — JRA平面図・高低断面図のトレース（2026-10-30）

### 実際に取り込んだ根拠
- 東京ダート1400m：JRA公式コース平面図・3Dイラスト・ダート高低断面図と、JRA-VANのスタート地点／3角までの解説。
- 中山芝2000m（A）：JRA公式コース平面図・3Dイラスト・芝内回り高低断面図と、JRA-VANの芝2000mコース解説。
- 東京ダート：一周1899m、幅員25m、直線501.6m、最大高低差2.5m。スタートから3角まで約440m。
- 中山芝A内回り：一周1667.1m、直線310m、最大高低差5.3m。芝2000mのスタートから1角まで約405m。

公式参照：
- https://www.jra.go.jp/facilities/race/tokyo/course/index.html
- https://www.jra.go.jp/facilities/race/nakayama/course/index.html
- https://sugo.jra-van.jp/sugotoku/crs/crs05d1400.html
- https://sugo.jra-van.jp/sugotoku/crs/crs06t2000.html

### 幾何と高さのデータの精度
- jra_trace_data.jsに各コースの走行順に並べた中心線のトレース点を実装。実際の公式図から画素上の位置を読み取った近似輪郭であり、ジオリファレンス済みGISや測量データではない。
- コース幅は公表されている値を中心線長に対する比としてモデルに反映。図の非縮尺・紙面変形により、絶対寸法は保証しない。
- ルートはSTARTから最初のコーナーまでを公式図に沿って抽出し、実レース方向に進む。ゴール地点を別表示。
- 高低断面図に描かれたラインの代表点を手動で概略読み取り、全周の標高（相対高低）へ対応。公表のコース長とコーナーまでの距離をアンカーとして、距離と図の画素長の不一致を補正。
- この処理は「公式図のトレース＋距離アンカーの整合補正」であり、測量高度の値ではない。坂勾配を厳密な角度・勾配百分率として表示しない。
- 坂のグラフと路盤の上下は上記トレースに由来。v4以前の手描き楕円や架空の起伏ラインを表示用の正本にしない。
- 実競走馬の通過位置・実レーンは未来の予想なので確定できない。馬番はKBVの想定前後位置と想定内外に沿って動く。枠番と実走レーンは混同しない。
- トレース未登録の競馬場・コース条件は明示エラー。類似コースへの自動フォールバック禁止。
- JRA公式の図自体は画面・Gitに複製せず、出典リンクだけを保存。サンプルは独自生成SVGのコースモデル。

### 実装
- jra_trace_data.js：JRA平面図に基づく走路中心線、START/コーナー/GOAL、幅員・周回・断面ライン代表点。
- jra_geometry_v5.js：閉曲線補間、内外境界・路盤・高さを含む2.5Dメッシュ、コース紹介ルート、実コースの向きに対応した隊列アニメーション、欠損検証。
- 既存のナレーション長への追従と表示テキスト可変はそのまま維持。固定秒数なし。

### 検証結果
- ブラウザで東京16頭、中山12頭の起伏・コース形状・発走後の移動を表示。JavaScriptエラー0件。
- 全頭の走行マーカー座標がアニメーション表示枠内に収まることを確認。
- コース図からの距離比：東京のSTART→最初のコーナーはトレース画像長で約23.24%（公表距離比23.17%）、中山は約25.14%（公表距離比24.29%）。非縮尺画像の概略整合チェックであり測量精度ではない。
- 試作用の39.04秒WAVを読み込み、総動画尺に反映したことを確認。
- コース未登録はfail-fast。既存v4は変更せず残している。

### まだ未達の「完全な実測3D」
- 厳密なGPS測位済み中心線、ラチの測量座標、3D標高グリッド、公式勾配の各地点値、実測カーブ半径は今回の公式画像からは取得できない。
- そのためこれは実際の形状・起伏をできるだけ忠実に模した2.5D地形モデルであり、測量に基づく正確な3Dデジタルツインではない。
- 完全な実測3Dに進むなら、測量済みコース平面線形と標高・バンク情報の入手が必要。映像演出を根拠のない数値で埋めない。
- 動画全体のMP4出力／各字幕の語句単位同期は別工程で未実装。

## v6 — official course identity + route-aware formation (2026-10-30)

### Data architecture
- Read-only SHA-pinned export from the **published KBV course master v4**: `course_master_v4.js` (134 course identities). Source SHA256: `e5a1132f85326442688c6c1e96234742149cd3c9d247c819999a955d6441f79e`.
- Export reproducibility and provenance: `export_master_v4.py --project-root <KBV project root> --output <exclusive new filename>`.
- `master_guard_v6.js` strictly resolves the exact venue/surface/course variant/distance and checks the race date against evidence validity. Missing/ambiguous/expired identities throw; no guessed aliases or default geometry.
- `config.js` keeps `courseId` for the graphical asset and adds `masterRef` for official-course identity. The JRA diagram trace `jra_trace_data.js` remains separate because the course master does **not** contain surveying coordinates or a 3D height mesh.
- The Nakayama 12-runner test is marked `sampleOnly:true` and has no actual race date; it checks route identity only. A production race requires a real YYYY-MM-DD date.

### Quality improvements
1. `jra_geometry_v6.js` now uses the diagram-derived centerline's lateral deviation and JRA-height-profile approximation for the enlarged start→first-turn view. The track no longer contains an unrelated, hand-authored bend.
2. A small course inset shows the whole drawn route, the highlighted start→first-turn segment and a dot that follows scene progress.
3. The inset fades in after the gate-area number markers clear it: no visible number-marker/UI occlusion in both test races.
4. Action and frozen review use identical horse marker target coordinates and equal collision separation. At the transition both 16- and 12-runner tests show **zero coordinate jump**.
5. No hardcoded scene length. A user-chosen WAV remains the total duration; scene proportions are derived from `copy.intro/action/review.speech` text length. Exact word-level synchronization is not implemented.

### Verified on actual browser
- Tokyo dirt 1400m (2026-10-25, 16 entries) and Nakayama turf inner A 2000m (sample-only, 12 entries).
- Master: 134 records, JRA course variants accepted, expired 2027 date rejected, wrong variant rejected, missing master ref rejected.
- 16/12 markers present with motion and stop; review-action jump 0px, marker separation >48px, inset never visibly hides a runner number, mobile-sized page loads, JavaScript errors: 0.
- The existing `03_scene3.wav` returns duration **39.04 seconds** in Chrome.
- `comparison_v6.jpg` and 32-frame `preview_v6.webp`/`preview_v6.gif` were generated from actual Chrome screenshots. The GIF is a **short illustrative preview**, not a frame-accurate audio render.

### Accuracy / limits
- Official track **identity, variant, published distances and evidence period** are managed by KBV course master.
- Geometry and elevation are **manual approximations traced from published JRA diagrams**. They are not surveyed GIS/3D terrain; elevation profile positions and displayed slopes remain approximate, and vertical exaggeration is present.
- Individual horse trajectories, accelerations and lanes are synthetic presentation of a forecast, not actual GPS tracks. The currently shown sample lane positions are provisional.
- Only two detailed JRA course geometries have been illustrated, even though the master recognizes 134 route identities. An unmodeled course must fail rather than silently render an incorrect oval.
- No automatic video MP4 render / DaVinci import / completed narrative event timing integration yet.
- This v6 is **work-branch only**. Main, Pages and KBV production are unchanged.
