---
name: SkyCity
description: 延续 Mizuki 的蓝紫天空、白色阅读表面与真实旅行影像。
colors:
  primary: "oklch(0.70 0.14 var(--hue))"
  primary-dark: "oklch(0.75 0.14 var(--hue))"
  page-bg: "oklch(0.95 0.01 var(--hue))"
  page-bg-dark: "oklch(0.16 0.014 var(--hue))"
  card-bg: "#ffffff"
  card-bg-dark: "oklch(0.23 0.015 var(--hue))"
  deep-text: "oklch(0.25 0.02 var(--hue))"
  sky-ink: "var(--deep-text)"
  sky-ink-dark: "rgb(255 255 255 / .9)"
  opening-text: "#ffffff"
  opening-action-ink: "#15253b"
  pixel-caption: "#526276"
  pixel-caption-dark: "#b4c3d4"
  nature-earth: "#99794e"
  nature-moss: "#75904a"
  nature-earth-shadow: "#5b4835"
  nature-moon-stone: "#9c967d"
  journal-photo-shadow: "rgb(20 32 48 / .35)"
  journal-photo-edge: "rgb(20 32 48 / .08)"
  journal-paper-shadow: "rgb(20 32 48 / .15)"
  journal-paper-hover: "rgb(20 32 48 / .3)"
  journal-photo-shadow-dark: "rgb(0 0 0 / .6)"
typography:
  journal-quote:
    fontFamily: "Songti SC, SimSun, serif"
  journal-handnote:
    fontFamily: "Georgia, serif"
  display:
    fontFamily: "Space Grotesk, ZenMaruGothic-Medium, Loli, sans-serif"
    fontSize: "clamp(3.7rem, 7.5vw, 6rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-.035em"
  body:
    fontFamily: "ZenMaruGothic-Medium, Loli, ui-sans-serif, system-ui, sans-serif"
  headline:
    fontSize: "clamp(1.45rem, 2.5vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-.02em"
rounded:
  radius-large: "1rem"
  opening-action: "12px"
  travel-viewer: "14px"
  pixel-control: "6px"
  journal-paper: "4px"
  journal-photo: "3px"
  journal-thumbnail: "2px"
  journal-thumbnail-image: "1px"
components:
  button-primary:
    backgroundColor: "{colors.opening-text}"
    textColor: "{colors.opening-action-ink}"
    rounded: "{rounded.opening-action}"
    padding: ".7rem 1.15rem"
  button-ghost:
    backgroundColor: "rgb(16 29 48 / .2)"
    textColor: "{colors.opening-text}"
    rounded: "{rounded.opening-action}"
    padding: ".7rem 1.15rem"
  reading-card:
    backgroundColor: "{colors.card-bg}"
    rounded: "{rounded.radius-large}"
---

# Design System: SkyCity

## Overview

**Creative North Star: "随风而行的天空手记"**

延续 Mizuki 已有的蓝紫场景、明亮阅读面与亲切中文字体；动态影像提供氛围，真实文章与照片提供内容。此文档记录本次 code-led 扩展的已实现系统，不另立品牌或替换既有功能。

整体是有层次但不拥挤的个人空间：场景上的控制轻巧、清晰，阅读区域安定、直接。照片接触印样式的缩略图是探索入口；动作反馈服务于选择，不阻挡内容出现。

**Key Characteristics:**

- 动态天空与安静阅读并存。
- 真实摄影、可选择场景、始终保留署名。
- 延续现有主题变量与字体；页脚使用简洁文字，不加载三维微景观。

## Colors

配色以可调色相的 Mizuki 主题为基础，影像区域使用稳定的白字与深色遮罩。

### Primary

- **天空主题色**（primary / primary-dark）：默认色相由站点配置指定为 240；用于主题操作、旅行缩略图选中背景和内容区焦点。保留用户调色能力，不将主题固化为单一蓝色。

### Neutral

- **雾色页面**（page-bg / page-bg-dark）：承接壁纸下方的内容。
- **阅读纸面**（card-bg / card-bg-dark）：常规卡片的明暗主题表面。
- **首页正文锚点**（sky-ink / sky-ink-dark）：首页新增标题、文案与入口，以及旅行窗口标题和相册链接使用 sky-ink；浅色主题继承已有 deep-text，暗色主题切换为高亮白字。
- **影像白与按钮墨色**（opening-text / opening-action-ink）：首屏文字与实心阅读入口的高辨识配对。
- 次要文案和分隔线直接沿用 content-meta、line-divider；不为一次性遮罩创建新主题色阶。

## Typography

**Display Font:** Space Grotesk，回退 ZenMaruGothic-Medium、Loli、sans-serif。

**Body Font:** ZenMaruGothic-Medium、Loli，随后使用系统 sans-serif。

**Label/Mono Font:** 代码沿用 JetBrains Mono；Press Start 2P 保留给原有像素装饰，不接管本次首页标题。

英文展示字强调清晰轮廓，中文使用既有柔和字形。字体通过 Astro Font API 加载；本次未引入新字体。

### Hierarchy

- **Display:** 前言中的 display 对应桌面首页标题；中文前缀缩至标题的 0.3em。
- **Headline:** 前言中的 headline 对应旅行区标题。
- **Body:** 首屏说明使用流体字号（clamp(.98rem, 1.35vw, 1.1rem)）、行高（1.9）、最大宽度（27em）。
- **Label:** 署名与场景辅助说明保持小字号；旅行计数使用展示字体及等宽数字。全局根字号在移动端为 14px，md 起为 16px。

## Layout

保留既有导航、侧栏与文章网格。首页表达顺序是场景入口、日常内容、南京影像、文章归档；这属于首页构图，不是其他页面必须复制的模板。

首屏文字与场景选择组成两列：主列自适应，场景列宽（15rem），间距（3rem），水平定位参考（1160px）内容范围。宽度不超过 800px 时改为单列，场景缩略图压缩成横向选项；短屏额外收紧底部留白，必要时隐藏非关键个人签名。手机首屏隐藏重复的向下浏览提示；壁纸作者署名独立留在底部工具栏上方，使用（11px）字号并允许自然换行。

旅行窗口桌面画幅为（16:10），不超过 700px 时改为（4:5），缩略图排在说明前。照片采用 object-fit: cover；完整相册始终提供原始内容入口。布局断点来自实际组件，不合并成虚构的统一 spacing scale。

## Elevation & Depth

用真实影像、渐暗遮罩和浅阅读面形成层次；小面积阴影帮助按钮和场景卡从壁纸上浮出。普通阅读卡沿用主题边框和微阴影，首页不再随整张卡片的 hover 位移。

### Shadow Vocabulary

- **阅读入口浮层**（0 8px 24px rgb(4 15 32 / .12)）：白色阅读按钮。
- **场景照片厚度**（0 8px 22px rgb(6 19 41 / .25)）：可选择的场景缩略图。

## Shapes

沿用大卡片圆角变量；首页旅行窗口与方向卡采用前言中的 travel-viewer 圆角，首屏操作采用 opening-action 圆角。场景照片为轻微旋转的窄幅圆角矩形，选中时扶正上移；旅行上一张、下一张控制为圆形。照片窗口的四角取景线属于影像组件，不扩散为全站边框装饰。

## Components

### Buttons

首屏主入口为白底深字，次入口为半透明深底白字与细白边；最小高度（48px）。细指针 hover 上移（3px），变换过渡（220ms），背景变化（180ms）；键盘显示（2px）白色焦点轮廓。普通主题按钮继续沿用原有语义变量。

### Cards / Containers

阅读卡沿用主题表面与大圆角。首页文本方向卡内边距（1.35rem）；旅行窗口裁切照片但不裁掉操作区。避免在精确阅读和点击时移动父级容器。

### Inputs / Fields

搜索沿用原有 Svelte 组件：透明输入、浅色容器、focus-within 背景反馈，桌面展开输入，移动端使用搜索面板。本次没有新增字段、表单或验证状态。

### Navigation

保留现有顶部导航、搜索、主题调色和移动菜单；链接沿用主题 hover 与 active 表面。场景、完整相册和日常入口是补充入口，不替代原导航。

### Scene Selector

保留三个原有场景与创意工坊署名：沉睡的夏日梦 / 小无名罢了（3738374514），世界很温柔 / 未竟（3314492008），落花吟 / 夜莺Night（3723257973，AIGC 精修）。完整作者描述及链接以 src/config/sceneConfig.ts 为准。首屏初始场景为落花吟；按钮用 aria-pressed 表达选中状态，署名随场景同步。

### Travel Window

从已有南京相册选取六张预览，完整相册含十五张。支持前后按钮、缩略图、方向键、Home / End 和触屏横划；不自动轮播。先解码再替换照片，显示加载或失败提示，说明通过礼貌播报更新；无 JavaScript 时保留首图与完整相册链接。

照片替换使用（260ms）的透明度与轻微缩放过渡，缓动为 cubic-bezier(.16,1,.3,1)。减少动态偏好下跳过照片动画，关闭新增控件过渡与首页跑马灯动画；继续沿用既有壁纸运动降级机制。原生 Custom Element / Web Animations API 实现，无新增依赖。

## Do's and Don'ts

### Shared nature footer · September 2026（历史方案，2026-10-30 已移除）

按用户要求移除底部 SKYCITY 三维微景观及其组件，构建不再加载该场景脚本；保留版权、订阅链接、主题署名与移动端底部安全留白。以下为历史设计记录。

所有使用 MainGridLayout 的公开页面复用 PixelSignature。页脚使用 Three.js / WebGL 实时构建自然微景观：SKYCITY 为连续轮廓挤出的实体字，底部被起伏草坡与泥土部分遮挡；草叶、野花、碎石和根须均为模型。用户指定的材质方向是「类似 Minecraft 开启光影与材质包后，保留像素但具有真实感」。不使用生成图片替代三维场景。

表面使用同一 128px 网格生成的颜色、凹凸、粗糙度与细节遮蔽贴图，最近邻采样保留清晰色块。暖灰土石、橄榄绿与苔绿为主，少量乳白和淡黄野花。土层有断续沉积纹理、矿物颗粒及近地面湿暗色。环境反射、真实方向光阴影和字面倒角提供光照层次。

白天使用自然日光，萤火弱且不启用局部灯光；深色主题使用冷色环境光与明显绿色萤火，四个动态点光源照亮附近模型。萤火飞行、草叶和轻微视角变化自动以 32 秒循环，无需点击触发。鼠标轻微改变观看角度，触屏保持滚动。

Three.js 按需加载，只有可见页脚创建渲染器；静态模型按材质合并，草叶使用实例化。最大 DPR 1.5、30fps，离屏、隐藏副本、后台标签和断开的 Swup 页面停止循环，离开页面释放 GPU 资源。WebGL 不可用时保留泥土与苔绿配色的静态 SVG 字形。

桌面画布高度 clamp(230px,31vw,370px)，窄屏 195px。保留「故事还在继续，下次见。」及「风过草木，微光不息」。暂停按钮支持键盘并保存会话状态；减少动态偏好显示静态三维场景。版权、订阅和主题署名保持原有内容。

### Do:

- **Do** 复用现有主题变量、字体与真实文章照片。
- **Do** 保留三场景作者署名及创意工坊链接。
- **Do** 在动画、图片或脚本未就绪时保留可读内容与可用链接。

### Don't:

- **Don't** 用虚构旅行、统计或学习进度填充界面。
- **Don't** 为新增首页组件硬编码一套独立主题或新增动画依赖。
- **Don't** 让减少动态偏好失效，或让装饰层阻挡键盘和触屏操作。



## Homepage journal — 2026-09-20

The approved hero and natural 3D footer frame an editorial sequence: author introduction with two overlapping real Nanjing photographs, a featured learning essay beside a quiet diary quotation, a large portrait travel window, and a compact chronological index. The home sidebar is hidden through a component-scoped `:has()` layout rule; inner pages retain it, including after Swup navigation.

The references inform rhythm rather than copied layouts: qzq's personal focus, Framer/Monolith's scale contrast, Magnolia's editorial reading hierarchy, and Sebastian Martinez's overlapping imagery. The Disiva redirect was not usable visual evidence. All photographs, titles, dates and excerpts come from the existing blog; no trips, readership counts or achievements are invented.

Paper/photo corners intentionally use 1–4px radii, distinct from the existing rounded controls. Diary quotations use system Songti/SimSun; the small photograph note uses system Georgia. These are local fallbacks, with no extra font request. Neutral shadows are documented above; text and paper still respond to the site's theme and adjustable hue.

GSAP ScrollTrigger gives desktop photographs a small reversible drift and unfolds the essay's rule. It does not pin or replace scrolling, and never hides content. Touch/narrow layouts and reduced-motion preferences use the static composition. A reconnectable custom element reverts its own animations and listeners on route changes. Travel controls retain keyboard, swipe and loading-error behavior.

Validation: desktop 1440×1000, mobile 390×844, light/dark, gallery next/thumbnail/End key, Swup about-and-back, live reduced-motion cleanup, no horizontal overflow, Astro check and static build. Mechanical detector findings were limited to intentional new font/radius/shadow values, now documented in this system.
