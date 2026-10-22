import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initParticleBackground } from '../scripts/particle-background'

describe('ParticleBackground', () => {
	let mockCanvas: HTMLCanvasElement
	let mockGetContext: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockGetContext = vi.fn()
		mockCanvas = document.createElement('canvas')
		mockCanvas.id = 'particle-bg-canvas'
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
		// Default mock matches: false
		initParticleBackground()

		expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
		expect(mockGetContext).toHaveBeenCalledWith('webgl', {
			alpha: true,
			antialias: false,
			powerPreference: 'high-performance',
		})
	})

	it('returns early and does not initialize WebGL when prefers-reduced-motion is true', () => {
		// Mock matches: true
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

		initParticleBackground()

		expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
		expect(mockGetContext).not.toHaveBeenCalled()
	})

	it('returns early if canvas element is not found', () => {
		// Remove the canvas element
		document.body.innerHTML = ''

		initParticleBackground()

		expect(window.matchMedia).not.toHaveBeenCalled()
		expect(mockGetContext).not.toHaveBeenCalled()
	})
})
