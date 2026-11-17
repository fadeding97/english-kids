// 为儿歌条目找“长连播版”：一个视频里连着放很多首（≥20 分钟、不分P）。
// iPhone 不允许网页自动播放下一个视频，长连播版点一次就能一直听。用法：node scripts/find-long.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadResources, searchVideos, view, sleep } from './bili.mjs';

const { ITEMS } = loadResources();
const secs = d => String(d).split(':').reduce((a, x) => a * 60 + Number(x), 0);
const songs = ITEMS.filter(i => i.t === 'song' || /Fingerplays|Action Songs/.test(i.n));
const out = {};
for (const it of songs) {
  const brand = it.n.replace(/[’']/g, '').split(/[ (（]/).filter(Boolean).slice(0, 2).join(' ');   // 例：Super Simple、Mother Goose
  const key = brand.split(' ')[0].toLowerCase();
  const qs = [`${it.n} 合集`, `${it.n} 连续播放`, `${it.n} 1 hour`, `${brand} 英文儿歌 连播`];
  const seen = new Map();
  for (const q of qs) {
    for (const pg of [1, 2]) {
      try { (await searchVideos(q, pg)).forEach(v => { if (!seen.has(v.bvid)) seen.set(v.bvid, v); }); } catch (e) { console.log('search fail', q, e.message); }
      await sleep(1300);
    }
  }
  const GOOD = /儿歌|童谣|nursery|rhyme|songs?|kids|baby|宝宝|摇篮|lullab|手指|finger/i;
  const BAD = /白噪|雨声|助眠|计时|健身|脑波|专注|纯音乐|ASMR|新婚|游戏|直播|解说|翻唱合集.*成人/i;
  const cands = [...seen.values()]
    .filter(v => secs(v.duration) >= 20 * 60 && secs(v.duration) <= 4 * 3600)
    .filter(v => v.title.toLowerCase().includes(key) || v.title.includes(it.cn.slice(0, 2)))
    .filter(v => GOOD.test(v.title) && !BAD.test(v.title))
    .sort((a, b) => b.play - a.play).slice(0, 8);
  const ok = [];
  for (const c of cands) {
    try {
      const d = await view(c.bvid);
      if (d.pages.length === 1) ok.push({ bvid: c.bvid, min: Math.round(d.duration / 60), play: c.play, title: c.title.slice(0, 50), author: c.author });
    } catch {}
    await sleep(800);
    if (ok.length >= 3) break;
  }
  out[it.n] = ok;
  console.log(`\n## ${it.n}（${it.cn}）`);
  ok.forEach(o => console.log(`  ${o.bvid}  ${o.min} 分钟  播放 ${o.play}  ${o.author} | ${o.title}`));
}
fs.mkdirSync(path.join(ROOT, 'scripts/out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scripts/out/long.json'), JSON.stringify(out, null, 1));
