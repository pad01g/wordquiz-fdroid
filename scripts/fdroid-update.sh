#!/usr/bin/env bash
#
# 手元で `fdroid update` を流し、index を作り直す。
#
#   scripts/fdroid-update.sh
#
# ## なぜ Docker なのか
#
# ホストには何も入れない方針なので、fdroidserver ごと閉じ込める。
# apt 版 fdroidserver は同梱の androguard が古く、新しい aapt2 が作る
# resources.arsc を解析できずに "res1 must be zero!" で落ちるため、
# **pip で入れたものを使う**。
#
# ## Android SDK は要らない
#
# fdroidserver は APK の解析に androguard (純 Python) を使うので SDK 一式は
# 不要。ただし index-v2 の署名にだけ `apksigner` が要る (index-v1 の方は
# JDK の jarsigner で足りる)。Debian の apksigner で済ませている。
#
# ## 鍵の扱い
#
# config.yml が `keystore: fdroid.keystore` を指しているので、その名前で
# 一時的に置く。**この鍵は絶対にコミットしない**ので、成功しても失敗しても
# 必ず消す (trap)。失うとリポジトリを作り直すことになり、利用者に登録し直して
# もらう羽目になる。
#
# 依存: bash, docker のみ。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="android-example-fdroid:2"

# secrets/ は android-example/ の直下にある。このリポジトリは
# <集約リポジトリ>/references/ にも <集約リポジトリ>/repos/ にも置かれるので、
# 相対で数えず、見つかるまで親を辿る
SECRETS=""
dir="${ROOT}"
while [[ "${dir}" != "/" ]]; do
  if [[ -f "${dir}/secrets/fdroid.keystore" ]]; then
    SECRETS="${dir}/secrets"
    break
  fi
  dir="$(dirname "${dir}")"
done

if [[ -z "${SECRETS}" ]]; then
  echo "error: secrets/fdroid.keystore が見つかりません (${ROOT} から上を探しました)" >&2
  exit 1
fi

if ! docker image inspect "${IMAGE}" >/dev/null 2>&1; then
  echo "==> ${IMAGE} を建てます (初回のみ)" >&2
  docker build -q -t "${IMAGE}" - >/dev/null <<'DOCKERFILE'
FROM python:3.12-slim
RUN apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends \
      default-jdk-headless apksigner libmagic1 git \
 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir fdroidserver
DOCKERFILE
fi

cleanup() { rm -f "${ROOT}/fdroid/fdroid.keystore"; }
trap cleanup EXIT

cp "${SECRETS}/fdroid.keystore" "${ROOT}/fdroid/fdroid.keystore"
chmod 600 "${ROOT}/fdroid/fdroid.keystore" "${ROOT}/fdroid/config.yml"

# パスワードは config.yml の {env: ...} 経由で読まれる。
# passwords.env は `source` できない (値に & が入っていてシェルが落ちる) ので、
# docker の --env-file に渡す。
#
# -c は config.yml を作り直してしまう。既存の設定を活かすので付けない。
docker run --rm -i \
  --env-file "${SECRETS}/passwords.env" \
  -v "${ROOT}/fdroid:/repo" \
  -w /repo \
  "${IMAGE}" \
  bash -lc 'fdroid update --pretty'
