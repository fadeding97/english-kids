// 调研用：对候选不理想的资源换关键词再搜（含官方账号定向搜索），结果合并进 research.json 的 extra 字段。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, searchVideos, sleep, OFFICIAL } from './bili.mjs';

const KW = JSON.parse(process.argv[2]);
const file = path.join(ROOT, 'scripts/out/research2.txt');
let txt = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
for (const [name, kws] of Object.entries(KW)) {
  const seen = new Map();
  for (const kw of kws) {
    try { for (const v of await searchVideos(kw)) if (!seen.has(v.bvid)) seen.set(v.bvid, v); }
    catch (e) { console.log('FAIL', name, kw, e.message); await sleep(15000); }
    await sleep(3500);
  }
  const list = [...seen.values()].sort((a, b) => (OFFICIAL[b.mid] ? 1e12 : 0) + b.play - (OFFICIAL[a.mid] ? 1e12 : 0) - a.play).slice(0, 10);
  txt += `\n## ${name}  ${kws.join(' / ')}\n` + list.map(v => `  ${v.bvid} | ${String(v.play).padStart(8)} | ${v.duration.padStart(7)} | ${OFFICIAL[v.mid] ? '【官方】' : ''}${v.author} | ${v.title.slice(0, 70)}`).join('\n');
  fs.writeFileSync(file, txt);
  console.log('done', name);
}
