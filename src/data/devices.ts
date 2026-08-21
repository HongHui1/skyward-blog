// 设备数据配置文件

export interface Device {
	name: string;
	image: string;
	specs: string;
	description: string;
	link: string;
}

// 设备类别类型，支持品牌和自定义类别
export type DeviceCategory = Record<string, Device[]> & {
	自定义?: Device[];
};

export const devicesData: DeviceCategory = {
	数码物品: [
		{
			name: "天选5 Pro",
			image: "/images/device/asus-tuf-gaming-f16-2024.webp",
			specs: "游戏本",
			description: "日常学习与开发使用的电脑。",
			link: "https://www.asus.com.cn/laptops/for-gaming/tuf-gaming/asus-tuf-gaming-f16-2024/",
		},
		{
			name: "vivo X100s",
			image: "/images/device/vivo-x100s.webp",
			specs: "影像手机",
			description: "记录日常与旅行的随身相机。",
			link: "https://www.vivo.com.cn/vivo/x100s/",
		},
	],
};
