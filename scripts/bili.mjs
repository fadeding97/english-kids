// B站公开接口的小工具：搜索视频、查 UP 主认证、取视频/合集信息。
// 只在本地运行（node 18+），用于整理资源清单，不在网页里调用。
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
let cookie = '';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ensureCookie() {
  if (cookie) return;
  const r = await fetch('https://api.bilibili.com/x/frontend/finger/spi', { headers: { 'User-Agent': UA } });
  const j = await r.json();
  cookie = `buvid3=${j.data.b_3}; buvid4=${encodeURIComponent(j.data.b_4)}`;
}

export async function api(url, referer = 'https://www.bilibili.com/') {
  await ensureCookie();
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: referer, Cookie: cookie } });
    if (r.status === 412) { await sleep(4000 * (i + 1)); continue; }
    const j = await r.json();
    if (j.code === 0) return j.data;
    if (j.code === -412) { await sleep(4000 * (i + 1)); continue; }
    throw new Error(`${j.code} ${j.message} ${url}`);
  }
  throw new Error('rate limited: ' + url);
}

export function loadResources() {
  const code = fs.readFileSync(path.join(ROOT, 'data/resources.js'), 'utf8') + '\n;({ STAGES, TYPES, TAGS, ITEMS })';
  return vm.runInNewContext(code, {});
}

const strip = s => String(s || '').replace(/<[^>]+>/g, '');

export async function searchVideos(keyword, page = 1) {
  const d = await api(`https://api.bilibili.com/x/web-interface/search/type?search_type=video&page=${page}&keyword=${encodeURIComponent(keyword)}`,
    'https://search.bilibili.com/');
  return (d.result || []).map(v => ({
    bvid: v.bvid, title: strip(v.title), author: v.author, mid: v.mid, play: v.play, duration: v.duration,
    pubdate: new Date(v.pubdate * 1000).toISOString().slice(0, 10),
  }));
}

const cardCache = new Map();
export async function upCard(mid) {
  if (cardCache.has(mid)) return cardCache.get(mid);
  const d = await api(`https://api.bilibili.com/x/web-interface/card?mid=${mid}`);
  const c = { mid, name: d.card.name, fans: d.card.fans, verifyType: d.card.Official?.type ?? -1, verify: d.card.Official?.title || '' };
  cardCache.set(mid, c);
  return c;
}

export async function view(bvid) {
  return api(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
}

// 已确认的官方认证账号（mid → 名称）
export const OFFICIAL = { 1517070574: '芝麻街SesameStreet', 1057641912: '海底小纵队官方号', 1005135296: '天线宝宝官方', 222156641: '宝宝巴士BabyBus', 1587552002: '兔小贝Beckybunny' };
