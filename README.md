# wordquiz-fdroid

WordQuiz を配布する **自前 F-Droid リポジトリ** (GitHub Pages)。

## スマホへの登録手順

1. F-Droid クライアントを入れる
2. 設定 → リポジトリ → ＋
3. 次の URL を追加する (フィンガープリント付きで登録すると検証込みになる)

```
https://pad01g.github.io/wordquiz-fdroid/fdroid/repo?fingerprint=13FC1A9EBC882C3ECC9AB39E8F6FA06A94E6547380E4DD8D1930C848E67F37AE
```

フィンガープリント (index 署名証明書の SHA-256):

```
13FC1A9EBC882C3ECC9AB39E8F6FA06A94E6547380E4DD8D1930C848E67F37AE
```

登録後、リポジトリを更新すると WordQuiz が一覧に現れる。

## 中身

`fdroid/repo/` 以下は `fdroidserver` の `fdroid update` が生成する。**手で編集しない。**
APK の追加と index の再生成は `wordquiz-frontend` 側の
`fdroid-publish` ワークフロー (タグ `v*.*.*` の push で起動) が行う。

署名鍵はこのリポジトリには含まれない。CI が実行時に配置し、終了時に消す。

## 更新の仕組み

F-Droid は `versionCode` を見て更新の有無を判断する。
新しい版を出すときは `wordquiz-frontend` の `android/version.properties` で
`versionCode` を増やしてからタグを打つこと。
