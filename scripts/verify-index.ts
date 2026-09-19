#!/usr/bin/env node --experimental-strip-types
/**
 * 索引が指している画像が本当に置いてあるかを確かめる。
 *
 *   node --experimental-strip-types scripts/verify-index.ts [repo ディレクトリ]
 *
 * ## なぜ要るのか
 *
 * `fdroid update` は metadata/<applicationId>/<locale>/ に置いた画像を
 * repo/ へ複製するとき、**PNG を作り直す**。作り直した結果はバイト単位で
 * 元と違うので、内容から決まるハッシュ付きの名前も変わる。
 *
 * その結果、**画像を差し替えた直後の 1 回目の実行だけ**、
 * 索引が新しいハッシュを指しているのに、その名前のファイルが消されている、
 * という食い違いが起きる。2 回目以降は安定する。
 *
 * CI は公開のたびに `fdroid update` を 1 回しか走らせないので、
 * 放っておくと**画像を差し替えた回だけ、F-Droid の画面で絵が出ない**。
 * 落ちたことに誰も気付かないまま公開されるのが一番まずいので、
 * ここで機械的に確かめて、食い違っていれば 0 以外で終わる。
 *
 * 依存は Node だけ。追加のパッケージは使わない。
 */
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** 索引に入りうる画像の項目。どれも `{ <locale>: { name, sha256, size } }` の形。 */
const IMAGE_FIELDS = [
	"icon",
	"featureGraphic",
	"promoGraphic",
	"tvBanner",
] as const;

interface FileEntry {
	name: string;
}

type Localized = Record<string, FileEntry>;

interface PackageEntry {
	metadata?: Record<string, unknown> & {
		screenshots?: Record<string, Record<string, FileEntry[]>>;
	};
}

interface IndexV2 {
	packages: Record<string, PackageEntry>;
}

const repoDir = process.argv[2] ?? "fdroid/repo";
const indexPath = join(repoDir, "index-v2.json");

if (!existsSync(indexPath)) {
	console.error(`error: ${indexPath} がありません`);
	process.exit(2);
}

const index = JSON.parse(readFileSync(indexPath, "utf8")) as IndexV2;
const missing: string[] = [];
let checked = 0;

/** 索引の中の名前は先頭が "/" の、repo からの相対位置。 */
const check = (appId: string, label: string, entry: FileEntry): void => {
	checked += 1;
	if (!existsSync(join(repoDir, entry.name))) {
		missing.push(`${appId} ${label}: ${entry.name}`);
	}
};

for (const [appId, entry] of Object.entries(index.packages)) {
	const metadata = entry.metadata ?? {};

	for (const field of IMAGE_FIELDS) {
		const localized = metadata[field] as Localized | undefined;
		for (const [locale, file] of Object.entries(localized ?? {})) {
			check(appId, `${field} (${locale})`, file);
		}
	}

	// スクリーンショットは種類ごとの配列になっている
	for (const [kind, byLocale] of Object.entries(metadata.screenshots ?? {})) {
		for (const [locale, files] of Object.entries(byLocale)) {
			for (const file of files) {
				check(appId, `screenshot ${kind} (${locale})`, file);
			}
		}
	}
}

const apps = Object.keys(index.packages).length;

if (missing.length > 0) {
	console.error(`索引と実体が食い違っています (${apps} アプリ, ${checked} 件を確認)`);
	for (const line of missing) console.error(`  無い: ${line}`);
	process.exit(1);
}

console.log(`索引と実体は揃っています (${apps} アプリ, ${checked} 件を確認)`);
