// 调研用：按品牌名搜索 B站 UP 主，列出带“机构认证”或名字含“官方”的账号。
import { api, sleep } from './bili.mjs';

const brands = process.argv.slice(2);
for (const b of brands) {
  const d = await api(`https://api.bilibili.com/x/web-interface/search/type?search_type=bili_user&keyword=${encodeURIComponent(b)}`, 'https://search.bilibili.com/');
  const rows = (d.result || []).filter(u => u.official_verify?.type === 1 || u.official_verify?.type === 0 || /官方|official/i.test(u.uname));
  console.log(`\n## ${b}`);
  if (!rows.length) console.log('  （没有认证或官方账号）');
  rows.slice(0, 6).forEach(u => console.log(`  mid=${u.mid}  ${u.uname}  认证=${u.official_verify?.type}:${u.official_verify?.desc || ''}  粉丝${u.fans}  视频${u.videos}`));
  await sleep(1200);
}
