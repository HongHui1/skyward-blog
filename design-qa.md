# SkyCity 首页第一阶段 Design QA

## 对照基准

- source visual truth path: `C:\Users\15210\.codex\visualizations\2026\07\31\019fb873-b907-7791-a014-dd2c0d634c52\figma-skycity-homepage-comparison-board.png`
- source visual size: 2400 × 1553 px，72 DPI。它是方向与验收条目板，不是待逐像素复制的单一视口稿，因此本轮按其“100svh 首屏、居中胶囊导航、暗层、水波弱化、下滑提示、正文从下一屏开始、移除模板提示”逐项核对，避免伪造像素级精度。
- desktop implementation: `C:\Users\15210\.codex\visualizations\2026\07\31\019fb873-b907-7791-a014-dd2c0d634c52\skycity-phase1-desktop-1440x1000.png`
- mobile implementation: `C:\Users\15210\.codex\visualizations\2026\07\31\019fb873-b907-7791-a014-dd2c0d634c52\skycity-phase1-mobile-390x844.png`
- next-screen evidence:
  - `C:\Users\15210\.codex\visualizations\2026\07\31\019fb873-b907-7791-a014-dd2c0d634c52\skycity-phase1-desktop-after-scroll.png`
  - `C:\Users\15210\.codex\visualizations\2026\07\31\019fb873-b907-7791-a014-dd2c0d634c52\skycity-phase1-mobile-after-scroll.png`

## 视口与状态

- desktop: CSS viewport 1440 × 1000，截图 1440 × 1000 px，deviceScaleFactor 1，无密度换算。
- mobile: CSS viewport 390 × 844，截图 390 × 844 px，deviceScaleFactor 1，无密度换算。
- state: `/` 首页、banner 模式、浅色主题、首屏初始状态；副标题为动态打字机文本，因此截图中的具体字符进度属于预期动态状态。
- fonts: `document.fonts.status === "loaded"`。
- desktop measured layout: banner 1000 px，正文起点 y=1000 px，导航胶囊约 850 × 51 px，水波 60 px。
- mobile measured layout: banner 844 px，正文起点 y=844 px，页面 clientWidth/scrollWidth 均为 390 px，水波约 50.6 px。

## Findings

- 最终对照未发现仍需处理的 P0、P1 或 P2 差异。
- [P3] 一次独立冒烟检查记录到网易云上游的 `https://music.163.com/404` 被浏览器 ORB 拦截；它没有形成 HTTP 4xx/5xx 响应或控制台错误，两首配置歌曲的 Meting 音频端点均已确认重定向到有效 MP3，播放器在最终桌面和手机截图中正常显示并播放。因此它属于现有外部音乐源的瞬时备用请求，不是本轮首页改造回归。

## 必查表面

- fonts and typography: 保留项目原有字体体系；标题、副标题、导航与小号下滑提示层级清楚。桌面标题比例醒目，390px 下无截断或异常换行。
- spacing and layout rhythm: 首屏与正文严格按一个视口分段；桌面导航收拢且水平居中，手机导航保持原布局；标题、下滑提示、水波与悬浮播放器没有互相遮挡。下一屏文章与侧栏仍沿用 Mizuki 原布局。
- colors and visual tokens: 继续使用现有主题 token；暗色遮罩只增强壁纸上的文字和导航对比度，没有改变站点主色。水波高度和不透明度已降低。
- image quality and asset fidelity: 继续使用现有桌面、手机两张壁纸原图，按各自视口裁切；最终首屏没有可见破损图片、拉伸或占位图。
- copy and content: 保留“我的SkyCity”和既有打字机副标题；日文模板公告已替换为 SkyCity 中文公告；Mizuki 默认欢迎气泡已关闭，人物和菜单功能保留。
- icons: 继续使用项目已有 Iconify/Astro Icon 图标体系；导航、下滑箭头、音乐与手机菜单图标均正常渲染，没有使用自绘占位图形。
- accessibility and motion: 下滑提示是可聚焦链接并带中文 `aria-label`；触控目标可用；`prefers-reduced-motion` 下停止浮动动画；桌面和手机均无横向溢出。

## 交互与运行证据

- 下滑提示已在桌面和手机点击验证，页面分别滚动到正文入口附近。
- 手机菜单已打开验证：面板可见，`opacity: 1`、`pointer-events: auto`。
- Swup 已验证从首页进入 `/archive/` 再返回首页；返回后 `data-is-home=true`，桌面 banner 和正文起点恢复为 1000 px。
- 最终浏览器复核：0 console error、0 page error、0 HTTP 4xx/5xx、0 visible broken image。
- `pnpm check`: 317 files，0 errors、0 warnings、0 hints。
- `pnpm build`: 18 pages built，Pagefind 索引完成。

## Full-view comparison evidence

- 桌面 1:1 截图显示：100svh 壁纸首屏、顶部居中胶囊导航、中央身份标题、弱化水波和底部下滑提示均与方向板第一阶段条目一致。
- 手机 1:1 截图显示：壁纸完整覆盖 390 × 844，可读标题与导航均在安全区域内，正文没有提前露出；下滑后文章卡片顺序和原有阅读布局保持不变。

## Focused region comparison evidence

没有额外生成裁剪图：导航、标题、下滑提示和水波在 1440 × 1000 与 390 × 844 的 1:1 原始截图中均可直接辨读；正文衔接另有同视口 next-screen 截图，已足以检查关键区域的对齐、字体、图标和间距。

## Comparison history

1. 初次实现对照发现两个 P2：390px 仿真视口被全局稳定滚动条缩成 375px，右侧出现 15px 空白；Pio 空欢迎词触发组件默认欢迎气泡，仍干扰沉浸首屏。
2. 修复：移动端将 `scrollbar-gutter` 恢复为 `auto`；当 Pio 欢迎词显式为空时向模型传入 `tips: false`，只关闭演示气泡而保留人物和菜单。
3. 修复后重新以相同视口截图并与方向板共同检查：手机 clientWidth/scrollWidth 均为 390px；桌面与手机均不再出现欢迎气泡；没有新的 P0/P1/P2。

## Implementation Checklist

- [x] 首页首屏 100svh
- [x] 桌面顶部居中胶囊导航
- [x] 轻暗遮罩与可读标题
- [x] 弱化水波与下滑提示
- [x] 正文从下一屏开始
- [x] 清理官方演示公告与欢迎提示
- [x] 保留音乐、文章、相册、人物和既有页面功能
- [x] 桌面/手机浏览器与响应式检查
- [x] 控制台、资源、图片、字体与交互检查

final result: passed
