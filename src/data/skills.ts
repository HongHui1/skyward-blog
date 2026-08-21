// Skill data configuration file
// Used to manage data for the skill display page

export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string; // Iconify icon name
	category:
		| "frontend"
		| "backend"
		| "database"
		| "tools"
		| "other"
		| "language"
		| "study";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience?: {
		years: number;
		months: number;
	};
	projects?: string[];
	certifications?: string[];
	color?: string;
}

export const skillsData: Skill[] = [
	{
		id: "c",
		name: "C",
		description: "学过基础语法、指针和简单的数据结构，仍在继续打基础。",
		icon: "simple-icons:c",
		category: "language",
		level: "beginner",
		color: "#A8B9CC",
	},
	{
		id: "cpp",
		name: "C++",
		description: "学过基础语法、面向对象和 STL 的基本使用。",
		icon: "simple-icons:cplusplus",
		category: "language",
		level: "beginner",
		color: "#00599C",
	},
	{
		id: "rust",
		name: "Rust",
		description: "刚开始接触所有权、借用和类型系统。",
		icon: "simple-icons:rust",
		category: "language",
		level: "beginner",
		color: "#CE422B",
	},
	{
		id: "java",
		name: "Java",
		description: "学过基础语法与面向对象，能写一些简单程序。",
		icon: "simple-icons:openjdk",
		category: "language",
		level: "beginner",
		color: "#E76F00",
	},
	{
		id: "html",
		name: "HTML",
		description: "能完成基础页面结构和常见内容排版。",
		icon: "simple-icons:html5",
		category: "frontend",
		level: "beginner",
		color: "#E34F26",
	},
	{
		id: "css",
		name: "CSS",
		description: "会使用基础选择器、盒模型和简单的响应式布局。",
		icon: "simple-icons:css",
		category: "frontend",
		level: "beginner",
		color: "#1572B6",
	},
	{
		id: "javascript",
		name: "JavaScript",
		description: "了解基础语法、DOM 操作和简单的页面交互。",
		icon: "simple-icons:javascript",
		category: "frontend",
		level: "beginner",
		color: "#F7DF1E",
	},
	{
		id: "cs-408",
		name: "计算机考研 408",
		description:
			"刚开始系统学习数据结构、计算机组成原理、操作系统和计算机网络。",
		icon: "material-symbols:menu-book",
		category: "study",
		level: "beginner",
		color: "#7C3AED",
	},
];
