import type { InteractionConfig } from "../types/config";

/**
 * Genesis 交互升级层配置
 *
 * 光标光晕 / 卡片聚光 / 磁吸按钮 / 点击涟漪等仅在
 * 桌面端（hover + 精确指针）且未开启"减少动态效果"时启用；
 * 涟漪与星幕等轻量效果不受此限制。
 */
export const interactionConfig: InteractionConfig = {
	enable: true,
	cursorAura: true,
	cardSpotlight: true,
	magneticButtons: true,
	ripple: true,
	starfield: true,
	cascadeReveal: true,
};
