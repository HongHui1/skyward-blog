/**
 * l2d-widget 0.1.0 / Cubism 6 defaults to a single mask atlas (36 groups).
 * Allocate enough atlases for models with more than 36 clipping groups,
 * using 32 groups per atlas as required by Cubism's multi-texture layout.
 * Re-run after updating the vendored runtime; fail if the upstream code changes.
 */
import { readFile, writeFile } from "node:fs/promises";

const runtime = new URL("../public/pio/l2d-widget.min.js", import.meta.url);
const original = "initialize(e,t=1){e.isUsingMasking()";
const patched = 'initialize(e,t=1){/* skycity: allocate mask atlases */let n=e.getDrawableMasks(),r=e.getDrawableMaskCounts(),i=new Set;for(let e=0;e<r.length;e++)r[e]>0&&i.add(Array.from(n[e]).sort((e,t)=>e-t).join(","));t=Math.max(t,Math.ceil(i.size/32));e.isUsingMasking()';
let code = await readFile(runtime, "utf8");
const initialCode = code;
if (code.includes(patched)) {
	console.log("Live2D mask atlas patch already applied.");
} else {
	if (code.split(original).length !== 2) {
		throw new Error("Live2D runtime changed; review the mask atlas patch before applying it.");
	}
	code = code.replace(original, patched);
	console.log("Live2D renderer now allocates mask atlases from the model's clipping groups.");
}

// Custom VTube Studio inputs feed physics. The upstream override runs only
// after physics, then loadParameters() discards it at the next frame's start.
// Apply overrides before physics as well, keeping the final override intact.
const lateUpdate = "this._updateScheduler.onLateUpdate(this._model,e)";
const physicsInputs = '/* skycity: drive physics inputs */this._forcedParams&&Object.entries(this._forcedParams).forEach(([e,t])=>this._model.setParameterValueById(X.getIdManager().getId(e),t,1)),' + lateUpdate;
if (!code.includes(physicsInputs)) {
	if (code.split(lateUpdate).length !== 2) {
		throw new Error("Live2D runtime changed; review parameter update ordering.");
	}
	code = code.replace(lateUpdate, physicsInputs);
}

// Keep rendering at 30fps; mouse smoothing remains frame-rate independent.
const renderLoop = "run(){let e=t=>{Eo(t),";
const limitedLoop = "run(){/* skycity: 30fps render budget */let n=0,e=t=>{if(this._skyPaused)return;if(t!=null&&t-n<1e3/30){this._drawFrameId=window.requestAnimationFrame(e);return}n=t==null?0:t-(t-n)%(1e3/30);Eo(t),";
if (!code.includes(limitedLoop)) {
	if (code.split(renderLoop).length !== 2) throw new Error("Live2D render loop changed; review the frame budget.");
	code = code.replace(renderLoop, limitedLoop);
}

// Expose lifecycle control through the wrapper, instead of reaching into it
// from the iframe. Stop WebGL updates while hidden or with reduced motion.
const parameterGetter = "getParams(){return this._state.currentVersion===2";
const lifecycle = "setPaused(e){/* skycity: renderer lifecycle */if((this._skyPaused??false)===e)return;this._skyPaused=e;let t=this._state.l2d6Model;t&&(t._skyPaused=e,e?t.stop():(Nt.updateTime(),t.run()))}" + parameterGetter;
if (!code.includes(lifecycle)) {
	if (code.split(parameterGetter).length !== 2) throw new Error("Live2D wrapper changed; review renderer lifecycle control.");
	code = code.replace(parameterGetter, lifecycle);
}
if (code !== initialCode) await writeFile(runtime, code);
console.log("Live2D patches applied: mask capacity, physics inputs, 30fps budget and renderer lifecycle.");
