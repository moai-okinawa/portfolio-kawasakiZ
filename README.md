# サンダルの川崎

町歩き、冊子づくり、録音をテーマにした自己紹介サイトです。「寄り道手帖」「サンダル散歩マップ」「路地裏ラジオ」の3作品を紹介しています。プロフィールと作品はサンプルです。

[公開サイトを見る](https://moai-okinawa.github.io/portfolio-kawasakiZ/)

色・文字・余白・部品・雰囲気・避ける表現とアクセシビリティの方針は [デザインガイド](DESIGN.md) にまとめています。

## Codexで作品を1件追加する

リポジトリ用スキル [add-portfolio-work](.agents/skills/add-portfolio-work/SKILL.md) を使います。`$add-portfolio-work` または「ポートフォリオに作品を1つ追加して」と依頼すると、作品名・説明・URLを確認してから、既存カードと同じ形で追加し、コミット・プッシュ・公開確認まで進めます。

## 写真日記「足跡」に写真を追加する

[GitHubの写真アップロード画面](https://github.com/moai-okinawa/portfolio-kawasakiZ/upload/main/dist/ashiato/photos) で写真ファイルを選び、`main` にコミットします。公開が完了すると、[写真日記「足跡」](https://moai-okinawa.github.io/portfolio-kawasakiZ/ashiato/) のサンプル写真の前に、追加した写真がファイル名順で並びます。

JPG、JPEG、PNG、WebP、AVIF、GIFに対応しています。拡張子を除いたファイル名が写真の見出しになります。たとえば `夕暮れの商店街.jpg` は「夕暮れの商店街」と表示されます。

## ローカルで見る

[dist/index.html](dist/index.html) をブラウザで開くと閲覧できます。インストールやビルドは不要です。

追加した写真も手元で確認するには、[dist/ashiato/photos/](dist/ashiato/photos/) に画像を入れ、リポジトリのルートで `python3 scripts/build-photo-gallery.py` を実行してから [写真ページ](dist/ashiato/index.html) を開きます。

## 更新と公開

自己紹介や作品の文章は [dist/index.html](dist/index.html)、画像は [dist/assets/](dist/assets/) にあります。`main` に変更をpushすると、[GitHub Actions](.github/workflows/pages.yml) が `dist/` の内容をGitHub Pagesに公開します。
