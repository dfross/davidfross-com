export const LIQUID_WAVE_PALETTE = [
	'#3f6c50', // --palette-green: deep terminal phosphor green (outer wake)
	'#4f7e9b', // --palette-blue: LexisNexis steel blue (wave body)
	'#90c5e9', // --palette-blue-light: luminous slate blue (mid-wave flow)
	'#bcb3a5', // --palette-muted: warm stone transition
	'#ff6d50', // --palette-red: vibrant terminal red (high-velocity crest)
	'#ceb288', // --palette-tan: warm vintage amber/tan (core highlight)
] as const

const WAVE_STOP_VARS = ['--wave-stop-1', '--wave-stop-2', '--wave-stop-3', '--wave-stop-4', '--wave-stop-5', '--wave-stop-6'] as const

export interface LiquidWaveOptions {
	colors?: readonly string[]
	color1?: string
	color2?: string
	color3?: string
	mouseForce?: number
	cursorSize?: number
	isViscous?: boolean
	viscous?: number
	iterationsViscous?: number
	iterationsPoisson?: number
	dt?: number
	BFECC?: boolean
	resolution?: number
	isBounce?: boolean
	autoDemo?: boolean
	autoSpeed?: number
	autoIntensity?: number
	takeoverDuration?: number
	autoResumeDelay?: number
	autoRampDuration?: number
}

const FACE_VERT = `
	attribute vec3 position;
	uniform vec2 px;
	uniform vec2 boundarySpace;
	varying vec2 uv;
	precision highp float;
	void main() {
		vec3 pos = position;
		vec2 scale = 1.0 - boundarySpace * 2.0;
		pos.xy = pos.xy * scale;
		uv = vec2(0.5) + (pos.xy) * 0.5;
		gl_Position = vec4(pos, 1.0);
	}
`

const LINE_VERT = `
	attribute vec3 position;
	uniform vec2 px;
	precision highp float;
	varying vec2 uv;
	void main() {
		vec3 pos = position;
		uv = 0.5 + pos.xy * 0.5;
		vec2 n = sign(pos.xy);
		pos.xy = abs(pos.xy) - px * 1.0;
		pos.xy *= n;
		gl_Position = vec4(pos, 1.0);
	}
`

const MOUSE_VERT = `
	precision highp float;
	attribute vec3 position;
	attribute vec2 uv;
	uniform vec2 center;
	uniform vec2 scale;
	uniform vec2 px;
	varying vec2 vUv;
	void main() {
		vec2 pos = position.xy * scale * 2.0 * px + center;
		vUv = uv;
		gl_Position = vec4(pos, 0.0, 1.0);
	}
`

const ADVECTION_FRAG = `
	precision highp float;
	uniform sampler2D velocity;
	uniform float dt;
	uniform bool isBFECC;
	uniform vec2 fboSize;
	uniform vec2 px;
	varying vec2 uv;
	void main() {
		vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
		if (isBFECC == false) {
			vec2 vel = texture2D(velocity, uv).xy;
			vec2 uv2 = uv - vel * dt * ratio;
			vec2 newVel = texture2D(velocity, uv2).xy;
			gl_FragColor = vec4(newVel, 0.0, 0.0);
		} else {
			vec2 spot_new = uv;
			vec2 vel_old = texture2D(velocity, uv).xy;
			vec2 spot_old = spot_new - vel_old * dt * ratio;
			vec2 vel_new1 = texture2D(velocity, spot_old).xy;
			vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
			vec2 error = spot_new2 - spot_new;
			vec2 spot_new3 = spot_new - error / 2.0;
			vec2 vel_2 = texture2D(velocity, spot_new3).xy;
			vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
			vec2 newVel2 = texture2D(velocity, spot_old2).xy;
			gl_FragColor = vec4(newVel2, 0.0, 0.0);
		}
	}
`

const COLOR_FRAG = `
	precision highp float;
	uniform sampler2D velocity;
	uniform sampler2D palette;
	uniform vec4 bgColor;
	varying vec2 uv;
	void main() {
		vec2 vel = texture2D(velocity, uv).xy;
		float rawLen = length(vel);
		// Gentle knee at the top end so the full palette shows without harsh white-hot clipping
		float lenv = clamp(rawLen / (1.0 + rawLen * 0.22), 0.0, 1.0);
		vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb * 0.9;
		// Output straight RGB when compositing over transparent canvas so gl.SRC_ALPHA doesn't premultiply twice
		vec3 outRGB = bgColor.a > 0.0 ? mix(bgColor.rgb, c, lenv) : c;
		float outA = mix(bgColor.a, 0.56, lenv);
		gl_FragColor = vec4(outRGB, outA);
	}
`

const DIVERGENCE_FRAG = `
	precision highp float;
	uniform sampler2D velocity;
	uniform float dt;
	uniform vec2 px;
	varying vec2 uv;
	void main() {
		float x0 = texture2D(velocity, uv - vec2(px.x, 0.0)).x;
		float x1 = texture2D(velocity, uv + vec2(px.x, 0.0)).x;
		float y0 = texture2D(velocity, uv - vec2(0.0, px.y)).y;
		float y1 = texture2D(velocity, uv + vec2(0.0, px.y)).y;
		float divergence = (x1 - x0 + y1 - y0) / 2.0;
		gl_FragColor = vec4(divergence / dt);
	}
`

const EXTERNAL_FORCE_FRAG = `
	precision highp float;
	uniform vec2 force;
	uniform vec2 center;
	uniform vec2 scale;
	uniform vec2 px;
	varying vec2 vUv;
	void main() {
		vec2 circle = (vUv - 0.5) * 2.0;
		float d = 1.0 - min(length(circle), 1.0);
		d *= d;
		gl_FragColor = vec4(force * d, 0.0, 1.0);
	}
`

const POISSON_FRAG = `
	precision highp float;
	uniform sampler2D pressure;
	uniform sampler2D divergence;
	uniform vec2 px;
	varying vec2 uv;
	void main() {
		float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
		float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
		float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
		float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
		float div = texture2D(divergence, uv).r;
		float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
		gl_FragColor = vec4(newP);
	}
`

const PRESSURE_FRAG = `
	precision highp float;
	uniform sampler2D pressure;
	uniform sampler2D velocity;
	uniform vec2 px;
	uniform float dt;
	varying vec2 uv;
	void main() {
		float step = 1.0;
		float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
		float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
		float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
		float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
		vec2 v = texture2D(velocity, uv).xy;
		vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
		v = v - gradP * dt;
		gl_FragColor = vec4(v, 0.0, 1.0);
	}
`

const VISCOUS_FRAG = `
	precision highp float;
	uniform sampler2D velocity;
	uniform sampler2D velocity_new;
	uniform float v;
	uniform vec2 px;
	uniform float dt;
	varying vec2 uv;
	void main() {
		vec2 old = texture2D(velocity, uv).xy;
		vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
		vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
		vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
		vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
		vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
		newv /= 4.0 * (1.0 + v * dt);
		gl_FragColor = vec4(newv, 0.0, 0.0);
	}
`

interface FBO {
	framebuffer: WebGLFramebuffer
	texture: WebGLTexture
	width: number
	height: number
}

function createShader(glCtx: WebGLRenderingContext, type: number, source: string) {
	const shader = glCtx.createShader(type)
	if (!shader) return null
	glCtx.shaderSource(shader, source)
	glCtx.compileShader(shader)
	if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
		glCtx.deleteShader(shader)
		return null
	}
	return shader
}

function initWebGLProgram(glCtx: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
	const vertexShader = createShader(glCtx, glCtx.VERTEX_SHADER, vertexSource)
	const fragmentShader = createShader(glCtx, glCtx.FRAGMENT_SHADER, fragmentSource)
	if (!vertexShader || !fragmentShader) return null

	const program = glCtx.createProgram()
	if (!program) return null
	glCtx.attachShader(program, vertexShader)
	glCtx.attachShader(program, fragmentShader)
	glCtx.linkProgram(program)
	if (!glCtx.getProgramParameter(program, glCtx.LINK_STATUS)) {
		glCtx.deleteProgram(program)
		return null
	}
	return program
}

type RgbTuple = [number, number, number]
type OklabTuple = [number, number, number]

function srgbToLinear(channel: number): number {
	const c = channel / 255
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(channel: number): number {
	const c = Math.max(0, Math.min(1, channel))
	const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
	return Math.round(encoded * 255)
}

function rgbToOklab([r8, g8, b8]: RgbTuple): OklabTuple {
	const r = srgbToLinear(r8)
	const g = srgbToLinear(g8)
	const b = srgbToLinear(b8)

	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	]
}

function oklabToRgb([L, a, b]: OklabTuple): RgbTuple {
	const l_ = L + 0.3963377774 * a + 0.2158037573 * b
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b
	const s_ = L - 0.0894841775 * a - 1.291485548 * b

	const l = l_ * l_ * l_
	const m = m_ * m_ * m_
	const s = s_ * s_ * s_

	return [
		linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	]
}

export function tryParseColorToRgb(colorStr: string): RgbTuple | null {
	const trimmed = colorStr.trim()
	const rgbMatch = /^rgb\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})\s*\)$/i.exec(trimmed)
	if (rgbMatch) {
		const r = Number(rgbMatch[1])
		const g = Number(rgbMatch[2])
		const b = Number(rgbMatch[3])
		if (r <= 255 && g <= 255 && b <= 255) {
			return [r, g, b]
		}
		return null
	}

	const clean = trimmed.replace(/^#/, '')
	if (clean.length === 3 && /^[0-9a-f]{3}$/i.test(clean)) {
		const r = parseInt(clean.charAt(0) + clean.charAt(0), 16)
		const g = parseInt(clean.charAt(1) + clean.charAt(1), 16)
		const b = parseInt(clean.charAt(2) + clean.charAt(2), 16)
		return [r, g, b]
	}
	if (clean.length === 6 && /^[0-9a-f]{6}$/i.test(clean)) {
		const r = parseInt(clean.slice(0, 2), 16)
		const g = parseInt(clean.slice(2, 4), 16)
		const b = parseInt(clean.slice(4, 6), 16)
		return [r, g, b]
	}

	return null
}

export function parseColorToRgb(colorStr: string): RgbTuple {
	return tryParseColorToRgb(colorStr) ?? [225, 218, 205] // fallback to #e1dacd (--palette-cream)
}

export function readWavePaletteFromCss(root: Element = document.documentElement): string[] | null {
	if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return null
	const style = window.getComputedStyle(root)
	const stops: string[] = []
	for (const varName of WAVE_STOP_VARS) {
		const value = style.getPropertyValue(varName).trim()
		if (!value || !tryParseColorToRgb(value)) {
			return null
		}
		stops.push(value)
	}
	return stops
}

export function buildPaletteData(stops: readonly string[], width = 256): Uint8Array {
	const validStops = stops.length > 0 ? stops : LIQUID_WAVE_PALETTE
	const normalizedStops = validStops.length === 1 ? [validStops[0]!, validStops[0]!] : validStops
	const rgbStops = normalizedStops.map(parseColorToRgb)
	const labStops = rgbStops.map(rgbToOklab)

	// Parameterize stops by cumulative OKLab distance for perceptually even color transitions
	const cumDist: number[] = [0]
	for (let i = 1; i < labStops.length; i++) {
		const prev = labStops[i - 1]!
		const curr = labStops[i]!
		const dist = Math.hypot(curr[0] - prev[0], curr[1] - prev[1], curr[2] - prev[2])
		cumDist.push(cumDist[i - 1]! + dist)
	}

	const totalDist = cumDist[cumDist.length - 1] ?? 0
	const data = new Uint8Array(width * 4)
	const lastStopIdx = rgbStops.length - 1

	for (let i = 0; i < width; i++) {
		let rgb: RgbTuple
		if (i === 0 || totalDist === 0) {
			rgb = rgbStops[0]!
		} else if (i === width - 1) {
			rgb = rgbStops[lastStopIdx]!
		} else {
			const target = (i / (width - 1)) * totalDist
			let idx = 0
			while (idx < cumDist.length - 2 && cumDist[idx + 1]! < target) {
				idx++
			}
			const startDist = cumDist[idx]!
			const endDist = cumDist[idx + 1]!
			const span = endDist - startDist
			const frac = span > 0 ? (target - startDist) / span : 0
			const c0 = labStops[idx]!
			const c1 = labStops[idx + 1]!
			rgb = oklabToRgb([c0[0] + (c1[0] - c0[0]) * frac, c0[1] + (c1[1] - c0[1]) * frac, c0[2] + (c1[2] - c0[2]) * frac])
		}

		data[i * 4 + 0] = rgb[0]
		data[i * 4 + 1] = rgb[1]
		data[i * 4 + 2] = rgb[2]
		data[i * 4 + 3] = 255
	}

	return data
}

function getSupportedTextureType(gl: WebGLRenderingContext): { type: number; filter: number } {
	const halfFloatExt = gl.getExtension('OES_texture_half_float') as { HALF_FLOAT_OES: number } | null
	const halfFloatLinear = gl.getExtension('OES_texture_half_float_linear')
	const floatExt = gl.getExtension('OES_texture_float')
	const floatLinear = gl.getExtension('OES_texture_float_linear')
	gl.getExtension('WEBGL_color_buffer_float')
	gl.getExtension('EXT_color_buffer_half_float')

	// Feature-detect renderable texture precision in preference order without UA sniffing
	const candidates: Array<{ type: number; filter: number }> = []
	if (halfFloatExt) {
		candidates.push({
			type: halfFloatExt.HALF_FLOAT_OES,
			filter: halfFloatLinear ? gl.LINEAR : gl.NEAREST,
		})
	}
	if (floatExt) {
		candidates.push({ type: gl.FLOAT, filter: floatLinear ? gl.LINEAR : gl.NEAREST })
	}

	for (const candidate of candidates) {
		const tex = gl.createTexture()
		const fb = gl.createFramebuffer()
		if (!tex || !fb) break
		gl.bindTexture(gl.TEXTURE_2D, tex)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, candidate.filter)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, candidate.filter)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, candidate.type, null)
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.bindTexture(gl.TEXTURE_2D, null)
		gl.deleteFramebuffer(fb)
		gl.deleteTexture(tex)
		if (status === gl.FRAMEBUFFER_COMPLETE) {
			return candidate
		}
	}

	return { type: gl.UNSIGNED_BYTE, filter: gl.LINEAR }
}

function createFBO(gl: WebGLRenderingContext, width: number, height: number, texConfig: { type: number; filter: number }): FBO | null {
	const texture = gl.createTexture()
	const framebuffer = gl.createFramebuffer()
	if (!texture || !framebuffer) return null

	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texConfig.filter)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texConfig.filter)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, texConfig.type, null)

	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
	gl.clearColor(0, 0, 0, 0)
	gl.clear(gl.COLOR_BUFFER_BIT)
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)
	gl.bindTexture(gl.TEXTURE_2D, null)

	return { framebuffer, texture, width, height }
}

function resizeFBO(gl: WebGLRenderingContext, fbo: FBO, width: number, height: number, texConfig: { type: number; filter: number }) {
	if (fbo.width === width && fbo.height === height) return
	fbo.width = width
	fbo.height = height
	gl.bindTexture(gl.TEXTURE_2D, fbo.texture)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, texConfig.type, null)
	gl.bindTexture(gl.TEXTURE_2D, null)
}

const SOFTWARE_RENDERER_RE = /swiftshader|llvmpipe|software|microsoft basic render/i

function isSoftwareRenderer(gl: WebGLRenderingContext): boolean {
	if (typeof gl.getExtension !== 'function' || typeof gl.getParameter !== 'function') {
		return false
	}
	const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
	if (!debugInfo) return false
	const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
	return typeof renderer === 'string' && SOFTWARE_RENDERER_RE.test(renderer)
}

export function initLiquidWave(options: LiquidWaveOptions = {}) {
	const canvas = document.getElementById('liquid-wave-canvas') as HTMLCanvasElement | null
	if (!canvas) return

	const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
	const forcedColorsQuery = window.matchMedia('(forced-colors: active)')
	if (reducedMotionQuery.matches || forcedColorsQuery.matches) return

	const gl = canvas.getContext('webgl', {
		alpha: true,
		antialias: false,
		powerPreference: 'default',
		failIfMajorPerformanceCaveat: true,
	})
	if (!gl || isSoftwareRenderer(gl)) return

	// Parse configuration from options or data attributes on canvas
	const dataset = canvas.dataset
	const customStopList = [options.color1 ?? dataset.color1, options.color2 ?? dataset.color2, options.color3 ?? dataset.color3].filter(
		Boolean,
	) as string[]
	const datasetColors = dataset.colors ? (JSON.parse(dataset.colors) as string[]) : undefined
	const paletteStops: readonly string[] =
		options.colors && options.colors.length > 0
			? options.colors
			: datasetColors && datasetColors.length > 0
				? datasetColors
				: customStopList.length > 0
					? customStopList
					: (readWavePaletteFromCss() ?? LIQUID_WAVE_PALETTE)

	const mouseForce = options.mouseForce ?? (dataset.mouseForce ? Number(dataset.mouseForce) : 20)
	const cursorSize = options.cursorSize ?? (dataset.cursorSize ? Number(dataset.cursorSize) : 100)
	const isViscous = options.isViscous ?? (dataset.isViscous ? dataset.isViscous === 'true' : false)
	const viscous = options.viscous ?? (dataset.viscous ? Number(dataset.viscous) : 30)
	const iterationsViscous = options.iterationsViscous ?? (dataset.iterationsViscous ? Number(dataset.iterationsViscous) : 32)
	const iterationsPoisson = options.iterationsPoisson ?? (dataset.iterationsPoisson ? Number(dataset.iterationsPoisson) : 16)
	const dt = options.dt ?? (dataset.dt ? Number(dataset.dt) : 0.014)
	const BFECC = options.BFECC ?? (dataset.bfecc ? dataset.bfecc !== 'false' : true)
	const resolution = options.resolution ?? (dataset.resolution ? Number(dataset.resolution) : 0.5)
	const isBounce = options.isBounce ?? (dataset.isBounce ? dataset.isBounce === 'true' : false)
	const autoDemo = options.autoDemo ?? (dataset.autoDemo ? dataset.autoDemo !== 'false' : true)
	const autoSpeed = options.autoSpeed ?? (dataset.autoSpeed ? Number(dataset.autoSpeed) : 0.5)
	const autoIntensity = options.autoIntensity ?? (dataset.autoIntensity ? Number(dataset.autoIntensity) : 2.2)
	const takeoverDuration = options.takeoverDuration ?? 0.25
	const autoResumeDelay = options.autoResumeDelay ?? 2500
	const autoRampDuration = options.autoRampDuration ?? 0.6

	// Compile shader programs
	const advectionProgram = initWebGLProgram(gl, FACE_VERT, ADVECTION_FRAG)
	const boundaryProgram = initWebGLProgram(gl, LINE_VERT, ADVECTION_FRAG)
	const externalForceProgram = initWebGLProgram(gl, MOUSE_VERT, EXTERNAL_FORCE_FRAG)
	const viscousProgram = initWebGLProgram(gl, FACE_VERT, VISCOUS_FRAG)
	const divergenceProgram = initWebGLProgram(gl, FACE_VERT, DIVERGENCE_FRAG)
	const poissonProgram = initWebGLProgram(gl, FACE_VERT, POISSON_FRAG)
	const pressureProgram = initWebGLProgram(gl, FACE_VERT, PRESSURE_FRAG)
	const colorProgram = initWebGLProgram(gl, FACE_VERT, COLOR_FRAG)

	if (
		!advectionProgram ||
		!boundaryProgram ||
		!externalForceProgram ||
		!viscousProgram ||
		!divergenceProgram ||
		!poissonProgram ||
		!pressureProgram ||
		!colorProgram
	) {
		return
	}

	const locations = {
		advection: {
			position: gl.getAttribLocation(advectionProgram, 'position'),
			boundarySpace: gl.getUniformLocation(advectionProgram, 'boundarySpace'),
			px: gl.getUniformLocation(advectionProgram, 'px'),
			fboSize: gl.getUniformLocation(advectionProgram, 'fboSize'),
			dt: gl.getUniformLocation(advectionProgram, 'dt'),
			isBFECC: gl.getUniformLocation(advectionProgram, 'isBFECC'),
			velocity: gl.getUniformLocation(advectionProgram, 'velocity'),
		},
		boundary: {
			position: gl.getAttribLocation(boundaryProgram, 'position'),
			px: gl.getUniformLocation(boundaryProgram, 'px'),
			fboSize: gl.getUniformLocation(boundaryProgram, 'fboSize'),
			dt: gl.getUniformLocation(boundaryProgram, 'dt'),
			isBFECC: gl.getUniformLocation(boundaryProgram, 'isBFECC'),
			velocity: gl.getUniformLocation(boundaryProgram, 'velocity'),
		},
		externalForce: {
			position: gl.getAttribLocation(externalForceProgram, 'position'),
			uv: gl.getAttribLocation(externalForceProgram, 'uv'),
			px: gl.getUniformLocation(externalForceProgram, 'px'),
			force: gl.getUniformLocation(externalForceProgram, 'force'),
			center: gl.getUniformLocation(externalForceProgram, 'center'),
			scale: gl.getUniformLocation(externalForceProgram, 'scale'),
		},
		viscous: {
			position: gl.getAttribLocation(viscousProgram, 'position'),
			boundarySpace: gl.getUniformLocation(viscousProgram, 'boundarySpace'),
			px: gl.getUniformLocation(viscousProgram, 'px'),
			v: gl.getUniformLocation(viscousProgram, 'v'),
			dt: gl.getUniformLocation(viscousProgram, 'dt'),
			velocity: gl.getUniformLocation(viscousProgram, 'velocity'),
			velocityNew: gl.getUniformLocation(viscousProgram, 'velocity_new'),
		},
		divergence: {
			position: gl.getAttribLocation(divergenceProgram, 'position'),
			boundarySpace: gl.getUniformLocation(divergenceProgram, 'boundarySpace'),
			px: gl.getUniformLocation(divergenceProgram, 'px'),
			dt: gl.getUniformLocation(divergenceProgram, 'dt'),
			velocity: gl.getUniformLocation(divergenceProgram, 'velocity'),
		},
		poisson: {
			position: gl.getAttribLocation(poissonProgram, 'position'),
			boundarySpace: gl.getUniformLocation(poissonProgram, 'boundarySpace'),
			px: gl.getUniformLocation(poissonProgram, 'px'),
			divergence: gl.getUniformLocation(poissonProgram, 'divergence'),
			pressure: gl.getUniformLocation(poissonProgram, 'pressure'),
		},
		pressure: {
			position: gl.getAttribLocation(pressureProgram, 'position'),
			boundarySpace: gl.getUniformLocation(pressureProgram, 'boundarySpace'),
			px: gl.getUniformLocation(pressureProgram, 'px'),
			dt: gl.getUniformLocation(pressureProgram, 'dt'),
			pressure: gl.getUniformLocation(pressureProgram, 'pressure'),
			velocity: gl.getUniformLocation(pressureProgram, 'velocity'),
		},
		color: {
			position: gl.getAttribLocation(colorProgram, 'position'),
			boundarySpace: gl.getUniformLocation(colorProgram, 'boundarySpace'),
			bgColor: gl.getUniformLocation(colorProgram, 'bgColor'),
			velocity: gl.getUniformLocation(colorProgram, 'velocity'),
			palette: gl.getUniformLocation(colorProgram, 'palette'),
		},
	}

	// Setup geometry buffers
	// 1. Fullscreen quad [-1, 1] for simulation and output passes
	const quadBuffer = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]), gl.STATIC_DRAW)

	// 2. Unit quad [-0.5, 0.5] + UV [0, 1] interleaved for ExternalForce brush
	const mouseBuffer = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, mouseBuffer)
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([
			-0.5, -0.5, 0, 0, 0, 0.5, -0.5, 0, 1, 0, -0.5, 0.5, 0, 0, 1, -0.5, 0.5, 0, 0, 1, 0.5, -0.5, 0, 1, 0, 0.5, 0.5, 0, 1, 1,
		]),
		gl.STATIC_DRAW,
	)

	// 3. Boundary lines for bounce mode
	const boundaryBuffer = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, boundaryBuffer)
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 0, -1, 1, 0, -1, 1, 0, 1, 1, 0, 1, 1, 0, 1, -1, 0, 1, -1, 0, -1, -1, 0]),
		gl.STATIC_DRAW,
	)

	// Create 1D palette texture from custom LexisNexis palette stops
	const paletteTex = gl.createTexture()
	const paletteData = buildPaletteData(paletteStops, 256)
	gl.bindTexture(gl.TEXTURE_2D, paletteTex)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteData)
	gl.bindTexture(gl.TEXTURE_2D, null)

	const texConfig = getSupportedTextureType(gl)

	let width = Math.max(1, window.innerWidth)
	let height = Math.max(1, window.innerHeight)
	let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
	let displayWidth = Math.round(width * pixelRatio)
	let displayHeight = Math.round(height * pixelRatio)
	let fboWidth = Math.max(1, Math.round(resolution * width))
	let fboHeight = Math.max(1, Math.round(resolution * height))
	let cellScaleX = 1 / fboWidth
	let cellScaleY = 1 / fboHeight

	const vel0 = createFBO(gl, fboWidth, fboHeight, texConfig)
	const vel1 = createFBO(gl, fboWidth, fboHeight, texConfig)
	const velViscous0 = createFBO(gl, fboWidth, fboHeight, texConfig)
	const velViscous1 = createFBO(gl, fboWidth, fboHeight, texConfig)
	const divFBO = createFBO(gl, fboWidth, fboHeight, texConfig)
	const pressure0 = createFBO(gl, fboWidth, fboHeight, texConfig)
	const pressure1 = createFBO(gl, fboWidth, fboHeight, texConfig)

	if (!vel0 || !vel1 || !velViscous0 || !velViscous1 || !divFBO || !pressure0 || !pressure1) {
		return
	}

	const allFBOs = [vel0, vel1, velViscous0, velViscous1, divFBO, pressure0, pressure1]

	function resize() {
		if (!canvas || !gl) return
		pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
		width = Math.max(1, window.innerWidth)
		height = Math.max(1, window.innerHeight)
		displayWidth = Math.round(width * pixelRatio)
		displayHeight = Math.round(height * pixelRatio)

		if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
			canvas.width = displayWidth
			canvas.height = displayHeight
		}

		fboWidth = Math.max(1, Math.round(resolution * width))
		fboHeight = Math.max(1, Math.round(resolution * height))
		cellScaleX = 1 / fboWidth
		cellScaleY = 1 / fboHeight

		for (const fbo of allFBOs) {
			resizeFBO(gl, fbo, fboWidth, fboHeight, texConfig)
		}
	}

	function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
		let timeout: ReturnType<typeof setTimeout> | null = null
		return function (...args: Parameters<T>) {
			if (timeout !== null) {
				clearTimeout(timeout)
			}
			timeout = setTimeout(() => {
				func(...args)
			}, wait)
		}
	}

	const debouncedResize = debounce(resize, 200)
	resize()
	window.addEventListener('resize', debouncedResize, { passive: true })

	// Mouse & AutoDriver state
	const mouse = {
		coordsX: 0,
		coordsY: 0,
		oldX: 0,
		oldY: 0,
		diffX: 0,
		diffY: 0,
		hasUserControl: false,
		isAutoActive: false,
		takeoverActive: false,
		takeoverStartTime: 0,
		takeoverFromX: 0,
		takeoverFromY: 0,
		takeoverToX: 0,
		takeoverToY: 0,
		lastUserInteraction: performance.now() - autoResumeDelay,
	}

	const autoState = {
		active: false,
		currentX: -0.35,
		currentY: -0.2,
		targetX: 0.35,
		targetY: 0.25,
		lastTime: performance.now(),
		activationTime: performance.now(),
		margin: 0.2,
	}

	function pickNewAutoTarget() {
		autoState.targetX = (Math.random() * 2 - 1) * (1 - autoState.margin)
		autoState.targetY = (Math.random() * 2 - 1) * (1 - autoState.margin)
	}

	function setMouseCoords(clientX: number, clientY: number) {
		const nx = clientX / Math.max(1, width)
		const ny = clientY / Math.max(1, height)
		mouse.coordsX = nx * 2 - 1
		mouse.coordsY = -(ny * 2 - 1)
	}

	function handlePointerMove(clientX: number, clientY: number) {
		mouse.lastUserInteraction = performance.now()
		const wasAutoActive = mouse.isAutoActive
		if (autoState.active) {
			autoState.active = false
			mouse.isAutoActive = false
		}
		if (wasAutoActive && !mouse.hasUserControl && !mouse.takeoverActive) {
			const nx = clientX / Math.max(1, width)
			const ny = clientY / Math.max(1, height)
			mouse.takeoverFromX = mouse.coordsX
			mouse.takeoverFromY = mouse.coordsY
			mouse.takeoverToX = nx * 2 - 1
			mouse.takeoverToY = -(ny * 2 - 1)
			mouse.takeoverStartTime = performance.now()
			mouse.takeoverActive = true
			mouse.hasUserControl = true
			mouse.isAutoActive = false
			return
		}
		setMouseCoords(clientX, clientY)
		mouse.hasUserControl = true
	}

	window.addEventListener(
		'mousemove',
		(event: MouseEvent) => {
			handlePointerMove(event.clientX, event.clientY)
		},
		{ passive: true },
	)

	window.addEventListener(
		'touchstart',
		(event: TouchEvent) => {
			if (event.touches.length === 1 && event.touches[0]) {
				handlePointerMove(event.touches[0].clientX, event.touches[0].clientY)
			}
		},
		{ passive: true },
	)

	window.addEventListener(
		'touchmove',
		(event: TouchEvent) => {
			if (event.touches.length === 1 && event.touches[0]) {
				handlePointerMove(event.touches[0].clientX, event.touches[0].clientY)
			}
		},
		{ passive: true },
	)

	function updateAutoDriver() {
		if (!autoDemo) return
		const now = performance.now()
		const idle = now - mouse.lastUserInteraction
		if (idle < autoResumeDelay) {
			if (autoState.active) {
				autoState.active = false
				mouse.isAutoActive = false
			}
			return
		}

		if (!autoState.active) {
			autoState.active = true
			if (mouse.coordsX !== 0 || mouse.coordsY !== 0) {
				autoState.currentX = mouse.coordsX
				autoState.currentY = mouse.coordsY
			}
			autoState.lastTime = now
			autoState.activationTime = now
		}

		mouse.isAutoActive = true
		let dtSec = (now - autoState.lastTime) / 1000
		autoState.lastTime = now
		if (dtSec > 0.2) dtSec = 0.016

		const dx = autoState.targetX - autoState.currentX
		const dy = autoState.targetY - autoState.currentY
		const dist = Math.hypot(dx, dy)
		if (dist < 0.01) {
			pickNewAutoTarget()
			return
		}

		const rampDurationMs = autoRampDuration * 1000
		let ramp = 1
		if (rampDurationMs > 0) {
			const t = Math.min(1, (now - autoState.activationTime) / rampDurationMs)
			ramp = t * t * (3 - 2 * t)
		}

		const step = autoSpeed * dtSec * ramp
		const move = Math.min(step, dist)
		autoState.currentX += (dx / dist) * move
		autoState.currentY += (dy / dist) * move
		mouse.coordsX = autoState.currentX
		mouse.coordsY = autoState.currentY
	}

	function updateMouse() {
		if (mouse.takeoverActive) {
			const t = (performance.now() - mouse.takeoverStartTime) / (takeoverDuration * 1000)
			if (t >= 1) {
				mouse.takeoverActive = false
				mouse.coordsX = mouse.takeoverToX
				mouse.coordsY = mouse.takeoverToY
				mouse.oldX = mouse.coordsX
				mouse.oldY = mouse.coordsY
				mouse.diffX = 0
				mouse.diffY = 0
			} else {
				const k = t * t * (3 - 2 * t)
				mouse.coordsX = mouse.takeoverFromX + (mouse.takeoverToX - mouse.takeoverFromX) * k
				mouse.coordsY = mouse.takeoverFromY + (mouse.takeoverToY - mouse.takeoverFromY) * k
			}
		}

		mouse.diffX = mouse.coordsX - mouse.oldX
		mouse.diffY = mouse.coordsY - mouse.oldY
		mouse.oldX = mouse.coordsX
		mouse.oldY = mouse.coordsY

		if (mouse.oldX === 0 && mouse.oldY === 0) {
			mouse.diffX = 0
			mouse.diffY = 0
		}
		if (mouse.isAutoActive && !mouse.takeoverActive) {
			mouse.diffX *= autoIntensity
			mouse.diffY *= autoIntensity
		}
	}

	function bindQuad(posLoc: number) {
		if (!gl) return
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
		if (posLoc >= 0) {
			gl.enableVertexAttribArray(posLoc)
			gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)
		}
	}

	function bindTextureUnit(unit: number, tex: WebGLTexture | null, uniformLoc: WebGLUniformLocation | null) {
		if (!gl) return
		gl.activeTexture(gl.TEXTURE0 + unit)
		gl.bindTexture(gl.TEXTURE_2D, tex)
		if (uniformLoc !== null) {
			gl.uniform1i(uniformLoc, unit)
		}
	}

	function bindTarget(target: FBO | null) {
		if (!gl) return
		if (target) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
			gl.viewport(0, 0, target.width, target.height)
		} else {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null)
			gl.viewport(0, 0, displayWidth, displayHeight)
		}
	}

	let animationFrameId: number | null = null
	let isVisible = true
	let userPaused = false
	let contextLost = false
	let frameCount = 0
	let lastFrameTime = 0
	let slowFrameCount = 0

	function render() {
		if (!gl || !isVisible) return

		const now = performance.now()
		if (lastFrameTime > 0) {
			const frameDelta = now - lastFrameTime
			frameCount++
			// After warmup, bail out if frames consistently take >100ms (e.g. unflagged software rasterizer)
			if (frameCount > 3 && frameDelta > 100 && frameDelta < 1000) {
				slowFrameCount++
				if (slowFrameCount >= 6) {
					pauseSimulation()
					clearCanvas()
					if (toggleButton) {
						toggleButton.hidden = true
					}
					return
				}
			} else {
				slowFrameCount = 0
			}
		}
		lastFrameTime = now

		updateAutoDriver()
		updateMouse()

		const boundaryX = isBounce ? 0 : cellScaleX
		const boundaryY = isBounce ? 0 : cellScaleY

		// 1. Advection pass (vel0 -> vel1)
		gl.disable(gl.BLEND)
		bindTarget(vel1)
		gl.useProgram(advectionProgram!)
		bindQuad(locations.advection.position)
		gl.uniform2f(locations.advection.boundarySpace, cellScaleX, cellScaleY)
		gl.uniform2f(locations.advection.px, cellScaleX, cellScaleY)
		gl.uniform2f(locations.advection.fboSize, fboWidth, fboHeight)
		gl.uniform1f(locations.advection.dt, dt)
		gl.uniform1i(locations.advection.isBFECC, BFECC ? 1 : 0)
		bindTextureUnit(0, vel0!.texture, locations.advection.velocity)
		gl.drawArrays(gl.TRIANGLES, 0, 6)

		if (isBounce) {
			gl.useProgram(boundaryProgram!)
			gl.bindBuffer(gl.ARRAY_BUFFER, boundaryBuffer)
			const posLoc = locations.boundary.position
			if (posLoc >= 0) {
				gl.enableVertexAttribArray(posLoc)
				gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)
			}
			gl.uniform2f(locations.boundary.px, cellScaleX, cellScaleY)
			gl.uniform2f(locations.boundary.fboSize, fboWidth, fboHeight)
			gl.uniform1f(locations.boundary.dt, dt)
			gl.uniform1i(locations.boundary.isBFECC, BFECC ? 1 : 0)
			bindTextureUnit(0, vel0!.texture, locations.boundary.velocity)
			gl.drawArrays(gl.LINES, 0, 8)
		}

		// 2. ExternalForce pass (additive onto vel1)
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
		bindTarget(vel1)
		gl.useProgram(externalForceProgram!)
		gl.bindBuffer(gl.ARRAY_BUFFER, mouseBuffer)
		const mousePosLoc = locations.externalForce.position
		const mouseUvLoc = locations.externalForce.uv
		if (mousePosLoc >= 0) {
			gl.enableVertexAttribArray(mousePosLoc)
			gl.vertexAttribPointer(mousePosLoc, 3, gl.FLOAT, false, 20, 0)
		}
		if (mouseUvLoc >= 0) {
			gl.enableVertexAttribArray(mouseUvLoc)
			gl.vertexAttribPointer(mouseUvLoc, 2, gl.FLOAT, false, 20, 12)
		}
		const forceX = (mouse.diffX / 2) * mouseForce
		const forceY = (mouse.diffY / 2) * mouseForce
		const cursorSizeX = Math.min(0.45, cursorSize * cellScaleX)
		const cursorSizeY = Math.min(0.45, cursorSize * cellScaleY)
		const centerX = Math.min(Math.max(mouse.coordsX, -1 + cursorSizeX + cellScaleX * 2), 1 - cursorSizeX - cellScaleX * 2)
		const centerY = Math.min(Math.max(mouse.coordsY, -1 + cursorSizeY + cellScaleY * 2), 1 - cursorSizeY - cellScaleY * 2)
		gl.uniform2f(locations.externalForce.px, cellScaleX, cellScaleY)
		gl.uniform2f(locations.externalForce.force, forceX, forceY)
		gl.uniform2f(locations.externalForce.center, centerX, centerY)
		gl.uniform2f(locations.externalForce.scale, cursorSize, cursorSize)
		gl.drawArrays(gl.TRIANGLES, 0, 6)
		if (mouseUvLoc >= 0) {
			gl.disableVertexAttribArray(mouseUvLoc)
		}
		gl.disable(gl.BLEND)

		// 3. Optional Viscous diffusion pass
		let activeVel: FBO = vel1!
		if (isViscous) {
			gl.useProgram(viscousProgram!)
			bindQuad(locations.viscous.position)
			gl.uniform2f(locations.viscous.boundarySpace, boundaryX, boundaryY)
			gl.uniform2f(locations.viscous.px, cellScaleX, cellScaleY)
			gl.uniform1f(locations.viscous.v, viscous)
			gl.uniform1f(locations.viscous.dt, dt)
			bindTextureUnit(0, vel1!.texture, locations.viscous.velocity)

			let vOut: FBO = velViscous0!
			for (let i = 0; i < iterationsViscous; i++) {
				const vIn = i % 2 === 0 ? velViscous0! : velViscous1!
				vOut = i % 2 === 0 ? velViscous1! : velViscous0!
				bindTarget(vOut)
				bindTextureUnit(1, vIn.texture, locations.viscous.velocityNew)
				gl.drawArrays(gl.TRIANGLES, 0, 6)
			}
			activeVel = vOut
		}

		// 4. Divergence pass (activeVel -> divFBO)
		bindTarget(divFBO)
		gl.useProgram(divergenceProgram!)
		bindQuad(locations.divergence.position)
		gl.uniform2f(locations.divergence.boundarySpace, boundaryX, boundaryY)
		gl.uniform2f(locations.divergence.px, cellScaleX, cellScaleY)
		gl.uniform1f(locations.divergence.dt, dt)
		bindTextureUnit(0, activeVel.texture, locations.divergence.velocity)
		gl.drawArrays(gl.TRIANGLES, 0, 6)

		// 5. Poisson pressure solver pass (divFBO -> pressure0 / pressure1)
		gl.useProgram(poissonProgram!)
		bindQuad(locations.poisson.position)
		gl.uniform2f(locations.poisson.boundarySpace, boundaryX, boundaryY)
		gl.uniform2f(locations.poisson.px, cellScaleX, cellScaleY)
		bindTextureUnit(0, divFBO!.texture, locations.poisson.divergence)

		let activePressure: FBO = pressure0!
		for (let i = 0; i < iterationsPoisson; i++) {
			const pIn = i % 2 === 0 ? pressure0! : pressure1!
			activePressure = i % 2 === 0 ? pressure1! : pressure0!
			bindTarget(activePressure)
			bindTextureUnit(1, pIn.texture, locations.poisson.pressure)
			gl.drawArrays(gl.TRIANGLES, 0, 6)
		}

		// 6. Pressure projection pass (activeVel - grad(activePressure) -> vel0)
		bindTarget(vel0)
		gl.useProgram(pressureProgram!)
		bindQuad(locations.pressure.position)
		gl.uniform2f(locations.pressure.boundarySpace, boundaryX, boundaryY)
		gl.uniform2f(locations.pressure.px, cellScaleX, cellScaleY)
		gl.uniform1f(locations.pressure.dt, dt)
		bindTextureUnit(0, activePressure.texture, locations.pressure.pressure)
		bindTextureUnit(1, activeVel.texture, locations.pressure.velocity)
		gl.drawArrays(gl.TRIANGLES, 0, 6)

		// 7. Color Output pass to screen (vel0 + paletteTex -> screen)
		bindTarget(null)
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)
		gl.enable(gl.BLEND)
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
		gl.useProgram(colorProgram!)
		bindQuad(locations.color.position)
		gl.uniform2f(locations.color.boundarySpace, 0, 0)
		gl.uniform4f(locations.color.bgColor, 0, 0, 0, 0)
		bindTextureUnit(0, vel0!.texture, locations.color.velocity)
		bindTextureUnit(1, paletteTex, locations.color.palette)
		gl.drawArrays(gl.TRIANGLES, 0, 6)

		animationFrameId = requestAnimationFrame(render)
	}

	function canRun() {
		return !document.hidden && !userPaused && !reducedMotionQuery.matches && !forcedColorsQuery.matches && !contextLost
	}

	function clearCanvas() {
		if (!gl) return
		bindTarget(null)
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)
	}

	function pauseSimulation() {
		isVisible = false
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId)
			animationFrameId = null
		}
	}

	function resumeSimulation() {
		if (!canRun()) return
		isVisible = true
		slowFrameCount = 0
		lastFrameTime = 0
		autoState.lastTime = performance.now()
		if (animationFrameId === null) {
			animationFrameId = requestAnimationFrame(render)
		}
	}

	const toggleButton = document.getElementById('liquid-wave-toggle') as HTMLButtonElement | null
	if (toggleButton) {
		toggleButton.hidden = false
		toggleButton.textContent = 'Pause background'
		toggleButton.addEventListener('click', () => {
			userPaused = !userPaused
			if (userPaused) {
				pauseSimulation()
				toggleButton.textContent = 'Play background'
			} else {
				toggleButton.textContent = 'Pause background'
				resumeSimulation()
			}
		})
	}

	function handlePreferenceChange() {
		if (reducedMotionQuery.matches || forcedColorsQuery.matches) {
			pauseSimulation()
			clearCanvas()
			if (toggleButton) {
				toggleButton.hidden = true
			}
		} else {
			if (toggleButton) {
				toggleButton.hidden = false
				toggleButton.textContent = userPaused ? 'Play background' : 'Pause background'
			}
			resumeSimulation()
		}
	}

	if (typeof reducedMotionQuery.addEventListener === 'function') {
		reducedMotionQuery.addEventListener('change', handlePreferenceChange)
	}
	if (typeof forcedColorsQuery.addEventListener === 'function') {
		forcedColorsQuery.addEventListener('change', handlePreferenceChange)
	}

	canvas.addEventListener('webglcontextlost', (event) => {
		event.preventDefault()
		contextLost = true
		pauseSimulation()
	})
	canvas.addEventListener('webglcontextrestored', () => {
		contextLost = false
		resumeSimulation()
	})

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			pauseSimulation()
		} else {
			resumeSimulation()
		}
	})

	animationFrameId = requestAnimationFrame(render)
}
