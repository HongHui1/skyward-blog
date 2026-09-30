import assert from "node:assert/strict";
import { test } from "node:test";
import { PIXEL_WIDTH, PIXEL_HEIGHT, PIXEL_SIZE, skyCityPixels } from "../src/utils/pixel-word.ts";

test("pixel signature has deterministic, unique points inside its viewBox", () => {
	const pixels = skyCityPixels();
	assert.deepEqual(pixels, skyCityPixels());
	assert.equal(pixels.length, 352);
	assert.equal(new Set(pixels.map(({ x, y }) => `${x}:${y}`)).size, pixels.length);
	for (const pixel of pixels) {
		assert.ok(pixel.x >= 0 && pixel.x + PIXEL_SIZE < PIXEL_WIDTH);
		assert.ok(pixel.y >= 0 && pixel.y + PIXEL_SIZE < PIXEL_HEIGHT);
		assert.ok(Number.isFinite(pixel.hue) && pixel.hue >= 0 && pixel.hue <= 360);
	}
});

test("all seven letters are populated and fresh calls do not share mutable points", () => {
	const pixels = skyCityPixels();
	const letters = new Set(pixels.map(({ x }) => Math.floor((x - 74) / 72)));
	assert.deepEqual([...letters], [0, 1, 2, 3, 4, 5, 6]);
	pixels[0].x = -100;
	assert.notEqual(skyCityPixels()[0].x, -100);
});
