// 下载小游戏和计划页用到的 Twemoji 卡通图标（CC-BY 4.0，https://github.com/jdecked/twemoji）到 img/tw/。
// 用法：node scripts/get-twemoji.mjs   （新增单词时，在 js/games.js 的 WORD_PIC 里加表情，再跑一次）
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../js/games.js', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('const WORD_PIC'), src.indexOf('const GAME_FALLBACK'));
const emojis = [...new Set([...block.matchAll(/\['([^']+)'/g)].map(m => m[1]))];
// Twemoji 文件名规则：码点转小写十六进制，用 - 连接；没有 200d（零宽连接）时去掉 fe0f
const code = e => { const cps = [...e].map(c => c.codePointAt(0).toString(16)); return (cps.includes('200d') ? cps : cps.filter(c => c !== 'fe0f')).join('-'); };
fs.mkdirSync(new URL('../img/tw/', import.meta.url), { recursive: true });
for (const e of emojis) {
  const c = code(e), out = new URL(`../img/tw/${c}.svg`, import.meta.url);
  if (fs.existsSync(out)) continue;
  const r = await fetch(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${c}.svg`);
  if (!r.ok) { console.log('缺少', e, c, r.status); continue; }
  fs.writeFileSync(out, await r.text());
  console.log('ok', e, c);
}
