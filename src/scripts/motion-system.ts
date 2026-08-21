import { withoutBase } from "../utils/base-path";

type MotionMode = "full" | "quiet" | "reduced";

type NavigatorWithPerformanceHints = Navigator & {
	connection?: {
		saveData?: boolean;
	};
	deviceMemory?: number;
};

type ViewTransitionLike = {
	finished: Promise<void>;
};

type DocumentWithViewTransition = Document & {
	startViewTransition?: (
		update: () => void | Promise<void>,
	) => ViewTransitionLike;
};

const clamp = (value: number, min = 0, max = 1): number =>
	Math.min(max, Math.max(min, value));

const normalizePath = (value: string): string => {
	try {
		const pathname = withoutBase(new URL(value, window.location.href).pathname);
		return pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
	} catch {
		return value;
	}
};

class SkyCityMotionSystem {
	private initialized = false;
	private pageController: AbortController | null = null;
	private observers: IntersectionObserver[] = [];
	private heroFrame = 0;
	private scrollFrame = 0;
	private resizeTimer = 0;
	private routeTimer = 0;
	private sharedTransitionResolve: (() => void) | null = null;
	private sharedTransitionTimer = 0;
	private sharedSourceElements: HTMLElement[] = [];
	private sharedTargetElements: HTMLElement[] = [];
	private heroInView = false;
	private pointerTarget = { x: 0, y: 0 };
	private pointerCurrent = { x: 0, y: 0 };
	private readonly reducedQuery = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	);
	private readonly finePointerQuery = window.matchMedia(
		"(hover: hover) and (pointer: fine)",
	);

	init(): void {
		if (this.initialized) return;
		this.initialized = true;

		this.reducedQuery.addEventListener("change", this.handleCapabilityChange);
		this.finePointerQuery.addEventListener(
			"change",
			this.handleCapabilityChange,
		);
		document.addEventListener("visibilitychange", this.handleVisibilityChange);
		document.addEventListener("swup:page:view", this.handleSwupPageView);
		window.addEventListener("resize", this.handleResize, { passive: true });

		this.refresh();
	}

	private readonly handleSwupPageView = (): void => {
		this.contentReplaced();
		this.transitionEnd();
	};

	refresh(): void {
		this.cleanupPage();
		const mode = this.getMode();
		const isHome = this.isHomePage();
		const root = document.documentElement;

		root.dataset.skyMotion = mode;
		root.dataset.skyPage = isHome ? "home" : "inner";
		root.classList.toggle("sky-motion-paused", document.hidden);

		this.pageController = new AbortController();
		this.initNavigationIndicator();
		this.initPageReveals(mode);
		this.initSharedPageTransitions(mode);

		if (isHome) {
			this.initSkyAtlas(mode);
			this.initHero(mode);
			this.initTravelCardTilt(mode);
		} else {
			this.resetHeroVariables();
		}
	}

	transitionStart(): void {
		window.clearTimeout(this.routeTimer);
		const root = document.documentElement;
		root.classList.remove("sky-route-entering");
		root.classList.add("sky-route-leaving");
	}

	contentReplaced(): void {
		const root = document.documentElement;
		root.classList.remove("sky-route-leaving");
		root.classList.add("sky-route-entering");
		this.prepareSharedTransitionTarget();
		this.sharedTransitionResolve?.();
		this.sharedTransitionResolve = null;
		this.refresh();
	}

	transitionEnd(): void {
		window.clearTimeout(this.routeTimer);
		this.routeTimer = window.setTimeout(() => {
			document.documentElement.classList.remove(
				"sky-route-leaving",
				"sky-route-entering",
			);
		}, 320);
	}

	private readonly handleCapabilityChange = (): void => {
		this.refresh();
	};

	private readonly handleVisibilityChange = (): void => {
		const paused = document.hidden;
		document.documentElement.classList.toggle("sky-motion-paused", paused);
		if (paused) {
			this.cancelAnimationFrames();
		} else if (this.isHomePage()) {
			this.scheduleHeroFrame();
			this.scheduleScrollFrame();
		}
	};

	private readonly handleResize = (): void => {
		window.clearTimeout(this.resizeTimer);
		this.resizeTimer = window.setTimeout(() => this.refresh(), 120);
	};

	private getMode(): MotionMode {
		if (this.reducedQuery.matches) return "reduced";

		const nav = navigator as NavigatorWithPerformanceHints;
		const lowPerformance =
			nav.connection?.saveData === true ||
			(typeof nav.hardwareConcurrency === "number" &&
				nav.hardwareConcurrency <= 4) ||
			(typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4);

		if (!this.finePointerQuery.matches || lowPerformance) return "quiet";
		return "full";
	}

	private isHomePage(): boolean {
		const pageData = document.getElementById("page-overlay-data");
		if (pageData?.dataset.isHome) {
			return pageData.dataset.isHome === "true";
		}
		return normalizePath(window.location.pathname) === "/";
	}

	private cleanupPage(): void {
		this.pageController?.abort();
		this.pageController = null;
		this.observers.forEach((observer) => observer.disconnect());
		this.observers = [];
		this.heroInView = false;
		this.cancelAnimationFrames();
	}

	private cancelAnimationFrames(): void {
		if (this.heroFrame) cancelAnimationFrame(this.heroFrame);
		if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
		this.heroFrame = 0;
		this.scrollFrame = 0;
	}

	private initHero(mode: MotionMode): void {
		const banner = document.getElementById("banner-wrapper");
		const cue = banner?.querySelector<HTMLElement>(".home-scroll-cue");
		const signal = this.pageController?.signal;
		if (!banner || !signal) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				this.heroInView = entry?.isIntersecting === true;
				banner.classList.toggle("sky-hero-interactive", this.heroInView);
				if (!this.heroInView) {
					this.pointerTarget = { x: 0, y: 0 };
					this.scheduleHeroFrame();
				}
			},
			{ threshold: 0.04 },
		);
		observer.observe(banner);
		this.observers.push(observer);

		if (mode === "full") {
			banner.addEventListener(
				"pointermove",
				(event) => {
					if (!this.heroInView || document.hidden) return;
					const rect = banner.getBoundingClientRect();
					this.pointerTarget.x = clamp(
						((event.clientX - rect.left) / rect.width - 0.5) * 2,
						-1,
						1,
					);
					this.pointerTarget.y = clamp(
						((event.clientY - rect.top) / rect.height - 0.5) * 2,
						-1,
						1,
					);
					this.scheduleHeroFrame();
				},
				{ signal, passive: true },
			);
			banner.addEventListener(
				"pointerleave",
				() => {
					this.pointerTarget = { x: 0, y: 0 };
					this.scheduleHeroFrame();
				},
				{ signal },
			);
		}

		banner.addEventListener(
			"wheel",
			() => {
				if (!cue || cue.dataset.engaged === "true") return;
				cue.dataset.engaged = "true";
			},
			{ signal, passive: true },
		);
		window.addEventListener("scroll", this.scheduleScrollFrame, {
			signal,
			passive: true,
		});

		this.scheduleHeroFrame();
		this.scheduleScrollFrame();
	}

	private scheduleHeroFrame = (): void => {
		if (this.heroFrame || document.hidden) return;
		this.heroFrame = requestAnimationFrame(this.updateHeroPointer);
	};

	private readonly updateHeroPointer = (): void => {
		this.heroFrame = 0;
		const mode = document.documentElement.dataset.skyMotion;
		const factor = mode === "full" && this.heroInView ? 0.16 : 0.24;
		this.pointerCurrent.x +=
			(this.pointerTarget.x - this.pointerCurrent.x) * factor;
		this.pointerCurrent.y +=
			(this.pointerTarget.y - this.pointerCurrent.y) * factor;

		const { x, y } = this.pointerCurrent;
		const root = document.documentElement;
		root.style.setProperty("--sky-hero-image-x", `${(x * 8).toFixed(2)}px`);
		root.style.setProperty("--sky-hero-image-y", `${(y * 5).toFixed(2)}px`);
		root.style.setProperty("--sky-hero-title-x", `${(x * -4).toFixed(2)}px`);
		root.style.setProperty("--sky-hero-title-y", `${(y * -3).toFixed(2)}px`);
		root.style.setProperty("--sky-hero-cue-x", `${(x * 3).toFixed(2)}px`);

		if (
			Math.abs(this.pointerTarget.x - x) > 0.002 ||
			Math.abs(this.pointerTarget.y - y) > 0.002
		) {
			this.scheduleHeroFrame();
		}
	};

	private scheduleScrollFrame = (): void => {
		if (this.scrollFrame || document.hidden) return;
		this.scrollFrame = requestAnimationFrame(this.updateHeroScroll);
	};

	private readonly updateHeroScroll = (): void => {
		this.scrollFrame = 0;
		const root = document.documentElement;
		const progress = clamp(window.scrollY / Math.max(window.innerHeight * 0.88, 1));
		root.style.setProperty("--sky-home-progress", progress.toFixed(4));
		root.style.setProperty(
			"--sky-hero-scroll-image-y",
			`${(progress * 30).toFixed(2)}px`,
		);
		root.style.setProperty(
			"--sky-hero-scroll-title-y",
			`${(progress * -42).toFixed(2)}px`,
		);
		root.style.setProperty(
			"--sky-hero-scroll-subtitle-y",
			`${(progress * -26).toFixed(2)}px`,
		);
		root.style.setProperty(
			"--sky-hero-fold",
			(progress * progress).toFixed(4),
		);
		this.updateAtlasState();

		const cue = document.querySelector<HTMLElement>(".home-scroll-cue");
		if (cue) cue.dataset.hidden = String(progress > 0.075);
	};

	private resetHeroVariables(): void {
		this.pointerTarget = { x: 0, y: 0 };
		this.pointerCurrent = { x: 0, y: 0 };
		const root = document.documentElement;
		[
			"--sky-hero-image-x",
			"--sky-hero-image-y",
			"--sky-hero-title-x",
			"--sky-hero-title-y",
			"--sky-hero-cue-x",
			"--sky-home-progress",
			"--sky-hero-scroll-image-y",
			"--sky-hero-scroll-title-y",
			"--sky-hero-scroll-subtitle-y",
			"--sky-hero-fold",
			"--sky-atlas-progress",
		].forEach((name) => root.style.removeProperty(name));
	}

	private initSkyAtlas(mode: MotionMode): void {
		const atlas = document.querySelector<HTMLElement>("[data-sky-atlas]");
		const links = atlas
			? Array.from(
					atlas.querySelectorAll<HTMLAnchorElement>("[data-sky-atlas-link]"),
				)
			: [];
		const signal = this.pageController?.signal;
		if (!atlas || !links.length || !signal) return;

		links.forEach((link, index) => {
			link.addEventListener(
				"click",
				(event) => {
					const selector = link.getAttribute("href");
					const target = selector ? document.querySelector(selector) : null;
					if (!target) return;
					event.preventDefault();
					if (index === 0) {
						window.scrollTo({
							top: 0,
							behavior: mode === "reduced" ? "auto" : "smooth",
						});
						return;
					}
					target.scrollIntoView({
						behavior: mode === "reduced" ? "auto" : "smooth",
						block: "start",
					});
				},
				{ signal },
			);

			if (mode !== "full") return;
			link.addEventListener(
				"pointermove",
				(event) => {
					const rect = link.getBoundingClientRect();
					const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
					const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
					link.style.setProperty("--sky-atlas-x", `${((x - 0.5) * 7).toFixed(2)}px`);
					link.style.setProperty("--sky-atlas-y", `${((y - 0.5) * 5).toFixed(2)}px`);
				},
				{ signal, passive: true },
			);
			link.addEventListener(
				"pointerleave",
				() => {
					link.style.removeProperty("--sky-atlas-x");
					link.style.removeProperty("--sky-atlas-y");
				},
				{ signal },
			);
		});

		this.updateAtlasState();
	}

	private updateAtlasState(): void {
		const atlas = document.querySelector<HTMLElement>("[data-sky-atlas]");
		if (!atlas) return;

		const links = Array.from(
			atlas.querySelectorAll<HTMLAnchorElement>("[data-sky-atlas-link]"),
		);
		const pageRange = Math.max(
			document.documentElement.scrollHeight - window.innerHeight,
			1,
		);
		const progress = clamp(window.scrollY / pageRange);
		document.documentElement.style.setProperty(
			"--sky-atlas-progress",
			progress.toFixed(4),
		);
		const output = atlas.querySelector<HTMLOutputElement>(
			"[data-sky-atlas-percent]",
		);
		if (output) output.value = String(Math.round(progress * 100)).padStart(3, "0");

		let activeIndex = 0;
		links.forEach((link, index) => {
			const selector = link.getAttribute("href");
			const target = selector
				? document.querySelector<HTMLElement>(selector)
				: null;
			if (target && target.getBoundingClientRect().top <= window.innerHeight * 0.48) {
				activeIndex = index;
			}
		});
		links.forEach((link, index) => {
			if (index === activeIndex) {
				link.setAttribute("aria-current", "location");
			} else {
				link.removeAttribute("aria-current");
			}
		});
	}

	private initPageReveals(mode: MotionMode): void {
		if (mode === "reduced") return;

		const homeWriting = document.querySelector<HTMLElement>(".home-writing");
		if (homeWriting) {
			this.observeReveal(homeWriting, "sky-writing-primed", "sky-writing-visible", 0.12);
		}

		document
			.querySelectorAll<HTMLElement>(".custom-md img")
			.forEach((image) => {
				this.observeReveal(image, "sky-image-awaiting", "sky-image-revealed", 0.08);
			});
	}

	private observeReveal(
		element: HTMLElement,
		primedClass: string,
		visibleClass: string,
		threshold: number,
	): void {
		const rect = element.getBoundingClientRect();
		if (rect.top < window.innerHeight * 0.92) {
			element.classList.add(visibleClass);
			return;
		}

		element.classList.add(primedClass);
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				element.classList.add(visibleClass);
				observer.disconnect();
				window.setTimeout(() => {
					element.classList.remove(primedClass, visibleClass);
				}, 760);
			},
			{ rootMargin: "0px 0px -6% 0px", threshold },
		);
		observer.observe(element);
		this.observers.push(observer);
	}

	private initTravelCardTilt(mode: MotionMode): void {
		const card = document.querySelector<HTMLElement>(".direction-card-travel");
		const signal = this.pageController?.signal;
		if (!card || !signal) return;

		if (mode !== "full") return;

		let frame = 0;
		let nextX = 50;
		let nextY = 50;
		const render = () => {
			frame = 0;
			const rotateY = ((nextX - 50) / 50) * 1.35;
			const rotateX = ((50 - nextY) / 50) * 1.15;
			card.style.setProperty("--sky-card-x", `${nextX.toFixed(2)}%`);
			card.style.setProperty("--sky-card-y", `${nextY.toFixed(2)}%`);
			card.style.setProperty("--sky-card-rx", `${rotateX.toFixed(3)}deg`);
			card.style.setProperty("--sky-card-ry", `${rotateY.toFixed(3)}deg`);
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(render);
		};

		card.addEventListener(
			"pointermove",
			(event) => {
				const rect = card.getBoundingClientRect();
				nextX = clamp((event.clientX - rect.left) / rect.width) * 100;
				nextY = clamp((event.clientY - rect.top) / rect.height) * 100;
				card.dataset.pointerActive = "true";
				schedule();
			},
			{ signal, passive: true },
		);
		card.addEventListener(
			"pointerleave",
			() => {
				nextX = 50;
				nextY = 50;
				card.dataset.pointerActive = "false";
				schedule();
			},
			{ signal },
		);
	}

	private initSharedPageTransitions(mode: MotionMode): void {
		if (mode === "reduced") return;
		const signal = this.pageController?.signal;
		const viewDocument = document as DocumentWithViewTransition;
		if (!signal || !viewDocument.startViewTransition) return;

		document
			.querySelectorAll<HTMLElement>("[data-sky-shared-card]")
			.forEach((card) => {
				card.addEventListener(
					"click",
					(event) => this.startSharedPageTransition(event, card),
					{ signal },
				);
			});
	}

	private startSharedPageTransition(
		event: MouseEvent,
		card: HTMLElement,
	): void {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey ||
			this.sharedTransitionResolve
		) {
			return;
		}

		const clicked = event.target instanceof Element ? event.target : null;
		const anchor = clicked?.closest<HTMLAnchorElement>("a[href]");
		const expectedHref = card.dataset.skySharedHref;
		if (!anchor || !expectedHref || anchor.target || anchor.hasAttribute("download")) {
			return;
		}

		const destination = new URL(anchor.href, window.location.href);
		const expected = new URL(expectedHref, window.location.href);
		if (
			destination.origin !== window.location.origin ||
			destination.pathname !== expected.pathname ||
			destination.href === window.location.href
		) {
			return;
		}

		const cover = card.querySelector<HTMLElement>("[data-sky-shared-cover]");
		const title = card.querySelector<HTMLElement>("[data-sky-shared-title]");
		this.sharedSourceElements = [cover, title].filter(
			(element): element is HTMLElement => Boolean(element),
		);
		cover?.style.setProperty("view-transition-name", "sky-post-cover");
		title?.style.setProperty("view-transition-name", "sky-post-title");
		document.documentElement.classList.add("sky-shared-transition");

		const viewDocument = document as DocumentWithViewTransition;
		const startViewTransition = viewDocument.startViewTransition;
		if (!startViewTransition || !window.swup) return;

		event.preventDefault();
		const contentReady = new Promise<void>((resolve) => {
			this.sharedTransitionResolve = resolve;
		});

		try {
			const transition = startViewTransition.call(viewDocument, async () => {
				window.swup?.navigate(destination.href);
				await contentReady;
			});
			void transition.finished.finally(() => this.clearSharedTransition());
		} catch {
			this.sharedTransitionResolve = null;
			this.clearSharedTransition();
			window.swup.navigate(destination.href);
			return;
		}

		window.clearTimeout(this.sharedTransitionTimer);
		this.sharedTransitionTimer = window.setTimeout(() => {
			this.sharedTransitionResolve?.();
			this.sharedTransitionResolve = null;
			this.clearSharedTransition();
		}, 4200);
	}

	private prepareSharedTransitionTarget(): void {
		if (!this.sharedTransitionResolve) return;
		const cover = document.getElementById("post-cover");
		const title = document.querySelector<HTMLElement>("[data-sky-post-title]");
		this.sharedTargetElements = [cover, title].filter(
			(element): element is HTMLElement => Boolean(element),
		);
		cover?.style.setProperty("view-transition-name", "sky-post-cover");
		title?.style.setProperty("view-transition-name", "sky-post-title");
	}

	private clearSharedTransition(): void {
		window.clearTimeout(this.sharedTransitionTimer);
		for (const element of [
			...this.sharedSourceElements,
			...this.sharedTargetElements,
		]) {
			element.style.removeProperty("view-transition-name");
		}
		this.sharedSourceElements = [];
		this.sharedTargetElements = [];
		document.documentElement.classList.remove("sky-shared-transition");
	}

	private initNavigationIndicator(): void {
		const container = document.getElementById("navbar-links-container");
		const indicator = container?.querySelector<HTMLElement>(
			".sky-nav-indicator",
		);
		const items = container
			? Array.from(container.querySelectorAll<HTMLElement>(".sky-nav-item"))
			: [];
		const signal = this.pageController?.signal;
		if (!container || !indicator || !items.length || !signal) return;

		const currentPath = normalizePath(window.location.pathname);
		const activeItem =
			items.find((item) => {
				const direct = item.dataset.navUrl;
				const childPaths = (item.dataset.navPaths || "").split("|").filter(Boolean);
				return (
					(direct && normalizePath(direct) === currentPath) ||
					childPaths.some((path) => normalizePath(path) === currentPath)
				);
			}) ||
			(currentPath.startsWith("/posts/")
				? items.find((item) => normalizePath(item.dataset.navUrl || "") === "/archive/")
				: undefined);

		items.forEach((item) => {
			item.classList.toggle("sky-nav-active", item === activeItem);
		});

		const targetFor = (item?: HTMLElement): HTMLElement | null =>
			item?.querySelector<HTMLElement>("a, button") || null;
		const moveIndicator = (item?: HTMLElement) => {
			const target = targetFor(item);
			if (!target) {
				indicator.style.opacity = "0";
				return;
			}
			const containerRect = container.getBoundingClientRect();
			const rect = target.getBoundingClientRect();
			indicator.style.setProperty(
				"--sky-nav-x",
				`${(rect.left - containerRect.left).toFixed(2)}px`,
			);
			indicator.style.setProperty(
				"--sky-nav-scale",
				Math.max(1, rect.width - 20).toFixed(2),
			);
			indicator.style.opacity = "1";
		};

		requestAnimationFrame(() => moveIndicator(activeItem));
		items.forEach((item) => {
			item.addEventListener("pointerenter", () => moveIndicator(item), {
				signal,
			});
			item.addEventListener("focusin", () => moveIndicator(item), { signal });
		});
		container.addEventListener("pointerleave", () => moveIndicator(activeItem), {
			signal,
		});
		container.addEventListener(
			"focusout",
			() => requestAnimationFrame(() => moveIndicator(activeItem)),
			{ signal },
		);

		const resizeObserver = new ResizeObserver(() => moveIndicator(activeItem));
		resizeObserver.observe(container);
		signal.addEventListener("abort", () => resizeObserver.disconnect(), {
			once: true,
		});
	}
}

let motionSystem: SkyCityMotionSystem | null = null;

export function getMotionSystem(): SkyCityMotionSystem {
	if (!motionSystem) motionSystem = new SkyCityMotionSystem();
	return motionSystem;
}

export function initMotionSystem(): void {
	getMotionSystem().init();
}
