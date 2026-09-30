import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Visible by default; each island owns and reverts only its own scroll effects. */
class SkyHomeJourney extends HTMLElement {
	private motion: ReturnType<typeof gsap.matchMedia> | null = null;
	private controller: AbortController | null = null;
	private frame = 0;

	connectedCallback(): void {
		this.disconnectedCallback();
		this.controller = new AbortController();
		const { signal } = this.controller;
		this.frame = requestAnimationFrame(() => {
			if (!this.isConnected) return;
			this.motion = gsap.matchMedia();
			this.motion.add(
				"(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
				() => {
					if (document.documentElement.dataset.skyMotion === "quiet") return;
					gsap.fromTo(
						this.querySelector(".journey-postcard--back"),
						{ y: 22, rotation: 9 },
						{
							y: -16,
							rotation: 4,
							ease: "none",
							scrollTrigger: {
								trigger: this.querySelector(".journey-intro"),
								start: "top bottom",
								end: "bottom top",
								scrub: 1,
							},
						},
					);
					gsap.fromTo(
						this.querySelector(".journey-postcard--front"),
						{ y: 8, rotation: -12 },
						{
							y: -28,
							rotation: -6,
							ease: "none",
							scrollTrigger: {
								trigger: this.querySelector(".journey-intro"),
								start: "top bottom",
								end: "bottom top",
								scrub: 1,
							},
						},
					);
					gsap.fromTo(
						this.querySelector(".journey-feature__line"),
						{ scaleX: 0.2 },
						{
							scaleX: 1,
							ease: "none",
							scrollTrigger: {
								trigger: this.querySelector(".journey-feature"),
								start: "top 90%",
								end: "center 55%",
								scrub: 0.6,
							},
						},
					);
					gsap.fromTo(
						this.querySelector(".travel-window__viewer"),
						{ y: 34 },
						{
							y: 0,
							ease: "none",
							scrollTrigger: {
								trigger: this.querySelector(".journey-travel"),
								start: "top 90%",
								end: "center center",
								scrub: 0.8,
							},
						},
					);
				},
				this,
			);
			ScrollTrigger.refresh();
		});
		document.fonts.ready.then(() => {
			if (!signal.aborted) ScrollTrigger.refresh();
		});
	}

	disconnectedCallback(): void {
		cancelAnimationFrame(this.frame);
		this.controller?.abort();
		this.controller = null;
		this.motion?.revert();
		this.motion = null;
	}
}

if (!customElements.get("sky-home-journey"))
	customElements.define("sky-home-journey", SkyHomeJourney);
