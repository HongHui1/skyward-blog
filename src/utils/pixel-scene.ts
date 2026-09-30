/** A seamless 24-second scene, shared by the static SVG and animated canvas. */
export const SCENE_PERIOD = 24;
export type Point3 = { x: number; y: number; z: number };
export type ProjectedPoint = Point3 & { scale: number };

export function projectPoint(point: Point3, phase = 0): ProjectedPoint {
	const yaw = -.22 + Math.sin(phase) * .035;
	const pitch = -.26 + Math.cos(phase) * .025;
	const x = point.x * Math.cos(yaw) + point.z * Math.sin(yaw);
	const z = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
	const y = point.y * Math.cos(pitch) - z * Math.sin(pitch);
	const depth = point.y * Math.sin(pitch) + z * Math.cos(pitch);
	const scale = 1800 / (1800 - depth);
	return { x: 320 + x * scale, y: 108 + y * scale, z: depth, scale };
}

export function orbitPoint(index: number, phase: number): Point3 {
	const lane = index % 3;
	const angle = index * 2.3999632297 + phase * (lane === 1 ? -1 : 1);
	const x = Math.cos(angle) * (275 + lane * 8);
	return {
		x,
		y: Math.sin(angle) * (39 + lane * 8) + x * (lane === 1 ? -.1 : .085),
		z: Math.sin(angle) * (88 + lane * 16),
	};
}

/** Front, top, and right faces of an extruded LED voxel. */
export function voxelFaces(x: number, y: number, size: number, phase = 0, depth = 15): ProjectedPoint[][] {
	const p = (dx: number, dy: number, z: number) => projectPoint({ x: x - 320 + dx, y: y - 108 + dy, z }, phase);
	return [
		[p(0, 0, -depth), p(size, 0, -depth), p(size, 0, 5), p(0, 0, 5)],
		[p(size, 0, 5), p(size, 0, -depth), p(size, size, -depth), p(size, size, 5)],
		[p(0, 0, 5), p(size, 0, 5), p(size, size, 5), p(0, size, 5)],
	];
}
