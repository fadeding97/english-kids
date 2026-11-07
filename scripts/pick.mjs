// 调研用：从 research.json 的候选里按规则打分，取前 3 个再查一次详情（分P数、合集），
// 输出 scripts/out/picks.txt 供人工审核。规则：官方优先 > 标题含资源名 > 英文原版 > 合集/全集 > 播放量。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadResources, view, sleep } from './bili.mjs';

const { ITEMS } = loadResources();
const research = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/out/research.json'), 'utf8'));
const byName = Object.fromEntries(ITEMS.map(i => [i.n, i]));
const only = process.argv.slice(2).map(s => s.toLowerCase());

const norm = s => s.toLowerCase().replace(/[’'`&!.,:()（）\-+]/g, ' ').replace(/\s+/g, ' ').trim();
const durMin = d => { const p = String(d).split(':').map(Number); return p.length === 2 ? p[0] + p[1] / 60 : 0; };

function score(it, v) {
  const t = norm(v.title), name = norm(it.n);
  const cn = it.cn.replace(/（.*?）|\(.*?\)/g, '').trim();
  const words = name.split(' ').filter(w => w.length > 2 && !['the', 'and', 'you'].includes(w));
  const hit = t.includes(name) || v.title.includes(cn) || (words.length && words.every(w => t.includes(w)));
  if (!hit) return -1e9;
  let s = Math.log10(v.play + 10);
  if (v.official) s += 10;
  if (/英文|英语|原版|english/i.test(v.title)) s += 1.2;
  if (/中文版|国语|普通话|西班牙|西语|español|日语|粤语/i.test(v.title) && !/英文版|中英|双语|英文/i.test(v.title)) s -= 4;
  if (/全集|合集|全\d+集|\d+集|season|第.季/i.test(v.title)) s += 1;
  if (/绘本|read aloud|带读|讲解|精讲|跟读|教学|翻唱|cover|reaction/i.test(v.title) && it.t !== 'book') s -= 1.5;
  const m = durMin(v.duration);
  if (m < 1.5) s -= 2; else if (m > 10) s += 0.6;
  return s;
}

const lines = [];
const out = {};
for (const [name, r] of Object.entries(research)) {
  const it = byName[name];
  if (!it || (only.length && !only.some(o => name.toLowerCase().includes(o)))) continue;
  const ranked = r.list.map(v => ({ ...v, s: score(it, v) })).filter(v => v.s > -1e8).sort((a, b) => b.s - a.s).slice(0, 3);
  lines.push(`\n## ${name}（${it.cn}）`);
  if (!ranked.length) { lines.push('  （没有标题匹配的候选）'); continue; }
  out[name] = [];
  for (const v of ranked) {
    try {
      const d = await view(v.bvid);
      const eps = d.ugc_season ? d.ugc_season.sections.reduce((n, s) => n + (s.episodes?.length || 0), 0) : 0;
      const info = { bvid: v.bvid, official: !!v.official, title: d.title, owner: d.owner.name, play: d.stat.view, pages: d.pages.length, season: d.ugc_season?.title || '', seasonEps: eps, duration: Math.round(d.duration / 60) };
      out[name].push(info);
      lines.push(`  ${v.s.toFixed(1).padStart(5)}  ${info.bvid}  ${info.official ? '【官方】' : ''}${info.owner} | ${info.title.slice(0, 60)} | ${info.play}播放 | ${info.pages}P ${info.duration}分钟${info.season ? ` | 合集「${info.season}」${eps}个` : ''}`);
    } catch (e) {
      lines.push(`  ${v.bvid} 详情失败：${e.message}`);
    }
    await sleep(900);
  }
  console.log('picked', name);
}
fs.writeFileSync(path.join(ROOT, 'scripts/out/picks.txt'), lines.join('\n'));
fs.writeFileSync(path.join(ROOT, 'scripts/out/picks.json'), JSON.stringify(out, null, 1));
