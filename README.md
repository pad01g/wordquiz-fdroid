# wordquiz-fdroid

WordQuiz を配布する **自前 F-Droid リポジトリ** (GitHub Pages)。

## スマホへの登録手順

1. F-Droid クライアントを入れる
2. 設定 → リポジトリ → ＋
3. 次の URL を追加する

```
https://pad01g.github.io/wordquiz-fdroid/fdroid/repo
```

フィンガープリント (SHA-256) は後日ここに記載する。
URL に `?fingerprint=<SHA256>` を付けて登録すると検証込みで追加される。

## 中身

`fdroid/repo/` 以下は `fdroidserver` の `fdroid update` が生成する。
index は専用の署名鍵で署名済み。**手で編集しない。**
