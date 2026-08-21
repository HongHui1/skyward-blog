# SkyCity Motion System

## Motion Thesis

SkyCity 的运动主题是“风、云与城市坐标”。页面不靠满屏特效证明技术，而是在用户移动鼠标、第一次滚动和切换页面时给出恰当回应。

- **Focal moment**：首页第一次滚动。壁纸、标题、滚动提示、波浪和内容区以不同速度自然交接，像从天空落到一座新的城市坐标。
- **Continuity**：导航 active indicator 与 Swup 的轻量空间遮罩解释“从哪里到哪里”，总时长保持在普通导航不需要等待的范围。
- **Feedback**：Hero 只对精细指针做 4–10px 微视差；南京旅行主卡用极小倾斜和指针光影回应；普通卡片只保留文字、图像层次和按压反馈。
- **Budget**：不引入 GSAP。CSS 负责声明式状态与环境运动，单个 TypeScript 控制器通过一次 `requestAnimationFrame` 合并 pointer/scroll 更新。离开视口、页面 hidden、触摸屏、Reduced Motion 或保守低性能判定时停用高阶效果。

## 三层运动系统

### Level 1 — Ambient Motion

- 首页壁纸保持极慢、极小的空间呼吸；现有波浪继续作为“风”的连续线索。
- 只在首页可见且设备允许时运行；页面不可见时暂停。
- 文章页不添加持续背景运动，保留现有阅读环境。

### Level 2 — Reactive Motion

- Hero 标题、壁纸和滚动提示以不同幅度响应 pointer。
- 导航当前位置标记平滑滑动；hover 只做小幅图标/底色反馈。
- 南京主卡允许细微 perspective 与局部光影，其他卡片不复制 tilt。
- 键盘 focus 状态始终清晰，不能只靠 hover。

### Level 3 — Showcase Motion

- 仅首页首屏到“最近写下”的第一次滚动承担大型演出。
- 内容区以非对称图像遮罩/层次进入，不对每个 section 重复表演。
- Projects 当前隐藏且没有真实项目，不创建或启用虚构 Showcase。

## Motion Tokens

- 即时反馈：120–150ms，`ease` 或强 ease-out。
- 常规状态：180–260ms，`cubic-bezier(0.16, 1, 0.3, 1)`。
- 页面空间转场：约 240–280ms，退出略快于进入。
- 首页 focal sequence：滚动驱动，不阻挡操作；位移不改变布局高度。
- 指针位移：Hero 4–10px；卡片倾斜不超过约 1.5°。

## 候选效果与优先级

| 优先级 | 名称 | 来源启发 | 使用位置 | Trigger | Motion | 技术 | 性能成本 | 手机方案 | Reduced Motion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | Motion 能力分级 | 三个参考博客的动态密度反思 | 全站基础设施 | 页面加载、媒体查询、可见性变化 | 设置 `full/quiet/reduced` 能力状态 | TypeScript + CSS data 属性 | 低 | 默认 quiet | reduced，内容始终可见 |
| P0 | Hero 风向回应 | 参考站“页面会回应我”的感觉 | 首页 Hero | 精细指针移动 | 图片、标题、提示分层移动 4–10px | rAF + CSS variables | 低到中 | 关闭，保持静态构图 | 完全关闭 |
| P0 | 首次滚动接管 | 三站的 section 节奏 | 首页 Hero → 最近写下 | scroll / wheel | 标题轻微拉开、背景速度差、波浪和提示退场、内容区接管 | rAF + transform/opacity | 低 | 缩小位移，仅保留自然滚动 | 无 scrub，静态 |
| P0 | 个性滚动提示 | 当前首页和参考站导航提示 | Hero 底部 | 首次 wheel、真实滚动 | 细线/轨迹响应一次后淡出 | CSS + 控制器状态 | 低 | 只保留短提示 | 静态，无循环 |
| P0 | 最近写下非对称进入 | blog.tsh520.cn 的内容连接、tblog 的分区节奏 | 首页第一内容 section | 首次进入 viewport | 标题和旅行图像采用不同遮罩节奏，两张文本卡轻量错开 | IntersectionObserver + CSS | 低到中 | 短淡入/无遮罩 | 内容直接可见或短 opacity |
| P0 | 南京坐标卡 | 参考站的 pointer depth | 首页南京主卡 | pointer hover/move | 小角度 perspective、图片深度、光斑跟随 | rAF + CSS variables | 低 | 关闭 tilt，保留按压反馈 | 关闭 |
| P0 | 导航 active indicator | 三站胶囊导航的连续状态 | 桌面导航 | 路由、hover、resize | 单一标记在当前一级入口间滑动 | DOM 测量 + transform | 低 | 不显示，移动菜单沿用原状态 | 无空间滑动，直接切换 |
| P0 | 快速空间转场 | 三站页面衔接 | Swup 内容容器 | 内部导航/back/forward | 旧内容小幅退出、细薄遮罩扫过、新内容从相反方向接管 | Swup class + CSS | 低 | 距离减半 | 只保留极短透明度/颜色反馈 |
| P0 | 生命周期清理 | 当前持久 Banner/Swup 风险 | 全站 | content replace / hidden / destroy | 取消 rAF、observer、监听器和内联变量 | 单例控制器 | 低 | 同一逻辑 | 同一逻辑 |
| P1 | 文章图像轻量进入 | 文章阅读页允许范围 | `.custom-md img` | 首次进入 viewport | 小幅 clip/opacity，不触碰正文 | IntersectionObserver + CSS | 低 | 短 opacity | 直接可见 |
| P1 | 阅读链接反馈 | 文章页允许范围 | 正文链接、上一篇/下一篇 | hover/focus/press | 下划线与颜色从点击方向生长 | CSS | 低 | press/focus | 保留颜色状态，无位移 |
| P1 | 页面环境暂停 | 性能预算 | 波浪、Hero、卡片 | visibility / intersection | 页面 hidden 或离开区域时停止持续工作 | Page Visibility + IntersectionObserver | 低且节能 | 默认应用 | 默认应用 |
| P2 | 相册城市章节转场 | tblog 的展示型 Gallery | 相册城市详情 | 城市切换/滚动 | 图像组之间的坐标式遮罩与共享标题 | WAAPI 或 GSAP（以后评估） | 中 | 简化为淡入 | 短淡入 |
| P2 | About 个人轨迹章节 | fqzlr 的个人空间感 | About 某个真实章节 | 滚动进入 | 学习、旅行、兴趣形成一次性路径编排 | CSS/WAAPI | 中 | 纵向静态路径 | 静态 |
| P2 | Pio 偶发动作协调 | 参考站人物生命感 | Pio | 空闲且可见 | 低频、非循环的小动作，与页面状态协调 | 现有 Pio API（待确认） | 中 | 按现有移动策略 | 关闭 |
| P2 | 复杂时间线/横向 Showcase | 展览式 section | 未来有真实作品时 | scroll | sticky + progressive reveal | GSAP ScrollTrigger（未来才考虑） | 中到高 | 普通纵向列表 | 静态列表 |

## 技术与生命周期

1. 新增一个全局 motion 控制器，初始化必须幂等；Swup 内容替换后只重建页面级 observer，不重复绑定全局 listener。
2. 默认 CSS 状态始终可见，JS 只添加增强状态，避免脚本失败导致空白。
3. pointer 与 scroll 只更新 CSS variables；一帧最多写一次 DOM。
4. `will-change` 仅在 Hero 可交互或卡片 hover 时临时启用，不长期挂在所有元素。
5. 低性能信号采用保守组合：`saveData`、`hardwareConcurrency <= 4`、可用时的 `deviceMemory <= 4`。该信号只减少非必要动效，不改变内容与功能。
6. 当 `document.hidden` 或目标 section 离开 viewport，停止 rAF/环境动画；恢复后从当前状态继续。

## 设备降级

- **Desktop fine pointer**：完整 P0，包括 Hero pointer、南京卡 tilt 与 active indicator。
- **Mobile / hover:none**：禁用 pointer、tilt、magnet 与 proximity；首屏只保留静态构图、短按压和更短的滚动状态变化。
- **Low performance**：禁用 Hero pointer 与卡片 tilt；保留导航状态和快速页面转场。
- **Reduced Motion**：禁用 parallax、scroll scrub、持续循环和空间遮罩；内容一直可见，页面转场缩为简短状态反馈。

## 验收标准

- 1440×900、1920×1080、390×844、430×932 无横向滚动与明显 layout shift。
- 首页、归档、标签/分类、About、文章、相册/杂谈/工具页面可正常导航。
- back/forward、快速滚动、resize、Reduced Motion 和 10 次 Swup 往返不产生重复初始化或 Banner 半屏状态。
- 控制台无阻断错误，本地博客资源无 404；Astro 开发工具自身请求单独记录，不计为站点资源缺陷。

