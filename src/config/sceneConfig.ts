import { withBase } from "../utils/base-path";

/** One source for the wallpaper stage, preview strip, and author credits. */
export const wallpaperScenes = [
	{
		id: "summer",
		name: "沉睡的夏日梦",
		world: "鸣潮 · 达妮娅",
		author: "动态制作：小无名罢了（Steam：小无名）",
		credit: "鸣潮 · 达妮娅「沉睡的夏日梦」/ 小无名罢了",
		url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3738374514",
		preview: withBase("/assets/wallpaper/denia-summer-dream-mobile.webp"),
		desktop: withBase("/assets/wallpaper/denia-summer-dream-desktop.webp"),
		mobile: withBase("/assets/wallpaper/denia-summer-dream-mobile.webp"),
		posterDesktop: withBase(
			"/assets/wallpaper/denia-summer-dream-desktop.webp",
		),
		posterMobile: withBase("/assets/wallpaper/denia-summer-dream-mobile.webp"),
		videoDesktop: withBase("/assets/wallpaper/denia-summer-dream-1440p60.mp4"),
		videoMobile: withBase(
			"/assets/wallpaper/denia-summer-dream-mobile-1080p30.mp4",
		),
		quality: "1440p · 60 FPS 动态",
		dynamic: true,
		interactive: false,
	},
	{
		id: "eriyi",
		name: "世界很温柔",
		world: "《龙族》· 上杉绘梨衣",
		author: "4K60 修补：未竟；素材：龙族卡塞尔之门官方",
		credit: "《龙族》上杉绘梨衣「世界很温柔」/ 未竟",
		url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3314492008",
		preview: withBase("/assets/wallpaper/eriyi-world-gentle-mobile.webp"),
		desktop: withBase("/assets/wallpaper/eriyi-world-gentle-poster.webp"),
		mobile: withBase("/assets/wallpaper/eriyi-world-gentle-mobile.webp"),
		posterDesktop: withBase("/assets/wallpaper/eriyi-world-gentle-poster.webp"),
		posterMobile: withBase("/assets/wallpaper/eriyi-world-gentle-mobile.webp"),
		videoDesktop: withBase("/assets/wallpaper/eriyi-world-gentle-1440p60.mp4"),
		videoMobile: withBase(
			"/assets/wallpaper/eriyi-world-gentle-mobile-1080p30.mp4",
		),
		quality: "1440p · 60 FPS 动态",
		dynamic: true,
		interactive: false,
	},
	{
		id: "noa",
		name: "落花吟",
		world: "蔚蓝档案 · 生盐诺亚",
		author: "动态与原画：夜莺Night（AIGC 精修）",
		credit: "蔚蓝档案 · 生盐诺亚「落花吟」/ 夜莺Night",
		url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3723257973",
		preview: withBase("/assets/wallpaper/noa-falling-blossoms-mobile.webp"),
		desktop: withBase("/assets/wallpaper/noa-falling-blossoms-poster.webp"),
		mobile: withBase("/assets/wallpaper/noa-falling-blossoms-mobile.webp"),
		posterDesktop: withBase(
			"/assets/wallpaper/noa-falling-blossoms-poster.webp",
		),
		posterMobile: withBase(
			"/assets/wallpaper/noa-falling-blossoms-mobile.webp",
		),
		videoDesktop: withBase("/assets/wallpaper/noa-falling-blossoms-4k60.mp4"),
		videoMobile: withBase(
			"/assets/wallpaper/noa-falling-blossoms-mobile-1080p30.mp4",
		),
		quality: "原生 4K60 · 音频响应 · 鼠标光迹",
		dynamic: true,
		interactive: true,
	},
];
