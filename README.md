# サンダルの川崎

「サンダルで世界を歩き、まだ見ぬ景色を探す人の冒険記録」をテーマにした、静的なポートフォリオです。深い紺の海、あたたかな白の誌面、大きな明朝体、旅の軌跡を使い、写真と寄り道の物語を紹介します。

- [トップページ](https://moai-okinawa.github.io/portfolio-kawasakiZ/)
- [写真日記「足跡」](https://moai-okinawa.github.io/portfolio-kawasakiZ/ashiato/)

ユーザーが示した活動は「写真を撮る」「全国各地を周る」です。「町を歩く」「紙にまとめる」「音を集める」は、制作例につながる**活動の構想**として掲載しています。「寄り道手帖」「サンダル散歩マップ」「路地裏ラジオ」の3作品・制作年・仕様はサンプルです。

写真「本島から見える伊江島」はユーザー提供の写真です。残る4枚はAI生成のサンプルとして区別し、拡大表示でも注記を引き継ぎます。伊江島のWebPは元データを変更せず、ページ内でCSSにより90度回転して正しい向きに表示します。

## 主な機能

- トップと写真日記をつなぐ、パソコン・スマートフォン向けの誌面構成
- 約1.4秒の導入・繰り返しスクロールフェード・写真マスク
- パソコン限定の小さなパララックス、スクロール進行線、順に現れるサンダルの足跡
- 作品詳細、写真の拡大・前後切り替え・枚数表示
- モバイルメニュー、キーボード操作、フォーカス復帰、「動きを減らす」設定への対応
- JavaScriptが使えない場合のネイティブ詳細表示・画像リンク・常時表示のナビゲーション

## ローカルで見る

フレームワークやパッケージのインストールは不要です。リポジトリのルートで実行します。

```sh
python3 scripts/build-photo-gallery.py
python3 -m http.server 8000 --directory dist --bind 127.0.0.1
```

[ローカルのトップ](http://127.0.0.1:8000/)と[足跡](http://127.0.0.1:8000/ashiato/)を開きます。停止は `Ctrl+C`。生成済みの `dist/index.html` を直接開くこともできます。

## 編集する場所

| ファイル | 内容 |
| --- | --- |
| `dist/index.html` | トップの文章、活動、作品、写真への導線 |
| `dist/style.css` | 共通配色・文字・余白・トップのレイアウト |
| `dist/site.js` | メニュー、現在地表示、作品詳細とフォーカス管理 |
| `dist/ashiato/index.html` | 写真日記の導入・サンプル写真・ビューアー |
| `dist/ashiato/album.css` | 写真日記と拡大表示のレイアウト |
| `dist/ashiato/album.js` | 写真の拡大・切り替え・向き・注記・フォーカス管理 |
| `dist/motion.js` / `dist/motion.css` | 繰り返しフェード、写真マスク、パララックス、足跡、進行線 |
| `dist/ashiato/photos/` | ユーザー提供写真と既存サンプル写真 |
| `scripts/build-photo-gallery.py` | アップロード写真からギャラリー部分を生成 |
| [DESIGN.md](DESIGN.md) | 完成デザインの実装値、方針、アクセシビリティ |
| [AGENTS.md](AGENTS.md) | リポジトリ編集時のルール |

英数字はGoogle FontsのManropeとCormorant Garamondを使用し、日本語は端末の明朝・サンセリフ体で表示します。外部フォントを取得できなくても本文と操作は利用できます。

## Codexで作品を1件追加する

リポジトリ用スキル [add-portfolio-work](.agents/skills/add-portfolio-work/SKILL.md) を使います。`$add-portfolio-work` または「ポートフォリオに作品を1つ追加して」と依頼すると、作品名・説明・URLを確認してから、既存作品と同じ形で追加し、コミット・プッシュ・公開確認まで進めます。

現行作品は `.work-media` と `.work-copy` の組み合わせです。本文にはネイティブの `details.work-details` と `.work-detail-content` を置き、JavaScriptでモーダルへ拡張します。追加時はサンプル作品と実作品の区別を保ってください。

## 写真日記「足跡」に写真を追加する

[写真アップロード画面](https://github.com/moai-okinawa/portfolio-kawasakiZ/upload/main/dist/ashiato/photos)で写真ファイルを選び、`main` にコミットします。JPG・JPEG・PNG・WebP・AVIF・GIFに対応し、拡張子を除いたファイル名が見出しになります。撮影日を推測して並べず、追加写真をファイル名順でサンプル写真より前に並べます。

ローカルでは `dist/ashiato/photos/` に画像を入れ、`python3 scripts/build-photo-gallery.py` を実行してください。生成対象は `dist/ashiato/index.html` の `added-photos:start` と `added-photos:end` の間です。この部分だけを手で直すと次回生成で上書きされるため、個別の説明や向きの扱いは生成スクリプトに反映します。

「本島から見える伊江島」の表示は専用の `.island-frame` / `.island-rotated` を使います。元のWebP・HEICを無断で置き換えたり、他の写真にも回転を一律に適用したりしないでください。HEICは保存素材であり、ギャラリーの生成対象ではありません。

## 検証

```sh
python3 scripts/build-photo-gallery.py
python3 scripts/check-site.py
node --check dist/site.js
node --check dist/motion.js
node --check dist/ashiato/album.js
node scripts/test-motion.cjs
node scripts/test-interactions.cjs
git diff --check
```

2026-11-18のコード検証では、2ページの構造・見出し・画像・相対リンク・ARIA参照・必須内容・サンプル表記の静的チェックが成功しました。DOMの代替オブジェクトを使う回帰テスト34件（スクロール等19件、メニュー・作品詳細・写真ビューアー等15件）も成功しています。これらは実際の表示やスクリーンリーダーの確認を代替しません。

同日のブラウザ確認では、Chromeのゲスト環境でローカルHTTPのトップページを読み込み、アクセシビリティツリー上で全文と、JavaScriptが設定する操作名の存在を確認しました。アプリ内ブラウザはCDPのタイムアウトで利用できず、スクリーンショットもmacOSのScreenCaptureKitエラー（-3811 / タイムアウト / -3812）で取得できませんでした。したがって、パソコン・スマートフォン幅の見た目、実際の操作、端末の「動きを減らす」設定、スクリーンリーダーの確認は未完了です。アクセシビリティツリーの取得を、画像による見た目や実操作の確認済みとは扱いません。

## 更新と公開

対象リポジトリは [moai-okinawa/portfolio-kawasakiZ](https://github.com/moai-okinawa/portfolio-kawasakiZ) です。他のポートフォリオや親フォルダーをコミットに含めません。

`main` にpushすると、[GitHub Actions](.github/workflows/pages.yml) がギャラリーを生成し、静的検証・JavaScript構文・34件の動作検証に成功してから `dist/` をGitHub Pagesへ公開します。`workflow_dispatch` での手動起動も可能です。公開先と `/ashiato/` のルートは維持しています。

完了確認ではpushの成功だけでなく、対象コミットのActions成功と、公開URLのHTML・CSS・JavaScript・画像への反映を確認してください。
