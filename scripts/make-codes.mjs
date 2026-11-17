// 生成成长会员兑换码（和 js/plan-app.js 里的校验算法一致）。
// 用法：node scripts/make-codes.mjs 10 Y   → 10 个年卡码；M 为月卡（31 天）
import crypto from 'node:crypto';
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function check(s) {
  let h = 2166136261;
  for (const c of 'qmkids-2026|' + s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  let out = '';
  for (let i = 0; i < 4; i++) { out += ABC[h % ABC.length]; h = (Math.floor(h / ABC.length) ^ (h << 5)) >>> 0; }
  return out;
}
const n = Number(process.argv[2] || 5), type = (process.argv[3] || 'Y').toUpperCase() === 'M' ? 'M' : 'Y';
for (let i = 0; i < n; i++) {
  let body = ''; for (const b of crypto.randomBytes(4)) body += ABC[b % ABC.length];
  console.log(`QM${type}-${body}-${check(type + body)}`);
}
