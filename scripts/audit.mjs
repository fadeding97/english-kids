// 体检：逐条检查已选视频的简介、分集标题和时长，按规则标出可疑的地方，写到 scripts/out/audit.txt。
// 用法：node scripts/audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, view, sleep, loadResources } from './bili.mjs';

const media = vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data/media.js'), 'utf8') + ';window.MEDIA', { window: {} });
const { ITEMS } = loadResources();
const byName = Object.fromEntries(ITEMS.map(i => [i.n, i]));

const RULES = [
  [/中文版|中配|国语|普通话|粤语|台配/, '可能是中文配音'],
  [/先中文|一句中文|中英双语对话|真双语|双语对话/, '可能是中英重配的“双语版”'],
  [/趣配音|配音素材|配音秀|我配的/, '可能是用户自己配音'],
  [/music video|\bMV\b|tunes|主题曲|片头曲|歌曲合集/i, '可能是音乐 MV 而不是正片'],
  [/西班牙|español|日语|韩语|法语/i, '可能不是英文'],
  [/绘本|带读|讲解|精讲|教学|跟读|reaction/i, '可能是讲解/带读而不是原片'],
];
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

const lines = [];
for (const [name, m] of Object.entries(media)) {
  const it = byName[name];
  let desc = '';
  try { desc = (await view(m.bvid)).desc || ''; } catch (e) { desc = '（读取失败）'; }
  const titles = m.episodes.map(e => e.title);
  const hay = [m.title, desc, ...titles.slice(0, 30)].join(' ');
  const flags = RULES.filter(([re]) => re.test(it?.t === 'song' && /MV|tunes|歌曲合集/i.test(String(re)) ? '' : hay)).map(([, msg]) => msg);
  const med = median(m.episodes.map(e => e.duration || 0));
  if (m.episodes.length > 1 && med < 90 && it?.t === 'video') flags.push(`分集普遍很短（中位 ${Math.round(med)} 秒）`);
  if (m.episodes.length === 1 && it?.t === 'video' && m.duration < 600) flags.push(`只有 1 个视频且不到 10 分钟`);
  const total = m.episodes.reduce((s, e) => s + (e.duration || 0), 0);
  lines.push(`\n## ${flags.length ? '⚠️ ' : ''}${name}（${it?.cn}）  ${m.bvid}  ${m.owner}${m.official ? '【官方】' : ''}`,
    `  标题：${m.title}`,
    `  ${m.episodes.length} 集，共 ${Math.round(total / 60)} 分钟；分集：${titles.slice(0, 4).map(t => t.slice(0, 32)).join(' / ')}${titles.length > 4 ? ' … ' + titles.at(-1).slice(0, 32) : ''}`,
    `  简介：${desc.replace(/\s+/g, ' ').slice(0, 120) || '（无）'}`,
    ...(flags.length ? [`  可疑：${flags.join('；')}`] : []));
  console.log(flags.length ? 'FLAG' : 'ok  ', name);
  await sleep(900);
}
fs.writeFileSync(path.join(ROOT, 'scripts/out/audit.txt'), lines.join('\n'));
