/** Original 5×7 geometric lettering. Shared by the SSR fallback and live canvas. */
const letters: Record<string, string[]> = {
	S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
	K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
	Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
	C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
	I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
	T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
};

export const PIXEL_WIDTH = 640;
export const PIXEL_HEIGHT = 220;
export const PIXEL_SIZE = 4.7;

export function skyCityPixels(): Array<{ x: number; y: number; hue: number }> {
	const points: Array<{ x: number; y: number; hue: number }> = [];
	for (const [index, letter] of [..."SKYCITY"].entries()) {
		letters[letter].forEach((row, y) => {
			[...row].forEach((pixel, x) => {
				if (pixel !== "1") return;
				for (let dy = 0; dy < 2; dy++) {
					for (let dx = 0; dx < 2; dx++) {
						const px = 74 + (index * 6 + x) * 12 + dx * 6;
						points.push({ x: px, y: 68 + y * 12 + dy * 6, hue: (px - 74) / 492 * 310 });
					}
				}
			});
		});
	}
	return points;
}
