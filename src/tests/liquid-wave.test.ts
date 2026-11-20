import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initLiquidWave, LIQUID_WAVE_PALETTE, parseColorToRgb, readWavePaletteFromCss, buildPaletteData } from '../scripts/liquid-wave'

function createMockWebGLContext() {
	return {
		VERTEX_SHADER: 35633,
		FRAGMENT_SHADER: 35632,
		COMPILE_STATUS: 35713,
		LINK_STATUS: 35714,
		ARRAY_BUFFER: 34962,
		STATIC_DRAW: 35044,
		TEXTURE_2D: 3553,
		TEXTURE_MIN_FILTER: 10241,
		TEXTURE_MAG_FILTER: 10240,
		TEXTURE_WRAP_S: 10242,
		TEXTURE_WRAP_T: 10243,
		LINEAR: 9729,
		NEAREST: 9728,
		CLAMP_TO_EDGE: 33071,
		RGBA: 6408,
		UNSIGNED_BYTE: 5121,
		FLOAT: 5126,
		FRAMEBUFFER: 36160,
		COLOR_ATTACHMENT0: 36064,
		FRAMEBUFFER_COMPLETE: 36053,
		COLOR_BUFFER_BIT: 16384,
		TRIANGLES: 4,
		LINES: 1,
		BLEND: 3042,
		SRC_ALPHA: 770,
		ONE: 1,
		ONE_MINUS_SRC_ALPHA: 771,
		TEXTURE0: 33984,
		createShader: vi.fn(() => ({})),
		shaderSource: vi.fn(),
		compileShader: vi.fn(),
		getShaderParameter: vi.fn(() => true),
		deleteShader: vi.fn(),
		createProgram: vi.fn(() => ({})),
		attachShader: vi.fn(),
		linkProgram: vi.fn(),
		getProgramParameter: vi.fn(() => true),
		deleteProgram: vi.fn(),
		getAttribLocation: vi.fn(() => 0),
		getUniformLocation: vi.fn(() => ({})),
		createBuffer: vi.fn(() => ({})),
		bindBuffer: vi.fn(),
		bufferData: vi.fn(),
		createTexture: vi.fn(() => ({})),
		bindTexture: vi.fn(),
		texParameteri: vi.fn(),
		texImage2D: vi.fn(),
		deleteTexture: vi.fn(),
		getExtension: vi.fn(() => null),
		createFramebuffer: vi.fn(() => ({})),
		bindFramebuffer: vi.fn(),
		framebufferTexture2D: vi.fn(),
		checkFramebufferStatus: vi.fn(() => 36053),
		deleteFramebuffer: vi.fn(),
		clearColor: vi.fn(),
		clear: vi.fn(),
		viewport: vi.fn(),
		disable: vi.fn(),
		enable: vi.fn(),
		blendFunc: vi.fn(),
		blendFuncSeparate: vi.fn(),
		useProgram: vi.fn(),
		enableVertexAttribArray: vi.fn(),
		disableVertexAttribArray: vi.fn(),
		vertexAttribPointer: vi.fn(),
		uniform1i: vi.fn(),
		uniform1f: vi.fn(),
		uniform2f: vi.fn(),
		uniform4f: vi.fn(),
		activeTexture: vi.fn(),
		drawArrays: vi.fn(),
	}
}

describe('LiquidWave', () => {
	let mockCanvas: HTMLCanvasElement
	let mockGetContext: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockGetContext = vi.fn()
		mockCanvas = document.createElement('canvas')
		mockCanvas.id = 'liquid-wave-canvas'
		mockCanvas.getContext = mockGetContext as any

		document.body.appendChild(mockCanvas)

		// Create default matchMedia mock
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		})
	})

	afterEach(() => {
		document.body.innerHTML = ''
		vi.restoreAllMocks()
		vi.clearAllMocks()
	})

	it('initializes WebGL when prefers-reduced-motion and forced-colors are false', () => {
		initLiquidWave()

		expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
		expect(window.matchMedia).toHaveBeenCalledWith('(forced-colors: active)')
		expect(mockGetContext).toHaveBeenCalledWith('webgl', {
			alpha: true,
			antialias: false,
			powerPreference: 'default',
			failIfMajorPerformanceCaveat: true,
		})
	})

	it('returns early and does not start animation when a software WebGL renderer is detected', () => {
		const toggleButton = document.createElement('button')
		toggleButton.id = 'liquid-wave-toggle'
		toggleButton.hidden = true
		document.body.appendChild(toggleButton)

		const glMock = {
			...createMockWebGLContext(),
			getExtension: vi.fn((name: string) => (name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 37446 } : null)),
			getParameter: vi.fn(() => 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)'),
		}
		mockGetContext.mockReturnValue(glMock)
		const rafSpy = vi.spyOn(window, 'requestAnimationFrame')

		initLiquidWave()

		expect(rafSpy).not.toHaveBeenCalled()
		expect(toggleButton.hidden).toBe(true)
	})

	it('returns early and does not initialize WebGL when prefers-reduced-motion is true', () => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query) => ({
				matches: query === '(prefers-reduced-motion: reduce)',
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		})

		initLiquidWave()

		expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
		expect(mockGetContext).not.toHaveBeenCalled()
	})

	it('returns early and does not initialize WebGL when forced-colors is active', () => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query) => ({
				matches: query === '(forced-colors: active)',
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		})

		initLiquidWave()

		expect(window.matchMedia).toHaveBeenCalledWith('(forced-colors: active)')
		expect(mockGetContext).not.toHaveBeenCalled()
	})

	it('reveals toggle button, toggles pause/play, and responds to live preference changes', () => {
		const toggleButton = document.createElement('button')
		toggleButton.id = 'liquid-wave-toggle'
		toggleButton.hidden = true
		toggleButton.textContent = 'Pause background'
		document.body.appendChild(toggleButton)

		const glMock = createMockWebGLContext()
		mockGetContext.mockReturnValue(glMock)

		let nextRafId = 1
		const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => nextRafId++)
		const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

		const listeners: Record<string, Array<() => void>> = {}
		const queryStates: Record<string, { matches: boolean; media: string }> = {
			'(prefers-reduced-motion: reduce)': { matches: false, media: '(prefers-reduced-motion: reduce)' },
			'(forced-colors: active)': { matches: false, media: '(forced-colors: active)' },
		}

		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => {
				const state = queryStates[query] ?? { matches: false, media: query }
				return {
					get matches() {
						return state.matches
					},
					media: state.media,
					onchange: null,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					addEventListener: vi.fn((event: string, cb: () => void) => {
						if (event === 'change') {
							;(listeners[query] ??= []).push(cb)
						}
					}),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn(),
				}
			}),
		})

		initLiquidWave()

		expect(toggleButton.hidden).toBe(false)
		expect(toggleButton.textContent).toBe('Pause background')
		expect(toggleButton.hasAttribute('aria-pressed')).toBe(false)
		expect(rafSpy).toHaveBeenCalledTimes(1)

		// Pause via toggle button
		toggleButton.click()
		expect(toggleButton.textContent).toBe('Play background')
		expect(cancelRafSpy).toHaveBeenCalledWith(1)

		// Resume via toggle button
		toggleButton.click()
		expect(toggleButton.textContent).toBe('Pause background')
		expect(rafSpy).toHaveBeenCalledTimes(2)

		// Simulate live prefers-reduced-motion change to true
		queryStates['(prefers-reduced-motion: reduce)']!.matches = true
		for (const cb of listeners['(prefers-reduced-motion: reduce)'] ?? []) {
			cb()
		}
		expect(cancelRafSpy).toHaveBeenCalledWith(2)
		expect(toggleButton.hidden).toBe(true)

		// Simulate live prefers-reduced-motion change back to false
		queryStates['(prefers-reduced-motion: reduce)']!.matches = false
		for (const cb of listeners['(prefers-reduced-motion: reduce)'] ?? []) {
			cb()
		}
		expect(toggleButton.hidden).toBe(false)
		expect(toggleButton.textContent).toBe('Pause background')
		expect(rafSpy).toHaveBeenCalledTimes(3)
	})

	it('returns early if canvas element is not found', () => {
		document.body.innerHTML = ''

		initLiquidWave()

		expect(window.matchMedia).not.toHaveBeenCalled()
		expect(mockGetContext).not.toHaveBeenCalled()
	})

	it('parses LexisNexis palette hex and rgb colors and builds a smooth OKLab RGBA palette texture', () => {
		expect(parseColorToRgb('#ff6d50')).toEqual([255, 109, 80])
		expect(parseColorToRgb('#3f6c50')).toEqual([63, 108, 80])
		expect(parseColorToRgb('#abc')).toEqual([170, 187, 204])
		expect(parseColorToRgb('rgb(79, 126, 155)')).toEqual([79, 126, 155])
		expect(parseColorToRgb('rgb(144 197 233)')).toEqual([144, 197, 233])
		// Out-of-range or invalid strings fall back to cream (#e1dacd)
		expect(parseColorToRgb('rgb(300, 0, 0)')).toEqual([225, 218, 205])
		expect(parseColorToRgb('#12zzzz')).toEqual([225, 218, 205])
		expect(parseColorToRgb('not-a-color')).toEqual([225, 218, 205])

		const data = buildPaletteData(LIQUID_WAVE_PALETTE, 16)
		expect(data.length).toBe(16 * 4)
		// First texel matches first stop (#3f6c50)
		expect([data[0], data[1], data[2], data[3]]).toEqual([63, 108, 80, 255])
		// Last texel matches last stop (#ceb288)
		expect([data[15 * 4], data[15 * 4 + 1], data[15 * 4 + 2], data[15 * 4 + 3]]).toEqual([206, 178, 136, 255])

		// Interpolates through OKLab instead of darkening in sRGB midpoint
		const midData = buildPaletteData(['#3f6c50', '#ff6d50'], 3)
		expect([midData[4], midData[5], midData[6]]).toEqual([166, 115, 82])
		expect([midData[4], midData[5], midData[6]]).not.toEqual([159, 109, 80])

		// Arc-length parameterization distributes unequal-distance stops proportionally
		const unequalData = buildPaletteData(['#000000', '#181817', '#ffffff'], 5)
		// Midpoint texel (index 2, t=0.5) sits in the long second segment, well past #181817 (24)
		expect(unequalData[2 * 4]!).toBeGreaterThan(80)
	})

	it('reads wave palette stops from CSS custom properties when all 6 are valid and returns null otherwise', () => {
		expect(readWavePaletteFromCss()).toBeNull()

		const root = document.documentElement
		const cssStops = ['#3f6c50', 'rgb(79, 126, 155)', '#90c5e9', '#bcb3a5', '#ff6d50', '#ceb288']
		cssStops.forEach((value, idx) => {
			root.style.setProperty(`--wave-stop-${idx + 1}`, value)
		})
		expect(readWavePaletteFromCss(root)).toEqual(cssStops)

		// Missing or invalid stop causes null so initLiquidWave falls back safely
		root.style.removeProperty('--wave-stop-4')
		expect(readWavePaletteFromCss(root)).toBeNull()

		for (let i = 1; i <= 6; i++) {
			root.style.removeProperty(`--wave-stop-${i}`)
		}
	})

	it('avoids double-premultiplying color output in COLOR_FRAG when bgColor.a is zero', () => {
		const glMock = createMockWebGLContext()
		mockGetContext.mockReturnValue(glMock)

		initLiquidWave()

		const shaderSources = glMock.shaderSource.mock.calls.map((call) => call[1] as string)
		const colorFrag = shaderSources.find((src) => src.includes('uniform sampler2D palette'))
		expect(colorFrag).toBeDefined()
		expect(colorFrag).toContain('bgColor.a > 0.0 ? mix(bgColor.rgb, c, lenv) : c')
	})
})
