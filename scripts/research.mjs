// 调研用：对每条儿歌/动画资源在 B站搜索，列出候选视频，写到 scripts/out/research.json 和 research.txt。
// 已查过的资源会跳过（删掉 research.json 里对应条目可重查）。
// 用法：node scripts/research.mjs [资源英文名片段...]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadResources, searchVideos, sleep, OFFICIAL } from './bili.mjs';


const { ITEMS } = loadResources();
const only = process.argv.slice(2).map(s => s.toLowerCase());
const targets = ITEMS.filter(i => (i.t === 'video' || i.t === 'song') && (!only.length || only.some(o => i.n.toLowerCase().includes(o))));
const outFile = path.join(ROOT, 'scripts/out/research.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

for (const it of targets) {
  if (out[it.n] && !only.length) continue;
  const kws = [it.q, it.n + ' 英文 合集'];
  const seen = new Set(); const list = [];
  try {
    for (const kw of kws) {
      for (const v of (await searchVideos(kw)).slice(0, 10)) {
        if (seen.has(v.bvid)) continue;
        seen.add(v.bvid);
        v.official = OFFICIAL[v.mid] || '';
        list.push(v);
      }
      await sleep(3500);
    }
    out[it.n] = { keyword: kws, list };
    console.log(`done ${it.n} (${list.length})`);
  } catch (e) {
    console.log(`FAIL ${it.n}: ${e.message}`);
    await sleep(20000);
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
}

// 汇总成便于阅读的文本
const lines = [];
for (const [name, r] of Object.entries(out)) {
  lines.push(`\n## ${name}`);
  r.list.sort((a, b) => b.play - a.play).forEach(v =>
    lines.push(`  ${v.bvid} | ${String(v.play).padStart(8)} | ${v.duration.padStart(7)} | ${v.pubdate} | ${v.official ? '【官方】' : ''}${v.author} | ${v.title.slice(0, 70)}`));
}
fs.writeFileSync(path.join(ROOT, 'scripts/out/research.txt'), lines.join('\n'));
