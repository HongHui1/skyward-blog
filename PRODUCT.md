# SkyCity

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

SkyCity 是 cloudward 的个人博客，用来记录和分享生活、学习方向、兴趣与旅行。事实来自用户在本任务中的明确说明。

## Users

作者本人，以及来阅读文章、看旅行照片和发现实用工具的访客。无需登录。

## Capabilities and Constraints

- 基于 Mizuki 的 Astro / Svelte 静态博客，使用 pnpm，发布目标为 GitHub Pages 的 `/skyward-blog/` 子路径。
- 保留个人文章、杂谈、南京相册、工具栏、物品分享、音乐播放器、调色与场景切换。
- 原始模板示例的隐藏状态、已有内容和外部链接应保留。不要编造旅行地点、学习进度、读者数或活动。
- 动态壁纸必须保留作者与创意工坊链接。移动端、键盘导航、减少动态效果模式需要可用。
- 本次改造前的完整文件备份位于 `.impeccable/backups/pre-atmosphere-20260914-205823/`，包括原有未提交改动。

## Brand Commitments

- 网站名称 SkyCity；网名 cloudward；中文简体。
- 用户偏好动态、沉浸、可探索的体验，已经授权本次自主选择设计方向和实现方式。
- 延续当前的动漫动态场景与真实旅行照片，采用直接代码实现来验证交互。
- 页脚保持简洁文字，保留版权、订阅与主题署名。按用户 2026-10-30 的要求移除底部 SKYCITY 三维自然微景观及其渲染入口，减少资源占用。

## Evidence on Hand

- `src/content/posts/` 中的南京旅行、学习回望及建立博客的文章。
- `src/data/diary.ts` 中的夏日与《鸟之诗》杂谈。
- `public/images/albums/nanjing/info.json` 中的 15 张真实南京照片及说明。
- 三个已署名的壁纸场景、现有头像、工具数据及音乐配置。

## Product Principles

- 先让读者读到内容，也给愿意停留的人留下探索的空间。
- 交互由真实内容驱动，内容在动画尚未加载时也应可见。
- 扩展已有功能，不用虚构数据装饰页面。
- 每次视觉改造都可回退。
