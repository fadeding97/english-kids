# 英语启蒙地图

按月龄整理的英文儿歌、动画、绘本和亲子游戏。纯静态网站，视频由 B站官方嵌入播放器播放，本站不存储视频。

线上地址：<https://fadeding97.github.io/english-kids/>（GitHub Pages，main 分支根目录；推送到 main 后一两分钟自动更新）

## 本地预览

```bash
node scripts/serve.mjs
```

然后在浏览器打开 <http://localhost:5173>。需要 Node 18 以上，无其他依赖。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 页面、样式和交互 |
| `data/resources.js` | 阶段、分类和资源清单（手工维护） |
| `data/sources.json` | 每条资源选定的 B站视频（BV 号；`official: true` 表示官方账号） |
| `data/media.js` | 由脚本生成：标题、封面、时长、分P和合集选集 |
| `scripts/build-media.mjs` | 根据 `sources.json` 重新生成 `media.js` |
| `scripts/research.mjs`、`research2.mjs`、`pick.mjs`、`find-official.mjs` | 找视频时用的调研脚本 |

## 换视频或新增视频

1. 在 `data/sources.json` 里改或加一行，例如 `"Peppa Pig": { "bvid": "BV1AoJE61ESS" }`。
   - 视频属于 B站合集时，会自动导入整个合集作为选集；不想要合集加 `"useSeason": false`。
2. 运行 `node scripts/build-media.mjs`。
3. 刷新页面。

## 部署

把整个文件夹（`scripts/` 可以不传）上传到任意静态托管即可，例如 GitHub Pages、Cloudflare Pages、Vercel。使用国内服务器需要 ICP 备案。

播放器借鉴了 [KidsTube](https://github.com/dickenson258/kidstube)（MIT）的嵌入方式。
