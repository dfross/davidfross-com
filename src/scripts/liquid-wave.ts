export const LIQUID_WAVE_PALETTE = [
	'#232321', // --color-surface: deep terminal charcoal (outer edge)
	'#3f6c50', // --color-green: deep terminal phosphor green (low-velocity wake)
	'#4f7e9b', // --color-blue: LexisNexis steel blue (wave body)
	'#6ba0c2', // --color-blue-light: slate blue (mid-wave flow)
	'#ceb288', // --color-tan: warm vintage amber/tan (inner wave crest)
	'#f75546', // --color-red: terminal red (high-velocity peak accent)
] as const

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
		// Soft-shoulder tone mapping prevents high-velocity mouse swipes from blowing out
		float lenv = clamp(rawLen / (1.0 + rawLen * 0.85), 0.0, 1.0);
		vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb * 0.78;
		vec3 outRGB = mix(bgColor.rgb, c, lenv);
		float outA = mix(bgColor.a, 0.38, lenv);
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

export function parseColorToRgb(colorStr: string): [number, number, number] {
	const clean = colorStr.trim().replace(/^#/, '')
	if (clean.length === 3) {
		const r = parseInt(clean.charAt(0) + clean.charAt(0), 16)
		const g = parseInt(clean.charAt(1) + clean.charAt(1), 16)
		const b = parseInt(clean.charAt(2) + clean.charAt(2), 16)
		if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
			return [r, g, b]
		}
	} else if (clean.length === 6) {
		const r = parseInt(clean.slice(0, 2), 16)
		const g = parseInt(clean.slice(2, 4), 16)
		const b = parseInt(clean.slice(4, 6), 16)
		if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
			return [r, g, b]
		}
	}
	return [225, 218, 205] // fallback to #e1dacd (--color-cream)
}

export function buildPaletteData(stops: readonly string[], width = 256): Uint8Array {
	const validStops = stops.length > 0 ? stops : LIQUID_WAVE_PALETTE
	const rgbStops = (validStops.length === 1 ? [validStops[0]!, validStops[0]!] : validStops).map(parseColorToRgb)
	const data = new Uint8Array(width * 4)
	const maxIndex = rgbStops.length - 1

	for (let i = 0; i < width; i++) {
		const t = width > 1 ? i / (width - 1) : 0
		const scaled = t * maxIndex
		const idx = Math.min(Math.floor(scaled), maxIndex - 1)
		const frac = scaled - idx
		const c0 = rgbStops[idx]!
		const c1 = rgbStops[idx + 1]!

		data[i * 4 + 0] = Math.round(c0[0] + (c1[0] - c0[0]) * frac)
		data[i * 4 + 1] = Math.round(c0[1] + (c1[1] - c0[1]) * frac)
		data[i * 4 + 2] = Math.round(c0[2] + (c1[2] - c0[2]) * frac)
		data[i * 4 + 3] = 255
	}

	return data
}

function getSupportedTextureType(gl: WebGLRenderingContext): { type: number; filter: number } {
	const isIOS = typeof navigator !== 'undefined' && /(iPad|iPhone|iPod)/i.test(navigator.userAgent)
	const halfFloatExt = gl.getExtension('OES_texture_half_float') as { HALF_FLOAT_OES: number } | null
	const halfFloatLinear = gl.getExtension('OES_texture_half_float_linear')
	const floatExt = gl.getExtension('OES_texture_float')
	const floatLinear = gl.getExtension('OES_texture_float_linear')
	gl.getExtension('WEBGL_color_buffer_float')
	gl.getExtension('EXT_color_buffer_half_float')

	const candidates: Array<{ type: number; filter: number }> = []
	if (!isIOS && floatExt) {
		candidates.push({ type: gl.FLOAT, filter: floatLinear ? gl.LINEAR : gl.NEAREST })
	}
	if (halfFloatExt) {
		candidates.push({
			type: halfFloatExt.HALF_FLOAT_OES,
			filter: halfFloatLinear ? gl.LINEAR : gl.NEAREST,
		})
	}
	if (isIOS && floatExt) {
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

export function initLiquidWave(options: LiquidWaveOptions = {}) {
	const canvas = document.getElementById('liquid-wave-canvas') as HTMLCanvasElement | null
	if (!canvas) return

	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
	if (prefersReducedMotion) return

	const gl = canvas.getContext('webgl', {
		alpha: true,
		antialias: false,
		powerPreference: 'high-performance',
	})
	if (!gl) return

	const container = document.getElementById('liquid-wave-container')

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
					: LIQUID_WAVE_PALETTE

	const mouseForce = options.mouseForce ?? (dataset.mouseForce ? Number(dataset.mouseForce) : 20)
	const cursorSize = options.cursorSize ?? (dataset.cursorSize ? Number(dataset.cursorSize) : 100)
	const isViscous = options.isViscous ?? (dataset.isViscous ? dataset.isViscous === 'true' : false)
	const viscous = options.viscous ?? (dataset.viscous ? Number(dataset.viscous) : 30)
	const iterationsViscous = options.iterationsViscous ?? (dataset.iterationsViscous ? Number(dataset.iterationsViscous) : 32)
	const iterationsPoisson = options.iterationsPoisson ?? (dataset.iterationsPoisson ? Number(dataset.iterationsPoisson) : 32)
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
	let pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
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
		pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
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
		if (autoState.active) {
			autoState.active = false
			mouse.isAutoActive = false
		}
		if (mouse.isAutoActive && !mouse.hasUserControl && !mouse.takeoverActive) {
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

	function bindQuad(program: WebGLProgram) {
		if (!gl) return
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
		const posLoc = gl.getAttribLocation(program, 'position')
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

	function render() {
		if (!gl || !isVisible) return

		updateAutoDriver()
		updateMouse()

		const boundaryX = isBounce ? 0 : cellScaleX
		const boundaryY = isBounce ? 0 : cellScaleY

		// 1. Advection pass (vel0 -> vel1)
		gl.disable(gl.BLEND)
		bindTarget(vel1)
		gl.useProgram(advectionProgram!)
		bindQuad(advectionProgram!)
		gl.uniform2f(gl.getUniformLocation(advectionProgram!, 'boundarySpace'), cellScaleX, cellScaleY)
		gl.uniform2f(gl.getUniformLocation(advectionProgram!, 'px'), cellScaleX, cellScaleY)
		gl.uniform2f(gl.getUniformLocation(advectionProgram!, 'fboSize'), fboWidth, fboHeight)
		gl.uniform1f(gl.getUniformLocation(advectionProgram!, 'dt'), dt)
		gl.uniform1i(gl.getUniformLocation(advectionProgram!, 'isBFECC'), BFECC ? 1 : 0)
		bindTextureUnit(0, vel0!.texture, gl.getUniformLocation(advectionProgram!, 'velocity'))
		gl.drawArrays(gl.TRIANGLES, 0, 6)

		if (isBounce) {
			gl.useProgram(boundaryProgram!)
			gl.bindBuffer(gl.ARRAY_BUFFER, boundaryBuffer)
			const posLoc = gl.getAttribLocation(boundaryProgram!, 'position')
			if (posLoc >= 0) {
				gl.enableVertexAttribArray(posLoc)
				gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)
			}
			gl.uniform2f(gl.getUniformLocation(boundaryProgram!, 'px'), cellScaleX, cellScaleY)
			gl.uniform2f(gl.getUniformLocation(boundaryProgram!, 'fboSize'), fboWidth, fboHeight)
			gl.uniform1f(gl.getUniformLocation(boundaryProgram!, 'dt'), dt)
			gl.uniform1i(gl.getUniformLocation(boundaryProgram!, 'isBFECC'), BFECC ? 1 : 0)
			bindTextureUnit(0, vel0!.texture, gl.getUniformLocation(boundaryProgram!, 'velocity'))
			gl.drawArrays(gl.LINES, 0, 8)
		}

		// 2. ExternalForce pass (additive onto vel1)
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
		bindTarget(vel1)
		gl.useProgram(externalForceProgram!)
		gl.bindBuffer(gl.ARRAY_BUFFER, mouseBuffer)
		const mousePosLoc = gl.getAttribLocation(externalForceProgram!, 'position')
		const mouseUvLoc = gl.getAttribLocation(externalForceProgram!, 'uv')
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
		gl.uniform2f(gl.getUniformLocation(externalForceProgram!, 'px'), cellScaleX, cellScaleY)
		gl.uniform2f(gl.getUniformLocation(externalForceProgram!, 'force'), forceX, forceY)
		gl.uniform2f(gl.getUniformLocation(externalForceProgram!, 'center'), centerX, centerY)
		gl.uniform2f(gl.getUniformLocation(externalForceProgram!, 'scale'), cursorSize, cursorSize)
		gl.drawArrays(gl.TRIANGLES, 0, 6)
		if (mouseUvLoc >= 0) {
			gl.disableVertexAttribArray(mouseUvLoc)
		}
		gl.disable(gl.BLEND)

		// 3. Optional Viscous diffusion pass
		let activeVel: FBO = vel1!
		if (isViscous) {
			gl.useProgram(viscousProgram!)
			bindQuad(viscousProgram!)
			gl.uniform2f(gl.getUniformLocation(viscousProgram!, 'boundarySpace'), boundaryX, boundaryY)
			gl.uniform2f(gl.getUniformLocation(viscousProgram!, 'px'), cellScaleX, cellScaleY)
			gl.uniform1f(gl.getUniformLocation(viscousProgram!, 'v'), viscous)
			gl.uniform1f(gl.getUniformLocation(viscousProgram!, 'dt'), dt)
			bindTextureUnit(0, vel1!.texture, gl.getUniformLocation(viscousProgram!, 'velocity'))

			let vOut: FBO = velViscous0!
			for (let i = 0; i < iterationsViscous; i++) {
				const vIn = i % 2 === 0 ? velViscous0! : velViscous1!
				vOut = i % 2 === 0 ? velViscous1! : velViscous0!
				bindTarget(vOut)
				bindTextureUnit(1, vIn.texture, gl.getUniformLocation(viscousProgram!, 'velocity_new'))
				gl.drawArrays(gl.TRIANGLES, 0, 6)
			}
			activeVel = vOut
		}

		// 4. Divergence pass (activeVel -> divFBO)
		bindTarget(divFBO)
		gl.useProgram(divergenceProgram!)
		bindQuad(divergenceProgram!)
		gl.uniform2f(gl.getUniformLocation(divergenceProgram!, 'boundarySpace'), boundaryX, boundaryY)
		gl.uniform2f(gl.getUniformLocation(divergenceProgram!, 'px'), cellScaleX, cellScaleY)
		gl.uniform1f(gl.getUniformLocation(divergenceProgram!, 'dt'), dt)
		bindTextureUnit(0, activeVel.texture, gl.getUniformLocation(divergenceProgram!, 'velocity'))
		gl.drawArrays(gl.TRIANGLES, 0, 6)

		// 5. Poisson pressure solver pass (divFBO -> pressure0 / pressure1)
		gl.useProgram(poissonProgram!)
		bindQuad(poissonProgram!)
		gl.uniform2f(gl.getUniformLocation(poissonProgram!, 'boundarySpace'), boundaryX, boundaryY)
		gl.uniform2f(gl.getUniformLocation(poissonProgram!, 'px'), cellScaleX, cellScaleY)
		bindTextureUnit(0, divFBO!.texture, gl.getUniformLocation(poissonProgram!, 'divergence'))

		let activePressure: FBO = pressure0!
		for (let i = 0; i < iterationsPoisson; i++) {
			const pIn = i % 2 === 0 ? pressure0! : pressure1!
			activePressure = i % 2 === 0 ? pressure1! : pressure0!
			bindTarget(activePressure)
			bindTextureUnit(1, pIn.texture, gl.getUniformLocation(poissonProgram!, 'pressure'))
			gl.drawArrays(gl.TRIANGLES, 0, 6)
		}

		// 6. Pressure projection pass (activeVel - grad(activePressure) -> vel0)
		bindTarget(vel0)
		gl.useProgram(pressureProgram!)
		bindQuad(pressureProgram!)
		gl.uniform2f(gl.getUniformLocation(pressureProgram!, 'boundarySpace'), boundaryX, boundaryY)
		gl.uniform2f(gl.getUniformLocation(pressureProgram!, 'px'), cellScaleX, cellScaleY)
		gl.uniform1f(gl.getUniformLocation(pressureProgram!, 'dt'), dt)
		bindTextureUnit(0, activePressure.texture, gl.getUniformLocation(pressureProgram!, 'pressure'))
		bindTextureUnit(1, activeVel.texture, gl.getUniformLocation(pressureProgram!, 'velocity'))
		gl.drawArrays(gl.TRIANGLES, 0, 6)

		// 7. Color Output pass to screen (vel0 + paletteTex -> screen)
		bindTarget(null)
		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)
		gl.enable(gl.BLEND)
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
		gl.useProgram(colorProgram!)
		bindQuad(colorProgram!)
		gl.uniform2f(gl.getUniformLocation(colorProgram!, 'boundarySpace'), 0, 0)
		gl.uniform4f(gl.getUniformLocation(colorProgram!, 'bgColor'), 0, 0, 0, 0)
		bindTextureUnit(0, vel0!.texture, gl.getUniformLocation(colorProgram!, 'velocity'))
		bindTextureUnit(1, paletteTex, gl.getUniformLocation(colorProgram!, 'palette'))
		gl.drawArrays(gl.TRIANGLES, 0, 6)

		animationFrameId = requestAnimationFrame(render)
	}

	function pauseSimulation() {
		isVisible = false
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId)
			animationFrameId = null
		}
	}

	function resumeSimulation() {
		if (document.hidden) return
		isVisible = true
		autoState.lastTime = performance.now()
		if (animationFrameId === null) {
			animationFrameId = requestAnimationFrame(render)
		}
	}

	if (container) {
		container.addEventListener('contentvisibilityautostatechange', (event: Event) => {
			const cvEvent = event as Event & { skipped?: boolean }
			if (cvEvent.skipped) {
				pauseSimulation()
			} else {
				resumeSimulation()
			}
		})

		const isContentVisibilitySupported = 'contentVisibility' in document.documentElement.style
		if (!isContentVisibilitySupported && typeof IntersectionObserver !== 'undefined') {
			const observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							resumeSimulation()
						} else {
							pauseSimulation()
						}
					}
				},
				{ rootMargin: '200px' },
			)
			observer.observe(container)
		}
	}

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			pauseSimulation()
		} else {
			resumeSimulation()
		}
	})

	animationFrameId = requestAnimationFrame(render)
}
