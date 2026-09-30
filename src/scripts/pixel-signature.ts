import type { NatureSignatureScene } from "./nature-signature-scene";

/** Lazy WebGL: only a visible footer loads Three.js or starts its render loop. */
class SkyPixelSignature extends HTMLElement {
	private controller: AbortController | null = null;
	private intersection: IntersectionObserver | null = null;
	private resize: ResizeObserver | null = null;
	private theme: MutationObserver | null = null;
	private world: NatureSignatureScene | null = null;
	private loading = false;
	private failed = false;
	private stage: HTMLElement | null = null;
	private frame = 0;
	private lastTime = 0;
	private time = 0;
	private width = 0;
	private height = 0;
	private visible = false;
	private paused = false;
	private reduced = false;
	private dark = false;
	private media = matchMedia("(prefers-reduced-motion: reduce)");

	connectedCallback(): void {
		if (this.controller) return;
		this.controller = new AbortController();
		const { signal } = this.controller;
		this.stage = this.querySelector("[data-pixel-stage]");
		if (!this.stage) return;
		try {
			this.paused = sessionStorage.getItem("sky-pixel-paused") === "true";
		} catch {
			/* Storage optional. */
		}
		this.querySelector("[data-pixel-pause]")?.addEventListener(
			"click",
			() =>
				document.dispatchEvent(
					new CustomEvent("sky:pixel-pause", { detail: !this.paused }),
				),
			{ signal },
		);
		document.addEventListener(
			"sky:pixel-pause",
			(event) => {
				this.paused = Boolean((event as CustomEvent<boolean>).detail);
				try {
					sessionStorage.setItem("sky-pixel-paused", String(this.paused));
				} catch {
					/* Optional. */
				}
				this.refresh();
			},
			{ signal },
		);
		this.stage.addEventListener(
			"pointermove",
			(event) => {
				if (event.pointerType !== "mouse" || this.paused || this.reduced)
					return;
				const rect = this.stage!.getBoundingClientRect();
				this.world?.setView(
					((event.clientX - rect.left) / rect.width - 0.5) * 0.4,
				);
			},
			{ signal, passive: true },
		);
		this.stage.addEventListener("pointerleave", () => this.world?.setView(0), {
			signal,
		});
		this.querySelector("canvas")?.addEventListener(
			"webglcontextlost",
			(event) => {
				event.preventDefault();
				this.stop();
				this.failed = true;
				this.removeAttribute("data-ready");
				this.querySelector<HTMLElement>(".pixel-signature__controls")!.hidden =
					true;
			},
			{ signal },
		);
		this.querySelector("canvas")?.addEventListener(
			"webglcontextrestored",
			() => {
				this.failed = false;
				this.world?.setTheme(this.dark);
				this.measure();
				this.dataset.ready = "true";
				this.querySelector<HTMLElement>(".pixel-signature__controls")!.hidden =
					false;
				this.sync();
			},
			{ signal },
		);
		document.addEventListener("visibilitychange", () => this.sync(), {
			signal,
		});
		this.media.addEventListener("change", () => this.refresh(), { signal });
		this.theme = new MutationObserver(() => this.refresh());
		this.theme.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-sky-motion"],
		});
		this.resize = new ResizeObserver(() => this.measure());
		this.resize.observe(this.stage);
		this.intersection = new IntersectionObserver(([entry]) => {
			this.visible = entry.isIntersecting && entry.intersectionRect.width > 0;
			if (this.visible) void this.initialize();
			this.sync();
		});
		this.intersection.observe(this.stage);
		this.refresh();
		this.measure();
	}

	private async initialize(): Promise<void> {
		if (this.world || this.loading || this.failed || !this.controller) return;
		this.loading = true;
		const controller = this.controller;
		try {
			const { NatureSignatureScene } = await import("./nature-signature-scene");
			if (controller.signal.aborted || !this.isConnected) return;
			this.world = new NatureSignatureScene(this.querySelector("canvas")!);
			this.world.setTheme(this.dark);
			this.measure();
			this.dataset.ready = "true";
			this.querySelector<HTMLElement>(".pixel-signature__controls")!.hidden =
				false;
			this.sync();
		} catch (error) {
			this.world?.dispose();
			this.world = null;
			this.failed = true;
			console.warn(
				"SkyCity 3D unavailable; retaining static lettering.",
				error,
			);
		} finally {
			this.loading = false;
		}
	}

	private refresh(): void {
		this.dark = document.documentElement.classList.contains("dark");
		this.reduced =
			this.media.matches ||
			document.documentElement.dataset.skyMotion === "reduced";
		this.world?.setTheme(this.dark);
		const button = this.querySelector<HTMLButtonElement>("[data-pixel-pause]");
		if (button) {
			button.disabled = this.reduced;
			button.setAttribute("aria-pressed", String(this.paused));
			button.textContent = this.reduced
				? "静态模式"
				: this.paused
					? "继续动效"
					: "暂停动效";
		}
		this.draw();
		this.sync();
	}

	private measure(): void {
		if (!this.stage) return;
		const rect = this.stage.getBoundingClientRect();
		this.width = rect.width;
		this.height = rect.height;
		if (!this.width || !this.height) {
			this.stop();
			return;
		}
		this.world?.resize(this.width, this.height);
		this.draw();
		this.sync();
	}

	private sync(): void {
		if (
			!this.world ||
			this.failed ||
			!this.isConnected ||
			!this.visible ||
			!this.width ||
			document.hidden ||
			this.paused ||
			this.reduced
		) {
			this.stop();
			return;
		}
		if (this.frame) return;
		this.lastTime = 0;
		this.dataset.running = "true";
		this.frame = requestAnimationFrame(this.tick);
	}
	private stop(): void {
		cancelAnimationFrame(this.frame);
		this.frame = 0;
		this.dataset.running = "false";
	}
	private tick = (now: number): void => {
		// 30 fps is ample for drifting lights and leaves, and halves GPU work on phones.
		if (!this.lastTime || now - this.lastTime >= 32) {
			const dt = this.lastTime
				? Math.min((now - this.lastTime) / 1000, 0.1)
				: 0;
			this.lastTime = now;
			this.time = (this.time + dt) % 32;
			this.draw();
		}
		this.frame = requestAnimationFrame(this.tick);
	};
	private draw(): void {
		if (!this.failed && this.width) this.world?.render(this.time, this.reduced);
	}

	disconnectedCallback(): void {
		this.stop();
		this.controller?.abort();
		this.controller = null;
		this.intersection?.disconnect();
		this.resize?.disconnect();
		this.theme?.disconnect();
		this.world?.dispose();
		this.world = null;
		this.visible = false;
		this.failed = false;
		this.removeAttribute("data-ready");
	}
}
if (!customElements.get("sky-pixel-signature"))
	customElements.define("sky-pixel-signature", SkyPixelSignature);
