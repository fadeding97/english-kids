// 调研用：给绘本找朗读/动画版，给亲子互动找示范视频。结果写到 scripts/out/books.txt。
// 用法：node scripts/research-books.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadResources, searchVideos, view, sleep } from './bili.mjs';

const { ITEMS } = loadResources();
const EXTRA = {
  'Ten Little Fingers': ['Ten Little Fingers and Ten Little Toes read aloud'],
  'Where Is Baby’s Belly Button?': ['Where Is Baby\'s Belly Button read aloud'],
  'Dear Zoo': ['Dear Zoo read aloud', 'Dear Zoo 绘本 动画'],
  'Where’s Spot?': ['Where\'s Spot read aloud', 'Spot 小玻 动画 英文'],
  'Brown Bear, Brown Bear': ['Brown Bear Brown Bear What Do You See song', 'Brown Bear 绘本 英文 朗读'],
  'Goodnight Moon': ['Goodnight Moon read aloud'],
  'The Very Hungry Caterpillar': ['The Very Hungry Caterpillar animation', '好饿的毛毛虫 英文 动画'],
  'From Head to Toe': ['From Head to Toe Eric Carle read aloud'],
  'Little Blue Truck': ['Little Blue Truck read aloud'],
  'Go Away, Big Green Monster!': ['Go Away Big Green Monster read aloud'],
  'We’re Going on a Bear Hunt': ['We\'re Going on a Bear Hunt Michael Rosen', 'We\'re Going on a Bear Hunt 动画'],
  'Pete the Cat': ['Pete the Cat I Love My White Shoes', 'Pete the Cat 皮特猫 英文'],
  'Chicka Chicka Boom Boom': ['Chicka Chicka Boom Boom'],
  'Elephant & Piggie': ['Elephant and Piggie read aloud', '小猪小象 Elephant Piggie 英文'],
  'Biscuit': ['Biscuit My First I Can Read 朗读', 'Biscuit read aloud'],
  'Oxford Reading Tree': ['牛津树 1级 动画 英文', 'Oxford Reading Tree level 1 动画'],
  'Peekaboo & Pat-a-cake': ['Pat a cake nursery rhyme', 'Peekaboo song baby'],
  'Daily Routine English': ['宝宝 日常英语 口语 启蒙 一句话', 'toddler daily routine English'],
  'Action Songs': ['Head Shoulders Knees and Toes', 'If You\'re Happy and You Know It song'],
  'Simon Says': ['Simon Says game kids English'],
  'Pretend Play': ['pretend play English kids role play'],
  // 新增手指谣
  '__Fingerplays': ['finger play songs toddlers 手指谣', 'Itsy Bitsy Spider finger play', 'Round and Round the Garden finger rhyme', '英文手指谣 合集'],
};
const targets = ITEMS.filter(i => i.t === 'book' || i.t === 'play').map(i => i.n).concat(['__Fingerplays']);
const lines = [];
for (const name of targets) {
  const kws = EXTRA[name] || [ITEMS.find(i => i.n === name)?.q];
  const seen = new Map();
  for (const kw of kws) {
    try { for (const v of await searchVideos(kw)) if (!seen.has(v.bvid)) seen.set(v.bvid, v); }
    catch (e) { lines.push(`  搜索失败 ${kw}`); await sleep(15000); }
    await sleep(3500);
  }
  const list = [...seen.values()].sort((a, b) => b.play - a.play).slice(0, 7);
  lines.push(`\n## ${name}  （${kws.join(' / ')}）`);
  for (const v of list) {
    try {
      const d = await view(v.bvid);
      const parts = d.ugc_season ? d.ugc_season.sections.flatMap(s => s.episodes.map(e => e.title)) : d.pages.map(p => p.part);
      lines.push(`  ${d.bvid} | ${d.owner.name} | ${d.stat.view}播放 | ${d.pages.length}P ${Math.round(d.duration / 60)}分${d.ugc_season ? ` | 合集${parts.length}` : ''} | ${d.title.slice(0, 56)}`
        + `\n      简介: ${(d.desc || '').replace(/\s+/g, ' ').slice(0, 60)} | 分集: ${parts.slice(0, 3).map(t => t.slice(0, 22)).join(' / ')}`);
    } catch (e) { lines.push(`  ${v.bvid} 详情失败`); }
    await sleep(900);
  }
  console.log('done', name);
  fs.writeFileSync(path.join(ROOT, 'scripts/out/books.txt'), lines.join('\n'));
}
