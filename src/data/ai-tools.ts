export type AIToolCategory =
	| "chat"
	| "coding"
	| "image"
	| "audio"
	| "video"
	| "writing"
	| "search"
	| "other";

export type AIToolFrequency =
	| "daily"
	| "weekly"
	| "occasional"
	| "experimental";

export type LocaleString = Partial<
	Record<"en" | "zh_CN" | "zh_TW" | "ja", string>
>;

export function getLocaleString(value: LocaleString, lang: string): string {
	return value[lang as keyof LocaleString] ?? value.en ?? "";
}

export interface AITool {
	id: string;
	name: string;
	description: LocaleString;
	icon: string;
	category: AIToolCategory;
	frequency?: AIToolFrequency;
	url?: string;
	usage?: LocaleString;
	tags?: string[];
	color?: string;
	rating?: number;
	recommendation?: LocaleString;
	bestFor?: LocaleString;
}

export const aiToolsData: AITool[] = [
	{
		id: "chatgpt",
		name: "ChatGPT",
		description: {
			en: "For questions, organizing ideas, studying, and writing.",
			zh_CN: "用于问答、梳理思路，以及辅助学习和写作。",
		},
		icon: "simple-icons:openai",
		category: "chat",
		url: "https://chatgpt.com/",
		tags: ["AI", "问答", "写作"],
		color: "#10A37F",
		rating: 5,
		recommendation: {
			en: "Versatile across learning, writing, reasoning, and everyday problem solving.",
			zh_CN: "学习、写作、推理和日常问题都能覆盖，综合能力最均衡。",
		},
		bestFor: { en: "General AI assistance", zh_CN: "需要一个全能型 AI 助手时" },
	},
	{
		id: "gemini",
		name: "Gemini",
		description: {
			en: "For multimodal questions, understanding materials, and another perspective.",
			zh_CN: "用于多模态问答、资料理解，并补充不同视角。",
		},
		icon: "simple-icons:googlegemini",
		category: "chat",
		url: "https://gemini.google.com/?hl=zh",
		tags: ["AI", "多模态", "资料理解"],
		color: "#8E75B2",
		rating: 4.5,
		recommendation: {
			en: "Strong multimodal understanding and useful as a second perspective.",
			zh_CN: "多模态资料理解表现出色，也很适合用来补充第二种思路。",
		},
		bestFor: {
			en: "Images, files, and cross-checking",
			zh_CN: "图片、文件理解与交叉验证",
		},
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		description: {
			en: "For Chinese Q&A, study support, writing, and working through code ideas.",
			zh_CN: "用于中文问答、辅助学习、写作和梳理代码思路。",
		},
		icon: "simple-icons:deepseek",
		category: "chat",
		url: "https://www.deepseek.com/",
		tags: ["AI", "问答", "代码"],
		color: "#4D6BFE",
		rating: 4.5,
		recommendation: {
			en: "A practical Chinese-language assistant for studying and code reasoning.",
			zh_CN: "中文交流自然，学习答疑和代码思路梳理都很实用。",
		},
		bestFor: {
			en: "Chinese Q&A and code thinking",
			zh_CN: "中文问答与代码思路分析",
		},
	},
	{
		id: "leetcode",
		name: "LeetCode",
		description: {
			en: "For algorithm practice, reviewing solutions, and reinforcing data structures.",
			zh_CN: "用于算法练习、题解复盘和巩固数据结构。",
		},
		icon: "simple-icons:leetcode",
		category: "coding",
		url: "https://leetcode.cn/accounts/login/?next=%2F",
		tags: ["算法", "数据结构", "刷题"],
		color: "#FFA116",
		rating: 5,
		recommendation: {
			en: "A mature practice system with broad problem coverage and active discussions.",
			zh_CN: "题库完整、讨论活跃，适合把算法和数据结构真正练熟。",
		},
		bestFor: {
			en: "Structured algorithm practice",
			zh_CN: "系统刷题与面试准备",
		},
	},
	{
		id: "aigei",
		name: "爱给网",
		description: {
			en: "For finding sound effects, music, video, images, and other creative assets.",
			zh_CN: "用于查找音效、配乐、视频、图片等创作素材。",
		},
		icon: "material-symbols:perm-media-outline",
		category: "image",
		url: "https://www.aigei.com/",
		tags: ["素材", "音效", "图片"],
		color: "#00A5E5",
		rating: 4,
		recommendation: {
			en: "A broad Chinese creative asset library that is quick to search.",
			zh_CN: "中文素材覆盖面广，临时寻找音效、图片和视频素材很方便。",
		},
		bestFor: { en: "Quick creative asset searches", zh_CN: "快速寻找创作素材" },
	},
	{
		id: "iloveimg",
		name: "iLoveIMG",
		description: {
			en: "Online tools for compressing, resizing, cropping, and converting images.",
			zh_CN: "用于在线压缩、调整尺寸、裁剪和转换图片格式。",
		},
		icon: "material-symbols:photo-library-outline",
		category: "image",
		url: "https://www.iloveimg.com/zh-cn",
		tags: ["图片压缩", "尺寸调整", "格式转换"],
		color: "#4B8BF4",
		rating: 4.5,
		recommendation: {
			en: "Fast, approachable, and covers the most common image chores in one place.",
			zh_CN: "上手快，常见的图片压缩、裁剪和格式处理基本都能一次完成。",
		},
		bestFor: {
			en: "Quick browser-based image processing",
			zh_CN: "不安装软件的轻量图片处理",
		},
	},
	{
		id: "photopea",
		name: "Photopea",
		description: {
			en: "A capable browser image editor with PSD support and layered editing.",
			zh_CN: "支持 PSD 与图层编辑的在线图片处理工具。",
		},
		icon: "material-symbols:landscape-2-edit-outline",
		category: "image",
		url: "https://www.photopea.com/",
		tags: ["图片编辑", "PSD", "图层"],
		color: "#18A497",
		rating: 5,
		recommendation: {
			en: "Remarkably complete for a browser editor and opens many professional formats.",
			zh_CN: "浏览器里就有接近桌面软件的图层能力，对 PSD 等格式兼容也很好。",
		},
		bestFor: {
			en: "Layered editing without installation",
			zh_CN: "临时进行较完整的图片编辑",
		},
	},
	{
		id: "qbittorrent",
		name: "qBittorrent",
		description: {
			en: "An open-source BitTorrent client for downloads and torrent management.",
			zh_CN: "开源的 BitTorrent 下载与种子管理客户端。",
		},
		icon: "simple-icons:qbittorrent",
		category: "video",
		url: "https://www.qbittorrent.org/",
		tags: ["下载", "开源", "BitTorrent"],
		color: "#2F67BA",
		rating: 5,
		recommendation: {
			en: "Open source, lightweight, and free from bundled advertising.",
			zh_CN: "开源、轻量且没有捆绑广告，下载管理功能也足够完整。",
		},
		bestFor: {
			en: "Clean BitTorrent management",
			zh_CN: "干净稳定的 BT 下载管理",
		},
	},
	{
		id: "potplayer",
		name: "PotPlayer",
		description: {
			en: "For playing local video, audio, and common media formats.",
			zh_CN: "用于播放本地视频、音频和常见媒体格式。",
		},
		icon: "material-symbols:play-circle-outline",
		category: "audio",
		url: "https://potplayer.tv/",
		tags: ["播放器", "视频", "音频"],
		color: "#7C5CFC",
		rating: 4.5,
		recommendation: {
			en: "Excellent format support with deep playback and subtitle controls.",
			zh_CN: "格式兼容全面，播放、字幕和画面设置都很细致。",
		},
		bestFor: {
			en: "Local video and subtitle playback",
			zh_CN: "本地视频与字幕播放",
		},
	},
	{
		id: "winrar",
		name: "WinRAR",
		description: {
			en: "For compressing, extracting, and managing RAR, ZIP, and other archives.",
			zh_CN: "用于压缩、解压和管理 RAR、ZIP 等压缩文件。",
		},
		icon: "material-symbols:folder-zip-outline",
		category: "search",
		url: "https://www.winrar.com.cn/",
		tags: ["压缩", "解压", "归档"],
		color: "#8E44AD",
		rating: 4,
		recommendation: {
			en: "A familiar and dependable archive utility with strong RAR support.",
			zh_CN: "老牌稳定，对 RAR 格式支持尤其完整，日常解压足够可靠。",
		},
		bestFor: {
			en: "RAR archives and familiar workflows",
			zh_CN: "RAR 文件与传统压缩工作流",
		},
	},
	{
		id: "bandizip",
		name: "Bandizip",
		description: {
			en: "For quickly compressing, extracting, and previewing common archive formats.",
			zh_CN: "用于快速压缩、解压和预览常见归档文件。",
		},
		icon: "material-symbols:folder-zip-outline",
		category: "search",
		url: "https://www.bandisoft.com/bandizip/",
		tags: ["压缩", "解压", "文件"],
		color: "#00A98F",
		rating: 4.5,
		recommendation: {
			en: "Fast archive previews and a polished everyday extraction workflow.",
			zh_CN: "预览和解压速度快，界面也更适合日常文件处理。",
		},
		bestFor: {
			en: "Fast everyday archive handling",
			zh_CN: "高频压缩、解压与预览",
		},
	},
	{
		id: "tbtool",
		name: "图吧工具箱",
		description: {
			en: "For viewing hardware details, checking status, and accessing common PC utilities.",
			zh_CN: "用于查看硬件信息、检测状态和使用常见电脑工具。",
		},
		icon: "material-symbols:build-circle-outline",
		category: "search",
		url: "https://www.tbtool.cn/",
		tags: ["硬件检测", "电脑工具", "系统"],
		color: "#F59E0B",
		rating: 4.5,
		recommendation: {
			en: "A convenient collection of PC hardware inspection and diagnostic utilities.",
			zh_CN: "硬件检测工具集中，装机验机和排查电脑状态时非常省事。",
		},
		bestFor: {
			en: "PC inspection and diagnostics",
			zh_CN: "装机验机与硬件状态排查",
		},
	},
	{
		id: "virustotal",
		name: "VirusTotal",
		description: {
			en: "Checks files, URLs, domains, and hashes with multiple security engines.",
			zh_CN: "使用多家安全引擎检测文件、网址、域名和哈希。",
		},
		icon: "material-symbols:verified-user-outline",
		category: "search",
		url: "https://www.virustotal.com/gui/home/upload",
		tags: ["安全检测", "文件扫描", "网址检查"],
		color: "#394EFF",
		rating: 5,
		recommendation: {
			en: "A strong first check for suspicious downloads by comparing many engines at once.",
			zh_CN: "能同时参考多家安全引擎，检查陌生文件和链接时很有价值。",
		},
		bestFor: {
			en: "Checking suspicious files and links",
			zh_CN: "打开陌生文件或链接前的初步检查",
		},
	},
	{
		id: "localsend",
		name: "LocalSend",
		description: {
			en: "Open-source local-network file sharing across phones and computers.",
			zh_CN: "在手机与电脑之间通过局域网跨平台传输文件。",
		},
		icon: "material-symbols:mobile-share-outline",
		category: "search",
		url: "https://localsend.org/",
		tags: ["文件传输", "局域网", "开源"],
		color: "#1D9BF0",
		rating: 5,
		recommendation: {
			en: "Private, cross-platform, and extremely convenient when devices share a network.",
			zh_CN: "跨平台、开源且不依赖云端，同一网络下传文件非常顺手。",
		},
		bestFor: {
			en: "Phone-to-PC local transfers",
			zh_CN: "手机与电脑之间快速互传文件",
		},
	},
	{
		id: "deskpin",
		name: "DeskPin",
		description: {
			en: "A lightweight Windows utility that keeps selected windows always on top.",
			zh_CN: "将指定 Windows 窗口固定在最前端的轻量工具。",
		},
		icon: "material-symbols:keep-outline",
		category: "search",
		url: "https://maoyanqing.com/deskpin",
		tags: ["窗口置顶", "Windows", "效率"],
		color: "#E36B4F",
		rating: 4.5,
		recommendation: {
			en: "Focused on one small job and makes reference windows much easier to keep nearby.",
			zh_CN: "功能专一而直接，查资料或多任务工作时能让关键窗口始终留在眼前。",
		},
		bestFor: {
			en: "Keeping references visible while working",
			zh_CN: "工作时固定参考资料、播放器或监控窗口",
		},
	},
	{
		id: "snipaste",
		name: "Snipaste",
		description: {
			en: "A fast screenshot tool with annotation, color picking, and image pinning.",
			zh_CN: "支持截图、标注、取色和贴图置顶的效率工具。",
		},
		icon: "material-symbols:screenshot-monitor-outline",
		category: "search",
		url: "https://zh.snipaste.com/",
		tags: ["截图", "贴图", "取色"],
		color: "#2FA47F",
		rating: 5,
		recommendation: {
			en: "Exceptionally quick for capturing details and pinning visual references beside your work.",
			zh_CN: "截图和贴图衔接得非常顺手，临时对照图片、代码或文字时尤其高效。",
		},
		bestFor: {
			en: "Screenshots, annotations, and pinned visual references",
			zh_CN: "截图标注、颜色拾取与贴图对照",
		},
	},
	{
		id: "ilovepdf",
		name: "iLovePDF",
		description: {
			en: "For merging, splitting, compressing, and converting PDF files online.",
			zh_CN: "用于在线合并、拆分、压缩和转换 PDF 文件。",
		},
		icon: "material-symbols:picture-as-pdf-outline",
		category: "writing",
		url: "https://www.ilovepdf.com/zh-cn",
		tags: ["PDF", "转换", "文档"],
		color: "#E5322D",
		rating: 4.5,
		recommendation: {
			en: "A convenient all-in-one set for the PDF tasks most people need.",
			zh_CN: "PDF 合并、拆分、压缩和转换集中在一起，临时处理很省心。",
		},
		bestFor: {
			en: "Everyday PDF processing",
			zh_CN: "日常 PDF 合并、压缩与转换",
		},
	},
	{
		id: "diffchecker",
		name: "Diffchecker",
		description: {
			en: "Compares text and files side by side to highlight additions, removals, and changes.",
			zh_CN: "并排比较文本和文件，快速标出新增、删除与修改内容。",
		},
		icon: "material-symbols:difference-outline",
		category: "writing",
		url: "https://www.diffchecker.com/",
		tags: ["文本对比", "差异检查", "文件"],
		color: "#6A5AE0",
		rating: 4.5,
		recommendation: {
			en: "Makes revisions easy to scan when two versions need a quick visual comparison.",
			zh_CN: "两份内容需要快速核对时很直观，修改点不用再靠肉眼逐行寻找。",
		},
		bestFor: {
			en: "Comparing drafts, code snippets, and document revisions",
			zh_CN: "文章草稿、代码片段和文件版本对比",
		},
	},
	{
		id: "cloudconvert",
		name: "CloudConvert",
		description: {
			en: "Converts documents, images, audio, video, and many other file formats online.",
			zh_CN: "在线转换文档、图片、音频、视频等多种文件格式。",
		},
		icon: "material-symbols:cloud-sync-outline",
		category: "writing",
		url: "https://cloudconvert.com/",
		tags: ["格式转换", "文档", "媒体"],
		color: "#E63946",
		rating: 4.5,
		recommendation: {
			en: "Wide format coverage and useful advanced options for occasional conversions.",
			zh_CN: "格式覆盖很广，也保留了不少高级参数，偶尔转换冷门格式很方便。",
		},
		bestFor: {
			en: "Cross-format file conversion",
			zh_CN: "不同文档与媒体格式之间转换",
		},
	},
	{
		id: "deepl",
		name: "DeepL",
		description: {
			en: "A translation and writing assistant focused on natural phrasing.",
			zh_CN: "侧重自然表达的在线翻译与写作辅助工具。",
		},
		icon: "material-symbols:translate",
		category: "writing",
		url: "https://www.deepl.com/zh/translator",
		tags: ["翻译", "语言", "写作"],
		color: "#0F2B46",
		rating: 4.5,
		recommendation: {
			en: "Produces fluent translations and is especially helpful for polishing phrasing.",
			zh_CN: "译文通常比较自然，润色语气和对照外文表达时很好用。",
		},
		bestFor: { en: "Natural translation and wording", zh_CN: "翻译与表达润色" },
	},
	{
		id: "excalidraw",
		name: "Excalidraw",
		description: {
			en: "For quickly drawing sketches, flowcharts, and knowledge structures.",
			zh_CN: "用于快速绘制草图、流程图和知识结构。",
		},
		icon: "simple-icons:excalidraw",
		category: "other",
		url: "https://excalidraw.com/",
		tags: ["白板", "流程图", "草图"],
		color: "#6965DB",
		rating: 5,
		recommendation: {
			en: "Fast, expressive, and excellent for communicating ideas without visual overhead.",
			zh_CN: "手绘感自然、操作轻快，很适合快速把结构和想法讲清楚。",
		},
		bestFor: {
			en: "Quick sketches and idea mapping",
			zh_CN: "快速草图、知识结构与思路表达",
		},
	},
	{
		id: "diagrams-net",
		name: "diagrams.net",
		description: {
			en: "A full-featured diagram editor for flowcharts, architecture, and structured visuals.",
			zh_CN: "用于绘制流程图、架构图和结构化图示的完整编辑器。",
		},
		icon: "material-symbols:account-tree-outline",
		category: "other",
		url: "https://app.diagrams.net/",
		tags: ["流程图", "架构图", "图表"],
		color: "#F08705",
		rating: 5,
		recommendation: {
			en: "Powerful enough for complex diagrams while remaining free and browser-based.",
			zh_CN: "免费且功能完整，复杂流程图和软件架构图都能认真绘制。",
		},
		bestFor: {
			en: "Formal flowcharts and architecture diagrams",
			zh_CN: "正式流程图、架构图与课程作业",
		},
	},
];
