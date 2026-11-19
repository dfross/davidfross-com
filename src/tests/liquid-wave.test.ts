import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initLiquidWave, LIQUID_WAVE_PALETTE, parseColorToRgb, buildPaletteData } from '../scripts/liquid-wave'

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
		})
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

	it('parses LexisNexis palette hex colors and builds a smooth RGBA palette texture', () => {
		expect(parseColorToRgb('#f75546')).toEqual([247, 85, 70])
		expect(parseColorToRgb('#3f6c50')).toEqual([63, 108, 80])

		const data = buildPaletteData(LIQUID_WAVE_PALETTE, 16)
		expect(data.length).toBe(16 * 4)
		// First texel matches first stop (#3f6c50)
		expect([data[0], data[1], data[2], data[3]]).toEqual([63, 108, 80, 255])
		// Last texel matches last stop (#ceb288)
		expect([data[15 * 4], data[15 * 4 + 1], data[15 * 4 + 2], data[15 * 4 + 3]]).toEqual([206, 178, 136, 255])
	})
})
