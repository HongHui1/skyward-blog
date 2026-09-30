import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Letter silhouettes are extruded solids, not sprites or separate voxel tiles.
const outlines: Record<string, number[][]> = {
	S: [
		[5, 7],
		[1, 7],
		[0, 6],
		[0, 4],
		[1, 3],
		[4, 3],
		[4, 1],
		[0, 1],
		[0, 0],
		[4, 0],
		[5, 1],
		[5, 3],
		[4, 4],
		[1, 4],
		[1, 6],
		[5, 6],
	],
	K: [
		[0, 0],
		[1, 0],
		[1, 3],
		[2, 3],
		[4, 0],
		[5, 0],
		[3, 3.5],
		[5, 7],
		[4, 7],
		[2, 4],
		[1, 4],
		[1, 7],
		[0, 7],
	],
	Y: [
		[0, 7],
		[1, 7],
		[2.5, 4.5],
		[4, 7],
		[5, 7],
		[3, 3.5],
		[3, 0],
		[2, 0],
		[2, 3.5],
	],
	C: [
		[5, 7],
		[1, 7],
		[0, 6],
		[0, 1],
		[1, 0],
		[5, 0],
		[5, 1],
		[1, 1],
		[1, 6],
		[5, 6],
	],
	I: [
		[0, 0],
		[5, 0],
		[5, 1],
		[3, 1],
		[3, 6],
		[5, 6],
		[5, 7],
		[0, 7],
		[0, 6],
		[2, 6],
		[2, 1],
		[0, 1],
	],
	T: [
		[0, 7],
		[5, 7],
		[5, 6],
		[3, 6],
		[3, 0],
		[2, 0],
		[2, 6],
		[0, 6],
	],
};

function random(seed: number): () => number {
	return () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}
const soilHeight = (x: number, z: number) =>
	0.06 +
	Math.sin(x * 1.7 + z) * 0.065 +
	Math.sin(x * 3.2 - z * 2.4) * 0.04 +
	Math.max(0, z) * (0.13 + 0.09 * Math.sin(x * 2));

export class NatureSignatureScene {
	readonly renderer: THREE.WebGLRenderer;
	readonly scene = new THREE.Scene();
	readonly camera = new THREE.OrthographicCamera(-7, 7, 2.5, -2.5, 0.1, 60);
	private world = new THREE.Group();
	private sky = new THREE.HemisphereLight(0xeaf4dd, 0x655342, 2);
	private sun = new THREE.DirectionalLight(0xffebbe, 3.6);
	private rim = new THREE.DirectionalLight(0xb9e9e4, 1.3);
	private flies: {
		group: THREE.Group;
		halo: THREE.Sprite;
		light?: THREE.PointLight;
		seed: number;
	}[] = [];
	private grass: THREE.InstancedMesh;
	private grassBases: THREE.Matrix4[] = [];
	private dummy = new THREE.Object3D();
	private glowTexture: THREE.CanvasTexture;
	private dark = false;
	private textures: THREE.Texture[] = [];
	private reliefMaps = new Map<THREE.Texture, THREE.Texture>();
	private surfaceMaps = new Map<THREE.Texture, THREE.Texture>();
	private environment: THREE.WebGLRenderTarget;
	private angle = 0;
	private targetAngle = 0;
	private lastGrassFrame = -1;
	private shadowAngle = Number.NaN;

	constructor(canvas: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: true,
			antialias: false,
			powerPreference: "low-power",
		});
		this.renderer.setClearColor(0, 0);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.05;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFShadowMap;
		this.renderer.shadowMap.autoUpdate = false;
		this.scene.add(this.world, this.sky, this.sun, this.rim);
		this.environment = this.makeEnvironment();
		this.scene.environment = this.environment.texture;
		this.camera.position.set(0.8, 5.7, 14);
		this.camera.lookAt(0, 0.6, 0);
		this.sun.position.set(-4, 7, 5);
		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(1024, 1024);
		Object.assign(this.sun.shadow.camera, {
			left: -7,
			right: 7,
			top: 4,
			bottom: -4,
			near: 0.5,
			far: 24,
		});
		this.sun.shadow.bias = -0.0006;
		this.sun.shadow.normalBias = 0.025;
		this.rim.position.set(4, 3, -4);

		const earth = this.texture("earth");
		const rock = this.texture("stone");
		const turf = this.texture("grass");
		const earthMat = new THREE.MeshStandardMaterial({
			map: earth,
			bumpMap: this.reliefMaps.get(earth),
			bumpScale: 0.045,
			roughnessMap: this.surfaceMaps.get(earth),
			aoMap: this.surfaceMaps.get(earth),
			aoMapIntensity: 0.55,
			roughness: 1,
			color: 0xffffff,
			flatShading: true,
		});
		const letterMat = new THREE.MeshStandardMaterial({
			map: rock,
			bumpMap: this.reliefMaps.get(rock),
			bumpScale: 0.04,
			roughnessMap: this.surfaceMaps.get(rock),
			aoMap: this.surfaceMaps.get(rock),
			aoMapIntensity: 0.7,
			roughness: 0.94,
			color: 0xffffff,
			vertexColors: true,
		});
		const grassMat = new THREE.MeshStandardMaterial({
			map: turf,
			color: 0xc8d1a7,
			roughness: 1,
			flatShading: true,
		});
		this.buildIsland(earthMat, grassMat);
		const rnd = random(19731);
		const grassPositions: THREE.Vector3[] = [];
		const topPositions: THREE.Vector3[] = [];

		[..."SKYCITY"].forEach((letter, i) => {
			const points = outlines[letter];
			const shape = new THREE.Shape(
				points.map(([x, y]) => new THREE.Vector2(x * 0.25, y * 0.25)),
			);
			const geometry = new THREE.ExtrudeGeometry(shape, {
				depth: 0.54,
				bevelEnabled: true,
				bevelSize: 0.022,
				bevelThickness: 0.022,
				bevelSegments: 1,
				steps: 1,
				curveSegments: 1,
			});
			const colors: number[] = [];
			const vertices = geometry.getAttribute("position");
			for (let vertex = 0; vertex < vertices.count; vertex++) {
				const color = new THREE.Color(0x949b81).lerp(
					new THREE.Color(0xffffff),
					THREE.MathUtils.smoothstep(vertices.getY(vertex), 0, 1.35),
				);
				colors.push(color.r, color.g, color.b);
			}
			geometry.setAttribute(
				"color",
				new THREE.Float32BufferAttribute(colors, 3),
			);
			const mesh = new THREE.Mesh(geometry, letterMat);
			mesh.position.set(
				-5.125 + i * 1.5,
				-0.06 + Math.sin(i * 1.8) * 0.035,
				-0.12,
			);
			mesh.castShadow = mesh.receiveShadow = true;
			this.world.add(mesh);
			// Moss lies on the actual upper silhouette, including the angled Y and K.
			for (let sample = 0; sample < 25; sample++) {
				const x = (sample + 0.5) / 5;
				let top = 0;
				for (let j = 0; j < points.length; j++) {
					const a = points[j],
						b = points[(j + 1) % points.length];
					if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x))
						top = Math.max(
							top,
							a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]),
						);
				}
				const px = mesh.position.x + x * 0.25;
				const py = mesh.position.y + top * 0.25 + 0.014;
				this.box(
					0.051,
					0.035 + rnd() * 0.018,
					0.56,
					new THREE.Vector3(px, py, 0.15),
					grassMat,
				);
				if (sample % 3 === 0)
					this.box(
						0.04 + rnd() * 0.035,
						0.035 + rnd() * 0.085,
						0.016,
						new THREE.Vector3(px, py - 0.025 - rnd() * 0.02, 0.429),
						grassMat,
					);
				topPositions.push(new THREE.Vector3(px, py + 0.018, 0.05));
				for (let blade = 0; blade < 3; blade++)
					grassPositions.push(
						new THREE.Vector3(
							px + (rnd() - 0.5) * 0.05,
							py + 0.03,
							-0.1 + rnd() * 0.5,
						),
					);
			}
		});

		for (let i = 0; i < 1550; i++) {
			const x = (rnd() - 0.5) * 11.45,
				z = (rnd() - 0.5) * 2.2;
			if (
				(x / 5.9) ** 2 + (z / 1.25) ** 2 > 0.92 ||
				(Math.abs(z) < 0.32 && rnd() < 0.65)
			)
				continue;
			grassPositions.push(new THREE.Vector3(x, soilHeight(x, z) + 0.025, z));
		}
		const bladeGeo = new THREE.BufferGeometry();
		bladeGeo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(
				[
					-0.019, 0, 0, 0.019, 0, 0, 0.014, 0.11, 0, 0.014, 0.11, 0, -0.019, 0,
					0, -0.027, 0.2, 0,
				],
				3,
			),
		);
		bladeGeo.computeVertexNormals();
		const bladeMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			side: THREE.DoubleSide,
			roughness: 1,
		});
		const bladeColors = [
			0x465841, 0x60704a, 0x748052, 0x8b9664, 0x9aa479, 0xb1ad71,
		];
		this.grass = new THREE.InstancedMesh(
			bladeGeo,
			bladeMat,
			grassPositions.length,
		);
		grassPositions.forEach((p, i) => {
			this.dummy.position.copy(p);
			this.dummy.rotation.set(0, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.3);
			this.dummy.scale.setScalar(0.35 + rnd() * 0.7);
			this.dummy.updateMatrix();
			this.grass.setMatrixAt(i, this.dummy.matrix);
			this.grassBases.push(this.dummy.matrix.clone());
			this.grass.setColorAt(
				i,
				new THREE.Color(bladeColors[Math.floor(rnd() * bladeColors.length)]),
			);
		});
		this.grass.castShadow = this.grass.receiveShadow = true;
		this.world.add(this.grass);

		const stoneMat = new THREE.MeshStandardMaterial({
			color: 0x7c7d68,
			roughness: 1,
			flatShading: true,
		});
		const pebbleGeo = new THREE.DodecahedronGeometry(1, 0);
		for (let i = 0; i < 38; i++) {
			const x = (rnd() - 0.5) * 11,
				z = 0.42 + rnd() * 0.65;
			const pebble = new THREE.Mesh(pebbleGeo, stoneMat);
			pebble.position.set(x, soilHeight(x, z) + 0.015, z);
			pebble.scale.set(
				0.045 + rnd() * 0.12,
				0.025 + rnd() * 0.07,
				0.04 + rnd() * 0.08,
			);
			pebble.rotation.set(rnd(), rnd() * 4, rnd());
			pebble.castShadow = pebble.receiveShadow = true;
			this.world.add(pebble);
		}
		const flowers = [
			topPositions[7],
			topPositions[50],
			topPositions[97],
			topPositions[154],
			new THREE.Vector3(-4.4, soilHeight(-4.4, 0.7), 0.7),
			new THREE.Vector3(-1.6, soilHeight(-1.6, 0.9), 0.9),
			new THREE.Vector3(2.5, soilHeight(2.5, 0.65), 0.65),
			new THREE.Vector3(4.1, soilHeight(4.1, 0.8), 0.8),
		];
		flowers.forEach((p, i) => this.flower(p, i % 3 === 0));
		this.batchStaticMeshes();
		this.glowTexture = this.makeGlow();
		this.buildFireflies();
		this.setTheme(false);
	}

	/** Clustered color ramps, broken sediment lines and relief share one pixel grid. */
	private texture(kind: "earth" | "stone" | "grass"): THREE.CanvasTexture {
		const canvas = document.createElement("canvas"),
			relief = document.createElement("canvas"),
			surface = document.createElement("canvas");
		canvas.width =
			canvas.height =
			relief.width =
			relief.height =
			surface.width =
			surface.height =
				128;
		const ctx = canvas.getContext("2d")!,
			height = relief.getContext("2d")!,
			packed = surface.getContext("2d")!;
		const hash = (x: number, y: number) => {
			const n = Math.sin(x * 127.1 + y * 311.7 + 37) * 43758.5453;
			return n - Math.floor(n);
		};
		const noise = (x: number, y: number, step: number) => {
			const px = x / step,
				py = y / step,
				ix = Math.floor(px),
				iy = Math.floor(py);
			const fx = px - ix,
				fy = py - iy;
			return THREE.MathUtils.lerp(
				THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), fx),
				THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx),
				fy,
			);
		};
		const palettes = {
			stone: [
				"#4d5145",
				"#656451",
				"#7d7860",
				"#92876c",
				"#a6987b",
				"#b7a88c",
				"#cbb99a",
				"#deccac",
			],
			earth: [
				"#302d27",
				"#41372c",
				"#524431",
				"#625039",
				"#735c42",
				"#846b4e",
				"#927b5b",
				"#a28b69",
			],
			grass: [
				"#354936",
				"#45593d",
				"#556743",
				"#66784b",
				"#7b8956",
				"#909c66",
				"#a3ab77",
				"#b8bc89",
			],
		};
		for (let y = 0; y < 128; y++)
			for (let x = 0; x < 128; x++) {
				const broad = noise(x, y, 19),
					cluster = noise(x, y, 5),
					grain = hash(x, y);
				const strata = Math.sin(
					(y + Math.sin(x * 0.075) * 2 + noise(x, y, 25) * 9) * 0.43,
				);
				let value =
					0.23 +
					broad * 0.36 +
					cluster * 0.28 +
					(grain - 0.5) * 0.07 +
					(kind === "grass" ? 0 : strata * 0.065);
				const seam = (y + Math.floor(noise(x, 0, 15) * 7)) % 17;
				if (kind !== "grass" && seam < 1 && broad > 0.4) value -= 0.18;
				if (
					kind !== "grass" &&
					hash(Math.floor(x / 3), Math.floor(y / 2)) > 0.975
				)
					value += 0.16;
				const index = THREE.MathUtils.clamp(Math.floor(value * 8), 0, 7);
				ctx.fillStyle = palettes[kind][index];
				ctx.fillRect(x, y, 1, 1);
				const level = Math.floor(70 + value * 130);
				height.fillStyle = "rgb(" + level + "," + level + "," + level + ")";
				height.fillRect(x, y, 1, 1);
				// R = small-scale occlusion; G = roughness. Damp seams are less rough than dry grains.
				const occlusion = Math.floor(135 + value * 115),
					roughness = Math.floor(155 + cluster * 88);
				packed.fillStyle = "rgb(" + occlusion + "," + roughness + ",0)";
				packed.fillRect(x, y, 1, 1);
			}
		const texture = new THREE.CanvasTexture(canvas),
			bump = new THREE.CanvasTexture(relief),
			orm = new THREE.CanvasTexture(surface);
		texture.colorSpace = THREE.SRGBColorSpace;
		for (const map of [texture, bump, orm]) {
			map.magFilter = map.minFilter = THREE.NearestFilter;
			map.wrapS = map.wrapT = THREE.RepeatWrapping;
			map.repeat.set(
				kind === "grass" ? 5 : kind === "earth" ? 7 : 0.75,
				kind === "grass" ? 1.5 : kind === "earth" ? 1 : 0.75,
			);
			this.textures.push(map);
		}
		this.reliefMaps.set(texture, bump);
		this.surfaceMaps.set(texture, orm);
		return texture;
	}

	private makeEnvironment(): THREE.WebGLRenderTarget {
		const canvas = document.createElement("canvas");
		canvas.width = 256;
		canvas.height = 128;
		const ctx = canvas.getContext("2d")!;
		const sky = ctx.createLinearGradient(0, 0, 0, 128);
		sky.addColorStop(0, "#6a92af");
		sky.addColorStop(0.46, "#d1e0df");
		sky.addColorStop(0.53, "#eee4cb");
		sky.addColorStop(1, "#575845");
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, 256, 128);
		const map = new THREE.CanvasTexture(canvas);
		map.mapping = THREE.EquirectangularReflectionMapping;
		map.colorSpace = THREE.SRGBColorSpace;
		const generator = new THREE.PMREMGenerator(this.renderer);
		const target = generator.fromEquirectangular(map);
		generator.dispose();
		map.dispose();
		return target;
	}

	/** Static scenery is batched by material, retaining normals, UVs and true shadows. */
	private batchStaticMeshes(): void {
		this.world.updateMatrixWorld(true);
		const batches = new Map<
			THREE.Material,
			{ sources: THREE.Mesh[]; geometries: THREE.BufferGeometry[] }
		>();
		this.world.traverse((object) => {
			if (
				!(object instanceof THREE.Mesh) ||
				object instanceof THREE.InstancedMesh ||
				Array.isArray(object.material)
			)
				return;
			const batch = batches.get(object.material) ?? {
				sources: [],
				geometries: [],
			};
			const geometry = object.geometry.index
				? object.geometry.toNonIndexed()
				: object.geometry.clone();
			geometry.applyMatrix4(object.matrixWorld);
			geometry.clearGroups();
			batch.sources.push(object);
			batch.geometries.push(geometry);
			batches.set(object.material, batch);
		});
		const originals = new Set<THREE.BufferGeometry>();
		for (const [material, { sources, geometries }] of batches) {
			const merged = mergeGeometries(geometries, false);
			geometries.forEach((g) => g.dispose());
			if (!merged) continue;
			const mesh = new THREE.Mesh(merged, material);
			mesh.castShadow = mesh.receiveShadow = true;
			sources.forEach((source) => {
				originals.add(source.geometry);
				source.removeFromParent();
			});
			this.world.add(mesh);
		}
		originals.forEach((g) => g.dispose());
	}

	private buildIsland(earth: THREE.Material, grass: THREE.Material): void {
		const segments = 100,
			rings = 9;
		const positions: number[] = [],
			uvs: number[] = [],
			indices: number[] = [];
		const point = (i: number, r: number) => {
			const a = (i / segments) * Math.PI * 2;
			const ripple = 1 + 0.025 * Math.sin(a * 13) + 0.018 * Math.cos(a * 23);
			return new THREE.Vector3(
				Math.cos(a) * 5.9 * r * ripple,
				0,
				Math.sin(a) * 1.22 * r * ripple,
			);
		};
		for (let ring = 0; ring <= rings; ring++)
			for (let i = 0; i <= segments; i++) {
				const p = point(i, ring / rings);
				p.y = soilHeight(p.x, p.z);
				positions.push(p.x, p.y, p.z);
				uvs.push(p.x / 12 + 0.5, p.z / 2.5 + 0.5);
			}
		for (let r = 0; r < rings; r++)
			for (let i = 0; i < segments; i++) {
				const a = r * (segments + 1) + i,
					b = a + segments + 1;
				indices.push(a, a + 1, b, b, a + 1, b + 1);
			}
		const top = new THREE.BufferGeometry();
		top.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3),
		);
		top.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
		top.setIndex(indices);
		top.computeVertexNormals();
		const turf = new THREE.Mesh(top, grass);
		turf.receiveShadow = true;
		turf.castShadow = true;
		this.world.add(turf);
		const sidePos: number[] = [],
			sideUv: number[] = [],
			sideIdx: number[] = [];
		for (let layer = 0; layer <= 4; layer++)
			for (let i = 0; i <= segments; i++) {
				const p = point(i, 1 - layer * 0.04);
				const a = (i / segments) * Math.PI * 2;
				const bottom = 0.7 + 0.13 * Math.sin(a * 9) + 0.1 * Math.cos(a * 17);
				sidePos.push(p.x, soilHeight(p.x, p.z) - (layer / 4) * bottom, p.z);
				sideUv.push(i / segments, layer / 4);
			}
		for (let r = 0; r < 4; r++)
			for (let i = 0; i < segments; i++) {
				const a = r * (segments + 1) + i,
					b = a + segments + 1;
				sideIdx.push(a, a + 1, b, b, a + 1, b + 1);
			}
		const sides = new THREE.BufferGeometry();
		sides.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(sidePos, 3),
		);
		sides.setAttribute("uv", new THREE.Float32BufferAttribute(sideUv, 2));
		sides.setIndex(sideIdx);
		sides.computeVertexNormals();
		const soil = new THREE.Mesh(sides, earth);
		soil.castShadow = soil.receiveShadow = true;
		this.world.add(soil);
		// Exposed roots cross the soil edge in real geometry, with no painted outline.
		const rootMat = new THREE.MeshStandardMaterial({
			color: 0x4b3829,
			roughness: 1,
		});
		const rnd = random(398);
		for (let i = 0; i < 22; i++) {
			const x = (rnd() - 0.5) * 10.8,
				z = Math.sqrt(1 - (x / 5.9) ** 2) * 1.2;
			const root = new THREE.Mesh(
				new THREE.CylinderGeometry(0.015, 0.007, 0.18 + rnd() * 0.25, 4),
				rootMat,
			);
			root.position.set(x, soilHeight(x, z) - 0.12, z);
			root.rotation.z = (rnd() - 0.5) * 0.8;
			this.world.add(root);
		}
	}

	private box(
		w: number,
		h: number,
		d: number,
		p: THREE.Vector3,
		material: THREE.Material,
	): THREE.Mesh {
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
		mesh.position.copy(p);
		mesh.castShadow = mesh.receiveShadow = true;
		this.world.add(mesh);
		return mesh;
	}

	private flower(p: THREE.Vector3, yellow: boolean): void {
		const group = new THREE.Group();
		group.position.copy(p);
		group.scale.setScalar(1.25);
		const stemMat = new THREE.MeshStandardMaterial({
			color: 0x476136,
			roughness: 1,
		});
		const petalMat = new THREE.MeshStandardMaterial({
			color: yellow ? 0xe8c664 : 0xf0ebd4,
			roughness: 0.85,
		});
		const centerMat = new THREE.MeshStandardMaterial({
			color: 0xe4aa39,
			roughness: 1,
		});
		const stem = new THREE.Mesh(
			new THREE.BoxGeometry(0.018, 0.21, 0.018),
			stemMat,
		);
		stem.position.y = 0.105;
		group.add(stem);
		const core = new THREE.Mesh(
			new THREE.BoxGeometry(0.047, 0.025, 0.047),
			centerMat,
		);
		core.position.y = 0.22;
		group.add(core);
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * Math.PI * 2;
			const petal = new THREE.Mesh(
				new THREE.BoxGeometry(0.055, 0.018, 0.04),
				petalMat,
			);
			petal.position.set(Math.cos(a) * 0.045, 0.218, Math.sin(a) * 0.045);
			petal.rotation.y = -a;
			petal.castShadow = true;
			group.add(petal);
		}
		this.world.add(group);
	}

	private makeGlow(): THREE.CanvasTexture {
		const c = document.createElement("canvas");
		c.width = c.height = 64;
		const ctx = c.getContext("2d")!;
		const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
		gradient.addColorStop(0, "rgba(203,255,149,1)");
		gradient.addColorStop(0.13, "rgba(142,255,85,.65)");
		gradient.addColorStop(0.4, "rgba(105,243,61,.14)");
		gradient.addColorStop(1, "rgba(77,212,44,0)");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 64, 64);
		const texture = new THREE.CanvasTexture(c);
		this.textures.push(texture);
		return texture;
	}

	private buildFireflies(): void {
		const coreGeo = new THREE.BoxGeometry(0.024, 0.024, 0.024);
		const coreMat = new THREE.MeshBasicMaterial({ color: 0xd3ff89 });
		for (let i = 0; i < 22; i++) {
			const group = new THREE.Group();
			const halo = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: this.glowTexture,
					transparent: true,
					depthWrite: false,
					blending: THREE.AdditiveBlending,
				}),
			);
			halo.scale.setScalar(0.4);
			group.add(halo, new THREE.Mesh(coreGeo, coreMat));
			let light: THREE.PointLight | undefined;
			if (i < 4) {
				light = new THREE.PointLight(0x9cff55, 0, 2.2, 2);
				group.add(light);
			}
			this.world.add(group);
			this.flies.push({ group, halo, light, seed: i * 2.39996 });
		}
	}

	setTheme(dark: boolean): void {
		this.dark = dark;
		this.sky.color.set(dark ? 0xa6bdcf : 0xe9f1dc);
		this.sky.groundColor.set(dark ? 0x596359 : 0x766044);
		this.sky.intensity = dark ? 1.6 : 1.45;
		this.sun.color.set(dark ? 0xb5cddd : 0xffefd0);
		this.sun.intensity = dark ? 2.4 : 4.1;
		this.rim.color.set(dark ? 0x88b5d8 : 0xc3e6c6);
		this.rim.intensity = dark ? 2.2 : 1.15;
		this.renderer.toneMappingExposure = dark ? 1.06 : 1.12;
		this.scene.environmentIntensity = dark ? 0.12 : 0.42;
		this.renderer.shadowMap.needsUpdate = true;
	}

	resize(width: number, height: number): void {
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		this.renderer.setSize(width, height, false);
		const aspect = width / height;
		const horizontal = Math.max(6.65, 2.45 * aspect);
		this.camera.left = -horizontal;
		this.camera.right = horizontal;
		this.camera.top = horizontal / aspect;
		this.camera.bottom = -horizontal / aspect;
		this.camera.updateProjectionMatrix();
	}

	setView(value: number): void {
		this.targetAngle = Math.max(-0.3, Math.min(0.3, value));
	}

	render(time: number, still = false): void {
		const phase = (time / 32) * Math.PI * 2;
		this.angle = still
			? 0
			: this.angle + (this.targetAngle - this.angle) * 0.055;
		this.world.rotation.y =
			-0.14 + this.angle + (still ? 0 : Math.sin(phase) * 0.028);
		if (
			!Number.isFinite(this.shadowAngle) ||
			Math.abs(this.world.rotation.y - this.shadowAngle) > 0.015
		) {
			this.shadowAngle = this.world.rotation.y;
			this.renderer.shadowMap.needsUpdate = true;
		}
		this.flies.forEach(({ group, halo, light, seed }, i) => {
			group.position.set(
				Math.sin(seed * 3.1) * 4.9 + Math.sin(phase + seed) * 0.38,
				0.35 +
					(Math.sin(seed * 1.7) + 1) * 0.74 +
					Math.sin(phase * 2 + seed) * 0.17,
				Math.cos(seed * 2.3) * 1.0 + 0.35 + Math.sin(phase + seed) * 0.35,
			);
			const pulse = 0.42 + (Math.sin(phase * 3 + seed) + 1) * 0.29;
			halo.material.opacity = this.dark ? pulse * 0.9 : 0.04;
			halo.scale.setScalar(this.dark ? 0.42 + pulse * 0.18 : 0.12);
			group.children[1].scale.setScalar(this.dark ? 0.85 + pulse * 0.3 : 0.6);
			if (light) light.intensity = this.dark ? pulse : 0;
			group.visible = this.dark || i % 2 === 0;
		});
		const grassFrame = Math.floor(time * 18);
		if (grassFrame !== this.lastGrassFrame) {
			this.lastGrassFrame = grassFrame;
			const sway = new THREE.Matrix4(),
				matrix = new THREE.Matrix4();
			this.grassBases.forEach((base, i) => {
				sway.makeRotationZ(still ? 0 : Math.sin(phase * 2 + i * 0.17) * 0.075);
				this.grass.setMatrixAt(i, matrix.multiplyMatrices(base, sway));
			});
			this.grass.instanceMatrix.needsUpdate = true;
		}
		this.renderer.render(this.scene, this.camera);
	}

	dispose(): void {
		const geometries = new Set<THREE.BufferGeometry>(),
			materials = new Set<THREE.Material>();
		this.scene.traverse((obj) => {
			if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
				if (obj instanceof THREE.Mesh) geometries.add(obj.geometry);
				(Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(
					(m) => materials.add(m),
				);
			}
		});
		geometries.forEach((g) => g.dispose());
		materials.forEach((m) => m.dispose());
		this.textures.forEach((t) => t.dispose());
		this.environment.dispose();
		this.sun.shadow.dispose();
		this.renderer.dispose();
		this.renderer.forceContextLoss();
	}
}
