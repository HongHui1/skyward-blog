/**
 * SkyCity · Genesis 交互升级层
 *
 * 能力（全部渐进增强）：
 *  - 光标柔光晕（仅 full 模式：精确指针 + 未开启减少动态）
 *  - 卡片聚光高亮（跟随鼠标的边缘流光）
 *  - 磁吸按钮（导航 / 快捷 dock 轻微跟随鼠标）
 *  - 点击涟漪（按钮类元素）
 *  - 卡片滚动级联入场
 *
 * 结构仿照 motion-system：单例 + Swup 页面切换后 refresh 重绑。
 */

type GenesisConfig = {
	enable: boolean;
	cursorAura: boolean;
	cardSpotlight: boolean;
	magneticButtons: boolean;
	ripple: boolean;
	starfield: boolean;
	cascadeReveal: boolean;
};

const RIPPLE_TARGETS = [
	".btn-card",
	".btn-plain",
	".btn-regular",
	".dropdown-item",
	".sky-dock__action",
].join(", ");

const MAGNETIC_TARGETS = [
	"#navbar .btn-plain",
	".sky-nav-item > a",
	".sky-nav-item > button",
].join(", ");

const CASCADE_SELECTORS = [
	".post-card-item",
	"widget-layout",
	".card-base",
].join(", ");

/* Konami 秘技：↑↑↓↓←→←→BA */
const KONAMI_CODE = [
	"arrowup",
	"arrowup",
	"arrowdown",
	"arrowdown",
	"arrowleft",
	"arrowright",
	"arrowleft",
	"arrowright",
	"b",
	"a",
];

/* 街机纸屑彩虹盘 */
const CONFETTI_PALETTE = [
	"oklch(0.75 0.2 0)",
	"oklch(0.8 0.18 60)",
	"oklch(0.85 0.18 110)",
	"oklch(0.8 0.16 170)",
	"oklch(0.75 0.16 230)",
	"oklch(0.7 0.22 300)",
	"oklch(0.75 0.2 330)",
];

const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

class GenesisInteractionSystem {
	private initialized = false;
	private config: GenesisConfig = {
		enable: true,
		cursorAura: true,
		cardSpotlight: true,
		magneticButtons: true,
		ripple: true,
		starfield: true,
		cascadeReveal: true,
	};

	private pageController: AbortController | null = null;
	private observers: IntersectionObserver[] = [];

	private dot: HTMLElement | null = null;
	private cursorVisible = false;
	private cursorFrame = 0;
	private pointerTarget = { x: 0, y: 0 };

	/* 粒子光效画布 */
	private particleCanvas: HTMLCanvasElement | null = null;
	private particleCtx: CanvasRenderingContext2D | null = null;
	private particles: Array<{
		x: number;
		y: number;
		vx: number;
		vy: number;
		life: number;
		maxLife: number;
		size: number;
		star: boolean;
		phase: number;
		kind: "dot" | "confetti";
		rot: number;
		vrot: number;
		color: string;
	}> = [];
	private palette: string[] = [];
	private lastSpawnPoint = { x: 0, y: 0 };
	private lastSpawnTime = 0;
	private lastFrameTime = 0;
	private scrollFrame = 0;

	/* Konami 秘技与纸屑雨 */
	private konamiProgress = 0;
	private confettiUntil = 0;
	private toastTimer = 0;

	private readonly reducedQuery = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	);

	init(): void {
		if (this.initialized) return;
		this.initialized = true;
		document.addEventListener("swup:page:view", this.handlePageView);
		this.readConfig();
		this.syncStarfield();
		this.refresh();
	}

	private readonly handlePageView = (): void => {
		this.refresh();
	};

	private readConfig(): void {
		const carrier = document.getElementById("config-carrier");
		const flag = (name: string, fallback: boolean): boolean => {
			const raw = carrier?.dataset[name];
			if (raw === "true") return true;
			if (raw === "false") return false;
			return fallback;
		};
		this.config = {
			enable: flag("genesisEnabled", true),
			cursorAura: flag("genesisCursorAura", true),
			cardSpotlight: flag("genesisSpotlight", true),
			magneticButtons: flag("genesisMagnetic", true),
			ripple: flag("genesisRipple", true),
			starfield: flag("genesisStarfield", true),
			cascadeReveal: flag("genesisCascade", true),
		};
	}

	refresh(): void {
		this.cleanupPage();
		const body = document.body;
		body.dataset.genesisSpotlight = String(this.config.enable && this.config.cardSpotlight);
		body.dataset.genesisCascade = String(this.config.enable && this.config.cascadeReveal);

		this.pageController = new AbortController();
		const signal = this.pageController.signal;

		if (this.config.enable) {
			this.bindScrollMetrics(signal);
		}
		if (this.config.enable && this.config.cursorAura) {
			this.bindCursor(signal);
		}
		if (this.config.enable && this.config.cardSpotlight) {
			this.bindSpotlight(signal);
		}
		if (this.config.enable && this.config.magneticButtons) {
			this.bindMagnetic(signal);
		}
		if (this.config.enable) {
			this.bindDockMagnify(signal);
			this.bindKonami(signal);
			this.bindTitleEgg(signal);
			this.bindTitleReveal();
			this.bindRocket(signal);
			this.bindShortcuts(signal);
		}
		if (this.config.enable && this.config.ripple) {
			this.bindRipple(signal);
		}
		if (this.config.enable && this.config.cascadeReveal) {
			this.bindCascade();
		}
	}

	cleanupPage(): void {
		this.pageController?.abort();
		this.pageController = null;
		this.observers.forEach((observer) => observer.disconnect());
		this.observers = [];
	}

	/* ------------------------------------------------------------------
	 * 滚动指标：返回顶部进度环 + 大气层视差
	 * ------------------------------------------------------------------ */

	private bindScrollMetrics(signal: AbortSignal): void {
		const render = () => {
			this.scrollFrame = 0;
			const root = document.documentElement;
			const range = Math.max(
				root.scrollHeight - window.innerHeight,
				1,
			);
			const progress = Math.min(
				Math.max(window.scrollY / range, 0),
				1,
			);
			root.style.setProperty(
				"--genesis-scroll-progress",
				progress.toFixed(4),
			);
			// 云雾/极光以约 6% 速度反向漂移，制造深度
			root.style.setProperty(
				"--sky-atmo-y",
				`${(-window.scrollY * 0.06).toFixed(1)}px`,
			);
		};
		window.addEventListener(
			"scroll",
			() => {
				if (this.scrollFrame) return;
				this.scrollFrame = requestAnimationFrame(render);
			},
			{ signal, passive: true },
		);
		render();
	}

	/* ------------------------------------------------------------------
	 * 光标柔光晕
	 * ------------------------------------------------------------------ */

	/** 星幕由 Layout 渲染；这里按配置决定保留或移除（关闭时不留空层）。 */
	private syncStarfield(): void {
		const existing = document.getElementById("sky-starfield");
		if (this.config.starfield) {
			if (!existing) {
				const starfield = document.createElement("div");
				starfield.id = "sky-starfield";
				starfield.setAttribute("aria-hidden", "true");
				document.body.prepend(starfield);
			}
		} else {
			existing?.remove();
		}
	}

	/** 光标元素：dot 由 Layout 渲染，粒子画布按需创建。 */
	private ensureCursorElements(): void {
		this.dot = document.getElementById("genesis-cursor-dot");
	}

	private buildPalette(): void {
		const primary = getComputedStyle(document.documentElement)
			.getPropertyValue("--primary")
			.trim();
		this.palette = [
			primary || "oklch(0.7 0.14 240)",
			"rgba(255, 255, 255, 0.9)",
			primary || "oklch(0.7 0.14 240)",
			"rgba(255, 255, 255, 0.55)",
		];
	}

	private ensureParticleCanvas(): void {
		if (this.particleCanvas) return;
		const canvas = document.createElement("canvas");
		canvas.id = "genesis-particles";
		canvas.setAttribute("aria-hidden", "true");
		document.body.appendChild(canvas);
		this.particleCanvas = canvas;
		this.particleCtx = canvas.getContext("2d");
		this.buildPalette();

		const resize = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(window.innerWidth * dpr);
			canvas.height = Math.round(window.innerHeight * dpr);
			canvas.style.width = `${window.innerWidth}px`;
			canvas.style.height = `${window.innerHeight}px`;
			this.particleCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();
		window.addEventListener("resize", resize, { passive: true });
	}

	/* 沿指针路径按移动速度喷洒粒子 */
	private emitAlongPath(now: number): void {
		if (!this.particles || this.particles.length > 90) return;
		const dx = this.pointerTarget.x - this.lastSpawnPoint.x;
		const dy = this.pointerTarget.y - this.lastSpawnPoint.y;
		const dist = Math.hypot(dx, dy);
		const elapsed = now - this.lastSpawnTime;

		// 静止时低频散落微尘，保持画面生命感
		if (dist < 2) {
			if (elapsed > 320 && this.particles.length < 30) {
				this.spawnParticle(
					this.pointerTarget.x + (Math.random() - 0.5) * 14,
					this.pointerTarget.y + (Math.random() - 0.5) * 14,
					0.12,
				);
				this.lastSpawnTime = now;
			}
			return;
		}

		const step = Math.max(6, 22 - Math.min(dist, 60) * 0.2);
		const count = Math.min(Math.ceil(dist / step), 4);
		for (let i = 0; i < count; i += 1) {
			const t = (i + 1) / count;
			this.spawnParticle(
				this.lastSpawnPoint.x + dx * t,
				this.lastSpawnPoint.y + dy * t,
				Math.min(dist / 40, 1),
			);
		}
		this.lastSpawnPoint.x = this.pointerTarget.x;
		this.lastSpawnPoint.y = this.pointerTarget.y;
		this.lastSpawnTime = now;
	}

	private spawnParticle(x: number, y: number, energy: number): void {
		if (this.particles.length >= 110) return;
		const angle = Math.random() * Math.PI * 2;
		const speed = 0.25 + Math.random() * (0.7 + energy * 1.5);
		this.particles.push({
			x,
			y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - 0.35 - energy * 0.5,
			life: 0,
			maxLife: 620 + Math.random() * 900,
			size: 0.9 + Math.random() * (1.8 + energy * 1.8),
			star: Math.random() < 0.16,
			phase: Math.random() * Math.PI * 2,
			kind: "dot",
			rot: 0,
			vrot: 0,
			color: this.palette[
				Math.floor(Math.random() * this.palette.length)
			],
		});
	}

	/** 点击/双击处的粒子爆发 */
	private burstAt(x: number, y: number, count: number, power = 1): void {
		for (let i = 0; i < count; i += 1) {
			if (this.particles.length >= 130) break;
			const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
			const speed = (1.1 + Math.random() * 2.1) * power;
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 0.4,
				life: 0,
				maxLife: 420 + Math.random() * 520,
				size: 1 + Math.random() * (1.6 + power),
				star: Math.random() < 0.3,
				phase: Math.random() * Math.PI * 2,
				kind: "dot",
				rot: 0,
				vrot: 0,
				color: this.palette[
					Math.floor(Math.random() * this.palette.length)
				],
			});
		}
	}

	/** 街机纸屑：从画面顶端飘落 */
	private spawnConfetti(): void {
		if (this.particles.length >= 190) return;
		this.particles.push({
			x: Math.random() * window.innerWidth,
			y: -12,
			vx: (Math.random() - 0.5) * 0.8,
			vy: 1.3 + Math.random() * 1.8,
			life: 0,
			maxLife: 3600 + Math.random() * 1800,
			size: 4 + Math.random() * 4,
			star: false,
			phase: Math.random() * Math.PI * 2,
			kind: "confetti",
			rot: Math.random() * Math.PI * 2,
			vrot: (Math.random() - 0.5) * 0.22,
			color:
				CONFETTI_PALETTE[
					Math.floor(Math.random() * CONFETTI_PALETTE.length)
				],
		});
	}

	/** 像素风格提示条（秘技触发等） */
	private showToast(text: string): void {
		let toast = document.getElementById("genesis-toast");
		if (!toast) {
			toast = document.createElement("div");
			toast.id = "genesis-toast";
			toast.setAttribute("aria-hidden", "true");
			document.body.appendChild(toast);
		}
		toast.textContent = text;
		toast.dataset.show = "true";
		window.clearTimeout(this.toastTimer);
		this.toastTimer = window.setTimeout(() => {
			toast.dataset.show = "false";
		}, 2200);
	}

	private readonly renderParticles = (now: number): void => {
		const ctx = this.particleCtx;
		if (!ctx || !this.particleCanvas) {
			this.cursorFrame = 0;
			return;
		}
		const delta = this.lastFrameTime
			? Math.min(now - this.lastFrameTime, 50)
			: 16.7;
		this.lastFrameTime = now;
		const w = window.innerWidth;
		const h = window.innerHeight;
		const dark = document.documentElement.classList.contains("dark");

		ctx.clearRect(0, 0, w, h);
		if (dark) ctx.globalCompositeOperation = "lighter";

		const keep: typeof this.particles = [];
		// 纸屑雨进行中：每帧从顶端补充
		if (this.confettiUntil > now) {
			for (let i = 0; i < 3; i += 1) this.spawnConfetti();
		}
		for (const p of this.particles) {
			p.life += delta;
			if (p.life >= p.maxLife) continue;

			if (p.kind === "confetti") {
				// 纸屑：左右飘摆下落，出屏即回收
				p.rot += p.vrot * (delta / 16.7);
				p.x += p.vx + Math.sin(p.life / 320 + p.phase) * 0.7;
				p.y += p.vy;
				if (p.y > h + 24) continue;
				const sway = 0.82 + 0.18 * Math.sin(p.phase + p.life / 260);
				ctx.save();
				ctx.globalAlpha = dark ? 0.95 : 0.85;
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rot);
				ctx.scale(1, sway);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.size / 2, -p.size * 0.32, p.size, p.size * 0.64);
				ctx.restore();
				keep.push(p);
				continue;
			}

			const t = p.life / p.maxLife;
			// 缓出漂浮 + 轻微闪烁
			p.x += p.vx * 0.972;
			p.y += p.vy * 0.972;
			p.vx *= 0.965;
			p.vy = p.vy * 0.965 - 0.006;
			const fade = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.82;
			const twinkle = 0.72 + 0.28 * Math.sin(p.phase + t * 9);
			const alpha = (dark ? 0.85 : 0.5) * fade * twinkle;
			const color = p.color;
			const size = p.size * (1 - t * 0.55);

			if (p.star && !dark) {
				ctx.strokeStyle = color;
				ctx.globalAlpha = alpha;
				ctx.lineWidth = 0.8;
				const r = size * 2.6;
				ctx.beginPath();
				ctx.moveTo(p.x - r, p.y);
				ctx.lineTo(p.x + r, p.y);
				ctx.moveTo(p.x, p.y - r);
				ctx.lineTo(p.x, p.y + r);
				ctx.stroke();
			} else {
				ctx.globalAlpha = alpha;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(p.x, p.y, Math.max(size, 0.4), 0, Math.PI * 2);
				ctx.fill();
				if (dark) {
					// 光晕：暗色下叠加柔光
					ctx.globalAlpha = alpha * 0.24;
					ctx.beginPath();
					ctx.arc(p.x, p.y, Math.max(size, 0.4) * 3.2, 0, Math.PI * 2);
					ctx.fill();
				}
			}
			keep.push(p);
		}
		ctx.globalAlpha = 1;
		if (dark) ctx.globalCompositeOperation = "source-over";
		this.particles = keep;

		// 有粒子时继续渲染，空闲自动停止省电
		if (this.particles.length > 0) {
			this.cursorFrame = requestAnimationFrame(this.renderParticles);
		} else {
			ctx.clearRect(0, 0, w, h);
			this.cursorFrame = 0;
		}
	};

	private scheduleCursorFrame = (): void => {
		if (this.cursorFrame) return;
		this.cursorFrame = requestAnimationFrame(this.renderParticles);
	};

	private bindCursor(signal: AbortSignal): void {
		this.ensureCursorElements();
		if (!this.dot) return;
		this.ensureParticleCanvas();
		const dot = this.dot;

		document.addEventListener(
			"pointermove",
			(event) => {
				this.pointerTarget.x = event.clientX;
				this.pointerTarget.y = event.clientY;
				if (!this.cursorVisible) {
					this.cursorVisible = true;
					dot.style.opacity = "1";
					// 首帧直接就位，避免从 (0,0) 飞入
					this.lastSpawnPoint.x = this.pointerTarget.x;
					this.lastSpawnPoint.y = this.pointerTarget.y;
				}
				dot.style.transform = `translate3d(${this.pointerTarget.x.toFixed(1)}px, ${this.pointerTarget.y.toFixed(1)}px, 0)`;
				// Hero 追光：光标在横幅内时点亮跟随光斑
				const banner = event.target instanceof Element
					? event.target.closest<HTMLElement>("#banner-wrapper")
					: null;
				if (banner) {
					const r = banner.getBoundingClientRect();
					banner.style.setProperty(
						"--genesis-hero-lx",
						`${(event.clientX - r.left).toFixed(0)}px`,
					);
					banner.style.setProperty(
						"--genesis-hero-ly",
						`${(event.clientY - r.top).toFixed(0)}px`,
					);
				}
				this.emitAlongPath(performance.now());
				this.scheduleCursorFrame();
			},
			{ signal, passive: true },
		);

		document.addEventListener(
			"pointerleave",
			() => {
				this.cursorVisible = false;
				dot.style.opacity = "0";
			},
			{ signal },
		);

		const setPressed = (pressed: string) => {
			dot.dataset.pressed = pressed;
		};
		document.addEventListener(
			"pointerdown",
			(event) => {
				setPressed("true");
				// 点击粒子爆发
				if (event.button === 0) {
					this.burstAt(event.clientX, event.clientY, 14, 1);
					this.scheduleCursorFrame();
				}
			},
			{ signal, passive: true },
		);
		document.addEventListener(
			"pointerup",
			() => setPressed("false"),
			{ signal, passive: true },
		);
		document.addEventListener(
			"dblclick",
			(event) => {
				this.burstAt(event.clientX, event.clientY, 26, 1.5);
				this.scheduleCursorFrame();
			},
			{ signal, passive: true },
		);
	}

	/* ------------------------------------------------------------------
	 * 返回顶部：火箭尾焰
	 * ------------------------------------------------------------------ */

	private bindRocket(signal: AbortSignal): void {
		document.addEventListener(
			"click",
			(event) => {
				const btn = event.target instanceof Element
					? event.target.closest<HTMLElement>(".sky-dock__top")
					: null;
				if (!btn) return;
				const r = btn.getBoundingClientRect();
				const cx = r.left + r.width / 2;
				const cy = r.top + r.height / 2;
				const before = this.particles.length;
				this.burstAt(cx, cy, 22, 1.3);
				// 尾焰偏置：让爆发粒子整体向上喷射
				for (const p of this.particles.slice(before)) {
					p.vy -= 2.1;
					p.vx *= 0.35;
				}
				this.scheduleCursorFrame();
			},
			{ signal, passive: true },
		);
	}

	/* ------------------------------------------------------------------
	 * 键盘快捷键：Ctrl/Cmd + K 唤起搜索
	 * ------------------------------------------------------------------ */

	private bindShortcuts(signal: AbortSignal): void {
		window.addEventListener(
			"keydown",
			(event) => {
				if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
				if (event.key.toLowerCase() !== "k") return;
				const target = event.target;
				const typing =
					target instanceof Element &&
					Boolean(target.closest("input, textarea, [contenteditable='true']"));
				if (typing) return;
				event.preventDefault();

				// 与 dock 的搜索动作保持同一逻辑
				if (window.matchMedia("(min-width: 1024px)").matches) {
					document.getElementById("search-input-desktop")?.focus();
				} else {
					const panel = document.getElementById("search-panel");
					const isOpening = panel?.classList.contains("float-panel-closed");
					panel?.classList.toggle("float-panel-closed");
					if (isOpening) {
					const focusSearch = () =>
						document
							.querySelector<HTMLElement>("#search-bar-inside input")
							?.focus({ preventScroll: true });
						focusSearch();
						window.setTimeout(focusSearch, 260);
					}
					if (isOpening && typeof window.loadPagefind === "function") {
						window.loadPagefind();
					}
				}
				this.showToast("✦ SEARCH");
			},
			{ signal },
		);
	}

	/* ------------------------------------------------------------------
	 * Dock 魔力放大（macOS dock 式）
	 * ------------------------------------------------------------------ */

	private bindDockMagnify(signal: AbortSignal): void {
		if (document.documentElement.dataset.skyMotion !== "full") return;
		document.querySelectorAll<HTMLElement>(".sky-dock").forEach((dock) => {
			const items = Array.from(
				dock.querySelectorAll<HTMLElement>(".sky-dock__action"),
			);
			if (!items.length) return;
			const vertical = dock.classList.contains("sky-dock--desktop");
			let frame = 0;
			let px = 0;
			const apply = () => {
				frame = 0;
				for (const item of items) {
					if (item.classList.contains("is-hidden")) continue;
					const r = item.getBoundingClientRect();
					const center = vertical ? r.top + r.height / 2 : r.left + r.width / 2;
					const dist = Math.abs(px - center);
					const scale = 1 + Math.max(0, 1 - dist / 110) * 0.3;
					item.style.transform = `scale(${scale.toFixed(3)})`;
				}
			};
			dock.addEventListener(
				"pointermove",
				(event) => {
					px = vertical ? event.clientY : event.clientX;
					if (!frame) frame = requestAnimationFrame(apply);
				},
				{ signal, passive: true },
			);
			dock.addEventListener(
				"pointerleave",
				() => {
					if (frame) {
						cancelAnimationFrame(frame);
						frame = 0;
					}
					for (const item of items) item.style.transform = "";
				},
				{ signal },
			);
		});
	}

	/* ------------------------------------------------------------------
	 * Konami 秘技 → 街机纸屑雨
	 * ------------------------------------------------------------------ */

	private bindKonami(signal: AbortSignal): void {
		window.addEventListener(
			"keydown",
			(event) => {
				const target = event.target;
				const typing =
					target instanceof Element &&
					Boolean(
						target.closest("input, textarea, select, [contenteditable='true']"),
					);
				if (typing) {
					this.konamiProgress = 0;
					return;
				}
				const key = event.key.toLowerCase();
				if (key === KONAMI_CODE[this.konamiProgress]) {
					this.konamiProgress += 1;
					if (this.konamiProgress >= KONAMI_CODE.length) {
						this.konamiProgress = 0;
						this.confettiUntil = performance.now() + 6500;
						this.showToast("★ ARCADE MODE ★");
						this.scheduleCursorFrame();
					}
				} else {
					this.konamiProgress = key === KONAMI_CODE[0] ? 1 : 0;
				}
			},
			{ signal },
		);
	}

	/* ------------------------------------------------------------------
	 * 节标题逐字点亮
	 * ------------------------------------------------------------------ */

	private bindTitleReveal(): void {
		if (document.documentElement.dataset.skyMotion === "reduced") return;
		const titles = document.querySelectorAll<HTMLElement>(".ew-title-wrap h2");
		titles.forEach((title) => {
			if (title.dataset.ewSplit === "true") return;
			const text = (title.textContent ?? "").trim();
			if (!text) return;
			title.dataset.ewSplit = "true";
			title.setAttribute("aria-label", text);
			const chars = document.createDocumentFragment();
			[...text].forEach((ch, i) => {
				const span = document.createElement("span");
				span.className = "ew-char";
				span.style.setProperty("--ci", String(i));
				span.setAttribute("aria-hidden", "true");
				span.textContent = ch;
				chars.appendChild(span);
			});
			title.textContent = "";
			title.appendChild(chars);

			const wrap = title.closest(".ew-title-wrap") ?? title;
			const observer = new IntersectionObserver(
				([entry]) => {
					if (!entry?.isIntersecting) return;
					wrap.classList.add("ew-lit");
					observer.disconnect();
				},
				{ threshold: 0.35 },
			);
			observer.observe(title);
			this.observers.push(observer);
		});
	}

	/* ------------------------------------------------------------------
	 * 标签页隐藏彩蛋
	 * ------------------------------------------------------------------ */

	private bindTitleEgg(signal: AbortSignal): void {
		let rememberedTitle = document.title;
		document.addEventListener(
			"visibilitychange",
			() => {
				if (document.hidden) {
					rememberedTitle = document.title;
					document.title = "✦ 别走呀，SkyCity 在等你回来…";
				} else {
					document.title = rememberedTitle;
				}
			},
			{ signal },
		);
	}


	/* ------------------------------------------------------------------
	 * 卡片聚光高亮
	 * ------------------------------------------------------------------ */

	private bindSpotlight(signal: AbortSignal): void {
		let activeCard: HTMLElement | null = null;
		let frame = 0;
		let pendingX = 50;
		let pendingY = 50;

		const render = () => {
			frame = 0;
			if (!activeCard) return;
			activeCard.style.setProperty("--genesis-spot-x", `${pendingX.toFixed(2)}%`);
			activeCard.style.setProperty("--genesis-spot-y", `${pendingY.toFixed(2)}%`);
			// 封面 3D 倾斜：光标位置驱动封面图微转
			activeCard.style.setProperty(
				"--genesis-cover-rx",
				`${((50 - pendingY) / 50 * 3).toFixed(2)}deg`,
			);
			activeCard.style.setProperty(
				"--genesis-cover-ry",
				`${((pendingX - 50) / 50 * 4).toFixed(2)}deg`,
			);
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(render);
		};

		document.addEventListener(
			"pointerover",
			(event) => {
				const target = event.target instanceof Element ? event.target : null;
				const card = target?.closest<HTMLElement>(".card-base") ?? null;
				if (card === activeCard) return;
				activeCard?.removeAttribute("data-genesis-spot");
				activeCard = card;
				card?.setAttribute("data-genesis-spot", "on");
			},
			{ signal, passive: true },
		);

		document.addEventListener(
			"pointermove",
			(event) => {
				if (!activeCard) return;
				const rect = activeCard.getBoundingClientRect();
				pendingX = clamp(((event.clientX - rect.left) / rect.width) * 100, -20, 120);
				pendingY = clamp(((event.clientY - rect.top) / rect.height) * 100, -20, 120);
				schedule();
			},
			{ signal, passive: true },
		);
	}

	/* ------------------------------------------------------------------
	 * 磁吸按钮
	 * ------------------------------------------------------------------ */

	private bindMagnetic(signal: AbortSignal): void {
		document.querySelectorAll<HTMLElement>(MAGNETIC_TARGETS).forEach((el) => {
			el.classList.add("genesis-magnetic");

			el.addEventListener(
				"pointermove",
				(event) => {
					if (document.documentElement.dataset.skyMotion !== "full") return;
					const rect = el.getBoundingClientRect();
					const dx = event.clientX - (rect.left + rect.width / 2);
					const dy = event.clientY - (rect.top + rect.height / 2);
					const strength = el.classList.contains("sky-dock__action") ? 0.32 : 0.18;
					const limit = el.classList.contains("sky-dock__action") ? 4 : 2.5;
					const x = clamp(dx * strength, -limit, limit);
					const y = clamp(dy * strength, -limit, limit);
					el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
				},
				{ signal, passive: true },
			);

			el.addEventListener(
				"pointerleave",
				() => {
					el.style.transform = "";
				},
				{ signal },
			);
		});
	}

	/* ------------------------------------------------------------------
	 * 点击涟漪
	 * ------------------------------------------------------------------ */

	private bindRipple(signal: AbortSignal): void {
		document.addEventListener(
			"pointerdown",
			(event) => {
				if (this.reducedQuery.matches) return;
				if (event.button !== 0) return;
				const target = event.target instanceof Element ? event.target : null;
				const host = target?.closest<HTMLElement>(RIPPLE_TARGETS);
				if (!host) return;

				const rect = host.getBoundingClientRect();
				const size = Math.max(rect.width, rect.height) * 2.2;
				const ripple = document.createElement("span");
				ripple.className = "genesis-ripple";
				ripple.style.width = ripple.style.height = `${size.toFixed(0)}px`;
				ripple.style.left = `${(event.clientX - rect.left - size / 2).toFixed(0)}px`;
				ripple.style.top = `${(event.clientY - rect.top - size / 2).toFixed(0)}px`;
				host.classList.add("genesis-ripple-host");
				host.appendChild(ripple);
				ripple.addEventListener("animationend", () => ripple.remove(), {
					once: true,
				});
			},
			{ signal, passive: true },
		);
	}

	/* ------------------------------------------------------------------
	 * 卡片级联入场
	 * ------------------------------------------------------------------ */

	private bindCascade(): void {
		if (this.reducedQuery.matches) return;
		if (document.documentElement.dataset.skyMotion === "reduced") return;

		const candidates = Array.from(
			document.querySelectorAll<HTMLElement>(
				`${CASCADE_SELECTORS}, .genesis-cascade`,
			),
		).filter((el) => {
			// 已完成入场的跳过（含重复 refresh）
			if (
				el.classList.contains("genesis-cascade") &&
				el.classList.contains("genesis-cascade-visible")
			) {
				return false;
			}
			// 悬浮面板不走级联入场，避免展开时机不可控
			if (el.closest(".float-panel, #search-panel, .expanded-player")) return false;
			// 嵌套的容器只保留最外层（如 post-card-item 内的 card-base）
			return !el.parentElement?.closest(CASCADE_SELECTORS);
		});

		if (!candidates.length) return;

		let batchIndex = 0;
		let batchReset = 0;
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					const el = entry.target as HTMLElement;
					observer.unobserve(el);
					// 同一批进入的元素依次错开 55ms，上限 8 个
					const now = performance.now();
					if (now > batchReset) {
						batchIndex = 0;
						batchReset = now + 400;
					}
					el.style.setProperty(
						"--genesis-cascade-delay",
						`${Math.min(batchIndex, 7) * 55}ms`,
					);
					batchIndex += 1;
					el.classList.add("genesis-cascade", "genesis-cascade-visible");
				});
			},
			{ rootMargin: "0px 0px -4% 0px", threshold: 0.06 },
		);

		candidates.forEach((el) => {
			// 首屏以上的元素直接可见，避免白屏闪烁
			const rect = el.getBoundingClientRect();
			if (rect.top < window.innerHeight * 0.9) {
				el.classList.add("genesis-cascade", "genesis-cascade-visible");
				return;
			}
			observer.observe(el);
		});
		this.observers.push(observer);
	}
}

let genesisSystem: GenesisInteractionSystem | null = null;

export function initGenesisInteractions(): void {
	if (!genesisSystem) genesisSystem = new GenesisInteractionSystem();
	genesisSystem.init();
}
