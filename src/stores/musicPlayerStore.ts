import Key from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

import {
	DEFAULT_SONG,
	LOCAL_PLAYLIST,
	SKIP_ERROR_DELAY,
	STORAGE_KEY_VOLUME,
} from "@/components/widgets/music-player/constants";
import type { RepeatMode, Song } from "@/components/widgets/music-player/types";
import { musicPlayerConfig } from "@/config";
import { withBase } from "@/utils/base-path";

export interface MusicPlayerState {
	currentSong: Song;
	playlist: Song[];
	currentIndex: number;
	isPlaying: boolean;
	isLoading: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isMuted: boolean;
	isShuffled: boolean;
	isRepeating: RepeatMode;
	showPlaylist: boolean;
	errorMessage: string;
	showError: boolean;
	isExpanded: boolean;
	isHidden: boolean;
	autoplayFailed: boolean;
	willAutoPlay: boolean;
}

export interface MusicSpectrumDetail {
	supported: boolean;
	active: boolean;
	energy: number;
	bass: number;
	mid: number;
	high: number;
	peak: number;
	timestamp: number;
	reason: "running" | "paused" | "cors-fallback" | "unavailable";
}

function getAssetPath(path: string): string {
	return withBase(path);
}

class MusicPlayerStore {
	private audio: HTMLAudioElement | null = null;
	private state: MusicPlayerState;
	private isInitialized = false;
	private unregisterInteraction: (() => void) | undefined;
	private listeners = new Set<(state: MusicPlayerState) => void>();
	private audioContext: AudioContext | null = null;
	private audioSource: MediaElementAudioSourceNode | null = null;
	private analyser: AnalyserNode | null = null;
	private spectrumBins: Uint8Array<ArrayBuffer> | null = null;
	private spectrumFrame = 0;
	private lastSpectrumDispatch = 0;
	private spectrumSetupPromise: Promise<void> | null = null;
	private analysisPermitted = true;
	private corsFallbackUsed = false;
	private smoothedSpectrum = {
		energy: 0,
		bass: 0,
		mid: 0,
		high: 0,
		peak: 0,
	};

	constructor() {
		this.state = this.createInitialState();
	}

	private createInitialState(): MusicPlayerState {
		return {
			currentSong: { ...DEFAULT_SONG },
			playlist: [],
			currentIndex: 0,
			isPlaying: false,
			isLoading: false,
			currentTime: 0,
			duration: 0,
			volume: 0.7,
			isMuted: false,
			isShuffled: false,
			isRepeating: 0,
			showPlaylist: false,
			errorMessage: "",
			showError: false,
			isExpanded: false,
			isHidden: false,
			autoplayFailed: false,
			willAutoPlay: false,
		};
	}

	private createSnapshot(): MusicPlayerState {
		return {
			...this.state,
			currentSong: { ...this.state.currentSong },
			playlist: this.state.playlist.map((song) => ({ ...song })),
		};
	}

	getState(): MusicPlayerState {
		return this.createSnapshot();
	}

	getAudio(): HTMLAudioElement | null {
		return this.audio;
	}

	subscribe(listener: (state: MusicPlayerState) => void): () => void {
		this.listeners.add(listener);
		listener(this.createSnapshot());
		return () => {
			this.listeners.delete(listener);
		};
	}

	async initialize(): Promise<void> {
		if (typeof window === "undefined" || this.isInitialized) {
			return;
		}
		this.isInitialized = true;

		if (!musicPlayerConfig.enable) {
			return;
		}

		this.audio = new Audio();
		this.audio.crossOrigin = "anonymous";
		this.audio.preload = "metadata";
		this.setupAudioListeners();
		this.loadVolumeFromStorage();
		this.registerInteractionHandler();
		await this.loadPlaylist();
	}

	private setupAudioListeners(): void {
		if (!this.audio) {
			return;
		}

		this.audio.volume = this.state.volume;
		this.audio.muted = this.state.isMuted;

		this.audio.addEventListener("play", () => {
			this.state.isPlaying = true;
			this.startSpectrumAnalysis();
			this.broadcastState();
		});

		this.audio.addEventListener("pause", () => {
			this.state.isPlaying = false;
			this.stopSpectrumLoop("paused");
			this.broadcastState();
		});

		this.audio.addEventListener("timeupdate", () => {
			if (this.audio) {
				this.state.currentTime = this.audio.currentTime;
				this.broadcastState();
			}
		});

		this.audio.addEventListener("ended", () => {
			this.handleAudioEnded();
		});

		this.audio.addEventListener("error", () => {
			if (this.retryWithoutCors()) {
				return;
			}
			this.handleAudioError();
		});

		this.audio.addEventListener("loadeddata", () => {
			this.handleAudioLoaded();
		});

		this.audio.addEventListener("loadstart", () => {
			this.state.isLoading = true;
			this.broadcastState();
		});
	}

	private retryWithoutCors(): boolean {
		if (
			typeof window === "undefined" ||
			!this.audio ||
			!this.analysisPermitted ||
			this.corsFallbackUsed ||
			!this.state.currentSong.url
		) {
			return false;
		}

		const source = getAssetPath(this.state.currentSong.url);
		const absoluteSource = new URL(source, window.location.href);
		if (absoluteSource.origin === window.location.origin) {
			return false;
		}

		const shouldResume = this.state.isPlaying || this.state.willAutoPlay;
		const previousAudio = this.audio;
		previousAudio.pause();
		this.teardownSpectrumAnalysis();

		this.analysisPermitted = false;
		this.corsFallbackUsed = true;
		this.audio = new Audio();
		this.audio.preload = "metadata";
		this.setupAudioListeners();
		this.audio.volume = this.state.volume;
		this.audio.muted = this.state.isMuted;
		this.state.willAutoPlay = shouldResume;
		this.audio.src = source;
		this.audio.load();
		this.dispatchSpectrum(false, false, "cors-fallback");
		return true;
	}

	private startSpectrumAnalysis(): void {
		if (typeof window === "undefined" || !this.audio || !this.analysisPermitted) {
			this.dispatchSpectrum(false, false, "unavailable");
			return;
		}
		if (this.spectrumFrame || this.spectrumSetupPromise) {
			return;
		}

		this.spectrumSetupPromise = this.ensureSpectrumGraph().finally(() => {
			this.spectrumSetupPromise = null;
		});
	}

	private async ensureSpectrumGraph(): Promise<void> {
		const audio = this.audio;
		if (!audio || !this.analysisPermitted) {
			return;
		}

		try {
			const AudioContextConstructor =
				window.AudioContext ??
				(window as typeof window & { webkitAudioContext?: typeof AudioContext })
					.webkitAudioContext;
			if (!AudioContextConstructor) {
				this.dispatchSpectrum(false, false, "unavailable");
				return;
			}

			this.audioContext ??= new AudioContextConstructor({ latencyHint: "interactive" });
			if (this.audioContext.state !== "running") {
				await this.audioContext.resume();
			}
			if (
				this.audio !== audio ||
				!this.analysisPermitted ||
				this.audioContext.state !== "running"
			) {
				this.dispatchSpectrum(false, false, "unavailable");
				return;
			}

			if (!this.audioSource) {
				this.audioSource = this.audioContext.createMediaElementSource(audio);
				this.analyser = this.audioContext.createAnalyser();
				this.analyser.fftSize = 512;
				this.analyser.smoothingTimeConstant = 0.72;
				this.audioSource.connect(this.analyser);
				this.analyser.connect(this.audioContext.destination);
				this.spectrumBins = new Uint8Array(this.analyser.frequencyBinCount);
			}

			this.lastSpectrumDispatch = 0;
			this.spectrumFrame = window.requestAnimationFrame(this.sampleSpectrum);
		} catch (_error) {
			this.dispatchSpectrum(false, false, "unavailable");
		}
	}

	private readonly sampleSpectrum = (timestamp: number): void => {
		if (!this.audio || !this.analyser || !this.spectrumBins || !this.state.isPlaying) {
			this.stopSpectrumLoop("paused");
			return;
		}

		if (!document.hidden && timestamp - this.lastSpectrumDispatch >= 32) {
			this.lastSpectrumDispatch = timestamp;
			this.analyser.getByteFrequencyData(this.spectrumBins);
			const bass = this.readSpectrumBand(42, 190);
			const mid = this.readSpectrumBand(190, 2200);
			const high = this.readSpectrumBand(2200, 8500);
			let peak = 0;
			for (const value of this.spectrumBins) {
				peak = Math.max(peak, value / 255);
			}
			peak = Math.max(0, Math.min(1, (peak - 0.08) / 0.9));
			const energy = Math.min(1, bass * 0.5 + mid * 0.36 + high * 0.14);

			this.smoothedSpectrum.bass = this.smoothBand(this.smoothedSpectrum.bass, bass);
			this.smoothedSpectrum.mid = this.smoothBand(this.smoothedSpectrum.mid, mid);
			this.smoothedSpectrum.high = this.smoothBand(this.smoothedSpectrum.high, high);
			this.smoothedSpectrum.peak = this.smoothBand(this.smoothedSpectrum.peak, peak);
			this.smoothedSpectrum.energy = this.smoothBand(
				this.smoothedSpectrum.energy,
				energy,
			);
			this.dispatchSpectrum(true, true, "running");
		}

		this.spectrumFrame = window.requestAnimationFrame(this.sampleSpectrum);
	};

	private readSpectrumBand(minHz: number, maxHz: number): number {
		if (!this.audioContext || !this.spectrumBins) {
			return 0;
		}
		const binWidth = this.audioContext.sampleRate / 2 / this.spectrumBins.length;
		const start = Math.max(0, Math.floor(minHz / binWidth));
		const end = Math.min(
			this.spectrumBins.length - 1,
			Math.ceil(maxHz / binWidth),
		);
		let squareSum = 0;
		let count = 0;
		for (let index = start; index <= end; index += 1) {
			const normalized = this.spectrumBins[index] / 255;
			squareSum += normalized * normalized;
			count += 1;
		}
		const rms = count > 0 ? Math.sqrt(squareSum / count) : 0;
		const normalized = Math.max(0, Math.min(1, (rms - 0.02) / 1.22));
		return normalized ** 1.18;
	}

	private smoothBand(current: number, target: number): number {
		const amount = target > current ? 0.42 : 0.11;
		return current + (target - current) * amount;
	}

	private stopSpectrumLoop(
		reason: MusicSpectrumDetail["reason"] = "paused",
	): void {
		if (this.spectrumFrame) {
			window.cancelAnimationFrame(this.spectrumFrame);
			this.spectrumFrame = 0;
		}
		this.smoothedSpectrum = { energy: 0, bass: 0, mid: 0, high: 0, peak: 0 };
		this.dispatchSpectrum(Boolean(this.analyser), false, reason);
	}

	private dispatchSpectrum(
		supported: boolean,
		active: boolean,
		reason: MusicSpectrumDetail["reason"],
	): void {
		if (typeof window === "undefined") {
			return;
		}
		const detail: MusicSpectrumDetail = {
			supported,
			active,
			...this.smoothedSpectrum,
			timestamp: performance.now(),
			reason,
		};
		const debugWindow = window as typeof window & {
			__skyMusicSpectrum?: MusicSpectrumDetail;
		};
		debugWindow.__skyMusicSpectrum = detail;
		document.documentElement.dataset.skyAudioSpectrum = active
			? "active"
			: supported
				? "ready"
				: "fallback";
		window.dispatchEvent(new CustomEvent<MusicSpectrumDetail>("sky-music-spectrum", { detail }));
	}

	private teardownSpectrumAnalysis(): void {
		if (this.spectrumFrame) {
			window.cancelAnimationFrame(this.spectrumFrame);
			this.spectrumFrame = 0;
		}
		this.audioSource?.disconnect();
		this.analyser?.disconnect();
		if (this.audioContext && this.audioContext.state !== "closed") {
			void this.audioContext.close().catch(() => {});
		}
		this.audioContext = null;
		this.audioSource = null;
		this.analyser = null;
		this.spectrumBins = null;
		this.spectrumSetupPromise = null;
		this.smoothedSpectrum = { energy: 0, bass: 0, mid: 0, high: 0, peak: 0 };
	}

	private handleAudioEnded(): void {
		if (this.state.isRepeating === 1) {
			if (this.audio) {
				this.audio.currentTime = 0;
				this.audio.play().catch(() => {});
			}
			this.broadcastState();
		} else {
			this.next(true);
		}
	}

	private handleAudioError(): void {
		this.state.isLoading = false;
		this.showError(i18n(Key.musicPlayerErrorSong));

		if (this.state.playlist.length > 1) {
			setTimeout(() => this.next(true), SKIP_ERROR_DELAY);
		} else if (this.state.playlist.length <= 1) {
			this.showError(i18n(Key.musicPlayerErrorEmpty));
		}
		this.broadcastState();
	}

	private handleAudioLoaded(): void {
		this.state.isLoading = false;
		if (this.audio?.duration && this.audio.duration > 1) {
			this.state.duration = Math.floor(this.audio.duration);
			this.state.currentSong = {
				...this.state.currentSong,
				duration: this.state.duration,
			};
		}

		if (this.state.willAutoPlay || this.state.isPlaying) {
			const playPromise = this.audio?.play();
			if (playPromise !== undefined) {
				playPromise.catch(() => {
					this.state.autoplayFailed = true;
					this.state.isPlaying = false;
				});
			}
		}
		this.broadcastState();
	}

	private loadVolumeFromStorage(): void {
		if (typeof localStorage !== "undefined") {
			const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
			if (savedVolume) {
				const volume = Number.parseFloat(savedVolume);
				if (!Number.isNaN(volume) && volume >= 0 && volume <= 1) {
					this.state.volume = volume;
					this.state.isMuted = volume === 0;
					if (this.audio) {
						this.audio.volume = volume;
						this.audio.muted = this.state.isMuted;
					}
				}
			}
		}
	}

	private registerInteractionHandler(): void {
		const handler = () => {
			if (this.state.autoplayFailed && this.audio) {
				const playPromise = this.audio.play();
				if (playPromise !== undefined) {
					playPromise
						.then(() => {
							this.state.autoplayFailed = false;
						})
						.catch(() => {});
				}
			}
		};
		document.addEventListener("click", handler, { once: true });
		document.addEventListener("keydown", handler, { once: true });
		this.unregisterInteraction = () => {
			document.removeEventListener("click", handler);
			document.removeEventListener("keydown", handler);
		};
	}

	private async loadPlaylist(): Promise<void> {
		const mode = musicPlayerConfig.mode ?? "meting";
		const meting_api =
			musicPlayerConfig.meting_api ??
			"https://www.bilibili.uno/api?server=:server&type=:type&id=:id&auth=:auth&r=:r";
		const meting_id = musicPlayerConfig.id ?? "14164869977";
		const meting_ids =
			musicPlayerConfig.ids && musicPlayerConfig.ids.length > 0
				? musicPlayerConfig.ids
				: [meting_id];
		const meting_server = musicPlayerConfig.server ?? "netease";
		const meting_type = musicPlayerConfig.type ?? "playlist";

		if (mode === "meting") {
			await this.fetchMetingPlaylist(
				meting_api,
				meting_server,
				meting_type,
				meting_ids,
			);
		} else {
			this.loadLocalPlaylist();
		}
	}

	private async fetchMetingPlaylist(
		api: string,
		server: string,
		type: string,
		ids: string[],
	): Promise<void> {
		if (!api || ids.length === 0) {
			return;
		}

		this.state.isLoading = true;
		this.broadcastState();

		try {
			const lists = await Promise.all(
				ids.map(async (id, index) => {
					const apiUrl = api
						.replace(":server", server)
						.replace(":type", type)
						.replace(":id", id)
						.replace(":auth", "")
						.replace(":r", (Date.now() + index).toString());
					const res = await fetch(apiUrl);
					if (!res.ok) {
						throw new Error("meting api error");
					}
					return (await res.json()) as Record<string, unknown>[];
				}),
			);
			const list = lists.flat();
			this.state.playlist = list.map((song) => this.convertMetingSong(song));
			this.state.isLoading = false;

			if (this.state.playlist.length > 0) {
				this.loadSong(this.state.playlist[0], false);
			}
		} catch (_e) {
			this.showError(i18n(Key.musicPlayerErrorPlaylist));
			this.state.isLoading = false;
		}
		this.broadcastState();
	}

	private convertMetingSong(song: Record<string, unknown>): Song {
		const name = typeof song.name === "string" ? song.name : undefined;
		const songTitle = typeof song.title === "string" ? song.title : undefined;
		const title = name ?? songTitle ?? i18n(Key.unknownSong);
		const artistField =
			typeof song.artist === "string" ? song.artist : undefined;
		const author = typeof song.author === "string" ? song.author : undefined;
		const artist = artistField ?? author ?? i18n(Key.unknownArtist);
		let dur = (song.duration as number | undefined) ?? 0;
		if (typeof dur === "string") {
			dur = Number.parseInt(dur, 10);
		}
		if (dur > 10000) {
			dur = Math.floor(dur / 1000);
		}
		if (!Number.isFinite(dur) || dur <= 0) {
			dur = 0;
		}

		return {
			id:
				typeof song.id === "string"
					? Number.parseInt(song.id, 10)
					: ((song.id as number | undefined) ?? 0),
			title,
			artist,
			cover: (song.pic as string | undefined) ?? "",
			url: (song.url as string | undefined) ?? "",
			duration: dur,
		};
	}

	private loadLocalPlaylist(): void {
		this.state.playlist = [...LOCAL_PLAYLIST];
		if (this.state.playlist.length === 0) {
			this.showError("本地播放列表为空");
		} else {
			this.loadSong(this.state.playlist[0], false);
		}
	}

	private loadSong(song: Song, autoPlay = true): void {
		if (!song || !song.url) {
			return;
		}
		if (song.url !== this.state.currentSong.url) {
			this.state.currentSong = { ...song };
			if (song.url) {
				this.state.isLoading = true;
			} else {
				this.state.isLoading = false;
			}
		}
		this.state.willAutoPlay = autoPlay;
		if (this.audio) {
			this.stopSpectrumLoop("paused");
			this.analysisPermitted = true;
			this.corsFallbackUsed = false;
			this.audio.pause();
			this.audio.removeAttribute("src");
			this.audio.crossOrigin = "anonymous";
			this.audio.src = getAssetPath(song.url);
			this.audio.load();
		}
		this.broadcastState();
	}

	private showError(message: string): void {
		this.state.errorMessage = message;
		this.state.showError = true;
		setTimeout(() => {
			this.state.showError = false;
			this.broadcastState();
		}, 3000);
		this.broadcastState();
	}

	hideError(): void {
		this.state.showError = false;
		this.broadcastState();
	}

	toggle(): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		if (this.state.isPlaying) {
			this.audio.pause();
		} else {
			this.startSpectrumAnalysis();
			this.audio.play().catch(() => {});
		}
	}

	play(): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		this.startSpectrumAnalysis();
		this.audio.play().catch(() => {});
	}

	pause(): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		this.audio.pause();
	}

	next(autoPlay = true): void {
		if (this.state.playlist.length <= 1) {
			return;
		}

		let newIndex: number;
		if (this.state.isShuffled) {
			do {
				newIndex = Math.floor(Math.random() * this.state.playlist.length);
			} while (
				newIndex === this.state.currentIndex &&
				this.state.playlist.length > 1
			);
		} else {
			newIndex =
				this.state.currentIndex < this.state.playlist.length - 1
					? this.state.currentIndex + 1
					: 0;
		}

		this.state.currentIndex = newIndex;
		this.loadSong(this.state.playlist[newIndex], autoPlay);
	}

	prev(): void {
		if (this.state.playlist.length <= 1) {
			return;
		}
		const newIndex =
			this.state.currentIndex > 0
				? this.state.currentIndex - 1
				: this.state.playlist.length - 1;
		this.state.currentIndex = newIndex;
		this.loadSong(this.state.playlist[newIndex], true);
	}

	playIndex(index: number): void {
		if (index < 0 || index >= this.state.playlist.length) {
			return;
		}
		this.state.currentIndex = index;
		this.loadSong(this.state.playlist[index], true);
	}

	seek(time: number): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		if (time >= 0 && time <= this.state.duration) {
			this.audio.currentTime = time;
			this.state.currentTime = time;
			this.broadcastState();
		}
	}

	setVolume(volume: number): void {
		const clampedVolume = Math.max(0, Math.min(1, volume));
		this.state.volume = clampedVolume;
		this.state.isMuted = clampedVolume === 0;
		if (this.audio) {
			this.audio.volume = clampedVolume;
			this.audio.muted = this.state.isMuted;
		}
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY_VOLUME, String(clampedVolume));
		}
		this.broadcastState();
	}

	toggleMute(): void {
		this.state.isMuted = !this.state.isMuted;
		if (this.audio) {
			this.audio.muted = this.state.isMuted;
		}
		this.broadcastState();
	}

	toggleShuffle(): void {
		this.state.isShuffled = !this.state.isShuffled;
		if (this.state.isShuffled) {
			this.state.isRepeating = 0;
		}
		this.broadcastState();
	}

	toggleRepeat(): void {
		this.state.isRepeating = ((this.state.isRepeating + 1) % 3) as RepeatMode;
		if (this.state.isRepeating !== 0) {
			this.state.isShuffled = false;
		}
		this.broadcastState();
	}

	toggleMode(): void {
		if (this.state.isShuffled) {
			this.toggleShuffle();
			return;
		}
		if (this.state.isRepeating === 2) {
			this.toggleRepeat();
			this.toggleShuffle();
			return;
		}
		this.toggleRepeat();
	}

	togglePlaylist(): void {
		this.state.showPlaylist = !this.state.showPlaylist;
		this.broadcastState();
	}

	toggleExpanded(): void {
		this.state.isExpanded = !this.state.isExpanded;
		// 保持与原先 usePlayerState.toggleExpandedUI 一致的联动行为：
		// 展开时强制取消隐藏，并关闭播放列表，避免状态组合异常
		if (this.state.isExpanded) {
			this.state.showPlaylist = false;
			this.state.isHidden = false;
		}
		this.broadcastState();
	}

	toggleHidden(): void {
		this.state.isHidden = !this.state.isHidden;
		// 保持与原先 usePlayerState.toggleHiddenUI 一致的联动行为：
		// 隐藏时收起播放器并关闭播放列表，防止展开 UI 悬挂在小球旁边
		if (this.state.isHidden) {
			this.state.isExpanded = false;
			this.state.showPlaylist = false;
		}
		this.broadcastState();
	}

	canSkip(): boolean {
		return this.state.playlist.length > 1;
	}

	setProgress(percent: number): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		const newTime = percent * this.state.duration;
		this.audio.currentTime = newTime;
		this.state.currentTime = newTime;
		this.broadcastState();
	}

	private broadcastState(): void {
		const snapshot = this.createSnapshot();

		for (const listener of this.listeners) {
			listener(snapshot);
		}

		if (typeof window === "undefined") {
			return;
		}
		window.dispatchEvent(
			new CustomEvent("music-sidebar:state", {
				detail: snapshot,
			}),
		);
	}

	destroy(): void {
		if (this.unregisterInteraction) {
			this.unregisterInteraction();
		}
		if (this.audio) {
			this.audio.pause();
			this.audio.src = "";
			this.audio = null;
		}
		this.teardownSpectrumAnalysis();
		this.isInitialized = false;
	}
}

export const musicPlayerStore = new MusicPlayerStore();
