import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initLiquidWave, LIQUID_WAVE_PALETTE, parseColorToRgb, buildPaletteData } from '../scripts/liquid-wave'

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
		vi.clearAllMocks()
	})

	it('initializes WebGL when prefers-reduced-motion is false', () => {
		initLiquidWave()

		expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
		expect(mockGetContext).toHaveBeenCalledWith('webgl', {
			alpha: true,
			antialias: false,
			powerPreference: 'high-performance',
		})
	})

	it('returns early and does not initialize WebGL when prefers-reduced-motion is true', () => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query) => ({
				matches: true,
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
		// First texel matches first stop (#232321)
		expect([data[0], data[1], data[2], data[3]]).toEqual([35, 35, 33, 255])
		// Last texel matches last stop (#f75546)
		expect([data[15 * 4], data[15 * 4 + 1], data[15 * 4 + 2], data[15 * 4 + 3]]).toEqual([247, 85, 70, 255])
	})
})
