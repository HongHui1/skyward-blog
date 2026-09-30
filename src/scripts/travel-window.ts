type TravelPhoto = { src: string; alt: string; description?: string };

/** A reconnectable island: Swup can remove/restore it without leaving listeners behind. */
class SkyTravelWindow extends HTMLElement {
	private controller: AbortController | null = null;
	private animation: Animation | null = null;
	private current = 0;
	private requested = 0;
	private generation = 0;
	private photos: TravelPhoto[] = [];

	connectedCallback(): void {
		this.controller?.abort();
		this.controller = new AbortController();
		const { signal } = this.controller;
		try {
			this.photos = JSON.parse(this.querySelector("[data-travel-photos]")?.textContent || "[]");
		} catch { return; }
		if (this.photos.length < 2) return;
		this.querySelectorAll<HTMLElement>("[data-travel-controls]").forEach((control) => { control.hidden = false; });
		this.addEventListener("click", (event) => {
			const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-travel-index], [data-travel-step]") : null;
			if (!target) return;
			const index = target.dataset.travelIndex;
			void this.select(index !== undefined ? Number(index) : this.requested + Number(target.dataset.travelStep));
		}, { signal });
		const surface = this.querySelector<HTMLElement>(".travel-window__image-link");
		let gesture: { x: number; y: number } | null = null;
		let suppressClickUntil = 0;
		surface?.addEventListener("pointerdown", (event) => {
			if (event.pointerType === "mouse") return;
			gesture = { x: event.clientX, y: event.clientY };
		}, { signal, passive: true });
		surface?.addEventListener("pointerup", (event) => {
			if (!gesture) return;
			const dx = event.clientX - gesture.x;
			const dy = event.clientY - gesture.y;
			gesture = null;
			if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
			suppressClickUntil = performance.now() + 500;
			void this.select(this.requested + (dx < 0 ? 1 : -1));
		}, { signal, passive: true });
		surface?.addEventListener("pointercancel", () => { gesture = null; }, { signal });
		surface?.addEventListener("click", (event) => {
			if (performance.now() < suppressClickUntil) {
				event.preventDefault();
				event.stopPropagation();
			}
		}, { signal, capture: true });
		this.addEventListener("keydown", (event) => {
			if (!(event.target instanceof Element) || !event.target.closest("button")) return;
			if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
			event.preventDefault();
			const index = event.key === "Home" ? 0 : event.key === "End" ? this.photos.length - 1 : this.requested + (event.key === "ArrowRight" ? 1 : -1);
			void this.select(index);
		}, { signal });
	}

	private async select(index: number): Promise<void> {
		const next = (index + this.photos.length) % this.photos.length;
		if (next === this.current && next === this.requested) return;
		this.requested = next;
		const generation = ++this.generation;
		const photo = this.photos[next];
		const loading = this.querySelector<HTMLElement>("[data-travel-loading]");
		if (loading) { loading.hidden = false; loading.textContent = "照片加载中…"; }
		this.setAttribute("aria-busy", "true");
		const preload = new Image();
		preload.src = photo.src;
		try {
			await preload.decode();
		} catch {
			if (generation !== this.generation || !this.isConnected) return;
			this.requested = this.current;
			this.removeAttribute("aria-busy");
			if (loading) loading.textContent = "照片暂时没加载出来，再点一次试试。";
			return;
		}
		if (generation !== this.generation || !this.isConnected) return;
		const image = this.querySelector<HTMLImageElement>("[data-travel-main]");
		if (!image) return;
		this.animation?.cancel();
		image.src = photo.src;
		image.alt = photo.alt;
		this.current = next;
		this.removeAttribute("aria-busy");
		if (loading) loading.hidden = true;
		const caption = this.querySelector("[data-travel-caption]");
		const count = this.querySelector("[data-travel-count]");
		if (caption) caption.textContent = photo.description || photo.alt;
		if (count) count.textContent = `${String(next + 1).padStart(2, "0")} / ${String(this.photos.length).padStart(2, "0")}`;
		this.querySelectorAll<HTMLElement>("[data-travel-index]").forEach((button) => {
			button.setAttribute("aria-pressed", String(Number(button.dataset.travelIndex) === next));
		});
		if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			this.animation = image.animate([{ opacity: .45, transform: "scale(1.025)" }, { opacity: 1, transform: "scale(1)" }], { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" });
		}
	}

	disconnectedCallback(): void {
		this.controller?.abort();
		this.animation?.cancel();
		this.generation++;
	}
}

if (!customElements.get("sky-travel-window")) customElements.define("sky-travel-window", SkyTravelWindow);
