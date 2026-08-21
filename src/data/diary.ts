// 日记数据配置
// 用于管理日记页面的数据

export interface DiaryItem {
	id: number;
	title?: string;
	content: string;
	date: string;
	images?: string[];
	location?: string;
	mood?: string;
	tags?: string[];
}

// 杂谈数据
const diaryData: DiaryItem[] = [
	{
		id: 1,
		title: "夏日、蓝天与《鸟之诗》",
		content: `那是高考结束后的夏天，也是自上学以来，我拥有过的最长的一个假期。

一直以来的不安，和那个始终追赶着的目标——“高考”，终于从我的生活里退场了。像一件坚持了很久的事终于画上句号，心里忽然空出了一大片地方。什么都不必急着去做，只想像孩童一样，漫无目的地探索眼前的世界。

炎炎夏日，我独自在家乡的小县城里随心散步，顺手买了一杯蜜雪冰城的柠檬水。天空蓝得透彻，云白得纯粹。我分不清，究竟是白云衬出了蓝天的蓝，还是蓝天映亮了白云的白。

我慢悠悠地往家走，想着回去后可以在浴缸里舒舒服服地泡个澡。走过桥时，我忽然发现，河岸两旁的草竟是那样青绿；身边擦肩而过的每一个人，似乎也都和蔼可亲。眼前的风景宽阔而澄澈，整个小城都显得悠闲自得——如蓝天，也如白云。

回到房间，我听起了《鸟之诗》。

“那鸟儿还未能自如飞翔，
但终有一日会穿破清风。”

歌声空灵地铺展开来。听着听着，我仿佛也生出了一双羽翼，像鸟儿一样乘着风，自由地飞向远方。

那一天，是我记忆里最自由、最悠闲的一天。从那以后，我便希望自己也能像鸟儿一样——空灵，自由。`,
		date: "2026-08-10T00:00:00+08:00",
		location: "家乡的小县城",
		mood: "自由、悠闲",
		tags: ["随笔", "夏日", "回忆", "音乐"],
	},
];

// 获取日记列表（按时间倒序）
export const getDiaryList = (limit?: number) => {
	const sortedData = [...diaryData].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	if (limit && limit > 0) {
		return sortedData.slice(0, limit);
	}

	return sortedData;
};

// 获取所有标签
export const getAllTags = () => {
	const tags = new Set<string>();
	for (const item of diaryData) {
		if (item.tags) {
			for (const tag of item.tags) {
				tags.add(tag);
			}
		}
	}
	return Array.from(tags).sort();
};
