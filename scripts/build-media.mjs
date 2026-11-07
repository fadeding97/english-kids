// 根据 data/sources.json（每条资源选定的 B站视频）抓取标题、封面、时长、分P和合集选集，
// 生成 data/media.js 供网页使用。用法：node scripts/build-media.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, view, sleep } from './bili.mjs';

const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources.json'), 'utf8'));
const outFile = path.join(ROOT, 'data/media.js');
const prev = (() => {
  try { return JSON.parse(fs.readFileSync(outFile, 'utf8').replace(/^[^{]*/, '').replace(/;\s*$/, '')); } catch { return {}; }
})();
const https = u => String(u || '').replace(/^http:/, 'https:');
const MAX_EPISODES = 200;

const media = {};
for (const [name, src] of Object.entries(sources)) {
  if (name.startsWith('_')) continue;
  try {
    const d = await view(src.bvid);
    const m = {
      platform: 'bilibili',
      bvid: d.bvid,
      official: !!src.official,
      title: d.title,
      cover: https(d.pic),
      owner: d.owner?.name || '',
      duration: d.duration,
      note: src.note || '',
      episodes: [],
    };
    const season = d.ugc_season;
    if (src.bvids?.length) {
      // 手工指定的多个视频（同一部动画分散上传、不在合集里时用）：每个视频的每个分P都算一集
      for (const b of [src.bvid, ...src.bvids.filter(x => x !== src.bvid)]) {
        const v = b === d.bvid ? d : await view(b);
        const multi = v.pages.length > 1;
        // 分P有自己的名字就只用分P名；分P名只是 “P1/1” 这类编号时，前面加上视频标题
        v.pages.forEach(p => m.episodes.push({ bvid: v.bvid, page: p.page,
          title: !multi ? v.title : /^\s*P?\d+\s*$/i.test(p.part) ? `${v.title} · ${p.part}` : p.part, duration: p.duration }));
        await sleep(600);
      }
    } else if (src.useSeason !== false && season?.sections?.length) {
      // 合集：取各小节里的全部视频，每个视频的每个分P都算一集
      for (const sec of season.sections) for (const ep of sec.episodes || []) {
        const pages = ep.pages?.length ? ep.pages : [{ page: 1, part: ep.title, duration: ep.arc?.duration }];
        pages.forEach(p => m.episodes.push({ bvid: ep.bvid, page: p.page || 1, title: pages.length > 1 ? p.part : ep.title, duration: p.duration || ep.arc?.duration || 0 }));
      }
      m.seasonTitle = season.title;
    } else if (d.pages?.length > 1) {
      d.pages.forEach(p => m.episodes.push({ bvid: d.bvid, page: p.page, title: p.part, duration: p.duration }));
    } else {
      m.episodes.push({ bvid: d.bvid, page: 1, title: d.title, duration: d.duration });
    }
    // 清理：去掉标题里的推广文字（加微信领全集、公众号、水印后缀）；整集都是引流广告的直接剔除
    const AD = /VX|WX|V❤|微信|领全集|获全集|一键三连|网盘|权套|佳威|花王盘/i;
    m.episodes = m.episodes
      .map(e => ({ ...e, title: e.title
        .replace(/【[^】]*(VX|WX|V❤|微信|全集|网盘)[^】]*】/gi, '')
        .replace(/[-_ ]*公众号\S*/g, '').replace(/_logo$/i, '').replace(/^❤\S+\s*/, '')
        .replace(/_bilibili$/i, '').trim() }))
      .filter(e => e.title && !AD.test(e.title));
    // 去重：同名的视频（重复上传、残片）只保留时长最长的那个，位置取第一次出现的位置
    const byTitle = new Map();
    m.episodes.forEach((e, i) => {
      const k = e.title.trim().toLowerCase();
      const old = byTitle.get(k);
      if (!old) byTitle.set(k, { e, i });
      else if ((e.duration || 0) > (old.e.duration || 0)) old.e = e;
    });
    m.episodes = [...byTitle.values()].sort((a, b) => a.i - b.i).map(x => x.e);
    if (m.episodes.length > MAX_EPISODES) m.episodes = m.episodes.slice(0, MAX_EPISODES);
    // 从指定的那一集开始（合集里选定的视频）
    m.start = Math.max(0, m.episodes.findIndex(e => e.bvid === d.bvid && e.page === (src.page || 1)));
    media[name] = m;
    console.log(`ok   ${name}  ${m.episodes.length} 集  ${m.owner}${m.official ? '（官方）' : ''}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}${prev[name] ? '（保留上次的数据）' : ''}`);
    if (prev[name]) media[name] = prev[name];
  }
  await sleep(1200);
}

fs.writeFileSync(outFile, `/* 由 scripts/build-media.mjs 生成，不要手改 */\nwindow.MEDIA = ${JSON.stringify(media, null, 1)};\n`);
console.log(`\n写入 ${Object.keys(media).length} 条 → data/media.js`);
