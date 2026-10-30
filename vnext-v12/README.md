# Scene03 v12 | コース映像品質・2.5D風 / 3D材質比較

- 実施日：2026-10-30
- 作業ブランチ：`work/scene03-material-comparison-v12`
- 基準コミット：既存のv10 `c17ad3a`（`work/scene03-cinematic-polish`）
- **本番未採用。v10とv11カメラ比較は変更せず、既存Pagesはmainのまま。統合・デプロイ・予想ロジック変更なし。**

## 目的

「カメラを派手に動かす」ではなく、映像基盤（走路の造形、質感、地形、ラチ）そのものを改善する。
同じ東京ダート1400mのJRA手動トレース（`../vnext-v10/jra_trace_data.js`）と同じ16頭のKBV試験用隊列入力（`../vnext-v10/config.js`）を使用する。

両案は **同じThree.js WebGL描画エンジン、同じ3D空間・角度・馬の平面位置** を共有する。
Aは「フラットな立体表現＝2.5D風の画作り」、Bは「立体路盤・PBR風材質・陰影・柵の支柱を描く3D風の画作り」。
したがって「完全に別の2Dエンジン」と「実測精密3D」を比較したものではない。
**この試作は、完成画の美しさと読みやすさを比較するための、技法別ビジュアル実験。**

## 出力物

- `overview_material_ab_v12.jpg` : コース全景、上がA / 下がB
- `formation_material_ab_v12.jpg` : 16頭の隊列、上がA / 下がB
- `flat_overview_tokyo.png` / `real_overview_tokyo.png` : 全景の単独高画質
- `flat_formation_tokyo.png` / `real_formation_tokyo.png` : 隊列の単独高画質
- `index.html` : ボタンでA/Bと全景・隊列を切り替えられるブラウザプレビュー
- `compare.js`, `style.css`, `three.module.js` : 実装
- `THREE_LICENSE.txt` : Three.js (MIT) のライセンス
- `qa_browser_v12.cjs` : Puppeteer画面検証の再現用スクリプト

## 事実と演出の区別

- コースの形とスタート・最初のコーナーはJRA資料を**手動トレースした非測量**データに基づく。
- 高低差はJRA図の概算を意図的に視認可能な高さに投影。正確な標高メッシュではない。
- 走路の描画幅、ラチの太さ、材質、地表テクスチャは模式表現の演出で、実施設の測量寸法と一致するとは主張しない。
- 16頭の `formation.progress` / `formation.lane` / 馬番 / 枠色入力は両案で同一。CGの表示位置から予想を逆算しない。
- Bのリアルな「質感」と、コースの「測量上の正確さ」は別概念。

## 検証

Windows Chrome / Puppeteerで、東京D1400の全景A/B・隊列A/Bの計4モードを実際にレンダリングしてスクリーンショットで確認。
同一コース識別 `tokyo-d1400` と16頭、開始・最初のコーナーのトレースを各モードで共有。
ブラウザ JavaScript 例外0件、ページとCSS/JS読み込み成功。
スマートフォン・実機iOSと動画書き出しは未検証。本番のナレーション同期・DaVinci接続・中山コース展開は未実装。

## ローカル確認

リポジトリのルートで `python -m http.server 8765` として `http://127.0.0.1:8765/vnext-v12/` を開く。
ブラウザ側で「A / 2.5D風」「B / 3D質感」、「コース全景」「隊列形成」を切り替える。
※Javascript ES modules は file:// 直開きでは動かない環境があるためHTTP配信を使用。
