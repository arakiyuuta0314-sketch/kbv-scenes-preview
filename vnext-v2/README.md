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
   - 1コーナーまで404.9m、直線310m、全高低差5.3m、直線の急坂高低差2.2m。右回りと芝表示を確認。

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
