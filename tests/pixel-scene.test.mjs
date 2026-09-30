import assert from "node:assert/strict";
import { test } from "node:test";
import { orbitPoint, projectPoint, voxelFaces } from "../src/utils/pixel-scene.ts";
import { skyCityPixels, PIXEL_SIZE } from "../src/utils/pixel-word.ts";

test("particle orbits and camera meet exactly at the loop boundary", () => {
	for (let i = 0; i < 156; i++) {
		const start = projectPoint(orbitPoint(i, 0), 0);
		const end = projectPoint(orbitPoint(i, 2 * Math.PI), 2 * Math.PI);
		for (const axis of ["x", "y", "z"]) assert.ok(Math.abs(start[axis] - end[axis]) < 1e-8);
	}
});

test("particles travel through front and back depth and remain inside the stage", () => {
	let front = 0;
	let back = 0;
	for (let frame = 0; frame < 24; frame++) {
		const phase = frame / 24 * Math.PI * 2;
		for (let i = 0; i < 156; i++) {
			const p = projectPoint(orbitPoint(i, phase), phase);
			assert.ok(p.x > 0 && p.x + 5 < 640 && p.y > 0 && p.y + 5 < 220);
			if (p.z > 0) front++; else back++;
		}
	}
	assert.ok(front > 0 && back > 0);
});

test("every letter retains finite, nonzero projected faces throughout the cycle", () => {
	for (const phase of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
		for (const pixel of skyCityPixels()) {
			for (const face of voxelFaces(pixel.x, pixel.y, PIXEL_SIZE, phase)) {
				const area = face.reduce((sum, p, i) => {
					const next = face[(i + 1) % face.length];
					assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
					return sum + p.x * next.y - next.x * p.y;
				}, 0);
				assert.ok(Math.abs(area) > 1);
			}
		}
	}
});
