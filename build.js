#!/usr/bin/env node
/**
 * build.js — 分割ソースを 1 枚の HTML にまとめて dist/okaikei.html を作る
 *
 *   node build.js
 *
 * 外部依存なし（Node 標準モジュールのみ）。
 * 生成物はどこに置いてもダブルクリックで動く単一ファイルです。
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'okaikei.html');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

let html = read('index.html');

// <link rel="stylesheet" href="css/style.css"> → <style>…</style>
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  return '<style>\n' + read(href).trimEnd() + '\n</style>';
});

// <script src="js/*.js"></script> ×N → まとめて 1 つの <script>
const scripts = [];
html = html.replace(/^[ \t]*<script src="([^"]+)"><\/script>\n?/gm, (_, src) => {
  scripts.push(read(src).trimEnd());
  return '';
});
// 置換文字列ではなく関数を使う（ソース中の `$'` などが特殊置換として展開されるのを防ぐ）
html = html.replace(/<\/body>/, () => '<script>\n' + scripts.join('\n\n') + '\n</script>\n</body>');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log('built: dist/okaikei.html (' + kb + ' KB, scripts: ' + scripts.length + ')');
