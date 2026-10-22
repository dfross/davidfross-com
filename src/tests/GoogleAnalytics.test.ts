import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import fs from 'fs'
import path from 'path'

// Read the Astro file to extract the inline script content
const astroFilePath = path.join(process.cwd(), 'src/components/GoogleAnalytics.astro')
const astroContent = fs.readFileSync(astroFilePath, 'utf-8')
// Extract content between <script is:inline> and </script>
const scriptMatch = astroContent.match(/<script.*?is:inline[^>]*>([\s\S]*?)<\/script>/)
const scriptContent = scriptMatch ? scriptMatch[1] : ''

describe('GoogleAnalytics.astro script', () => {
	let dom: JSDOM
	let window: any
	let document: any

	beforeEach(() => {
		// Reset DOM environment before each test
		dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { runScripts: 'dangerously' })
		window = dom.window
		document = window.document

		// Mock requestIdleCallback if not present in JSDOM natively
		window.requestIdleCallback = vi.fn((cb) => setTimeout(cb, 0))
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('should initialize dataLayer and gtag correctly', () => {
		// Execute the script in JSDOM
		const script = document.createElement('script')
		script.textContent = scriptContent
		document.head.appendChild(script)

		// Check dataLayer
		expect(window.dataLayer).toBeDefined()
		expect(Array.isArray(window.dataLayer)).toBe(true)
		expect(window.dataLayer.length).toBe(2)

		// Check the pushes to dataLayer
		const jsPush = window.dataLayer[0]
		const configPush = window.dataLayer[1]

		expect(jsPush[0]).toBe('js')
		expect(jsPush[1]).toBeInstanceOf(window.Date)

		expect(configPush[0]).toBe('config')
		expect(configPush[1]).toBe('G-2NMTBPYB0R')
	})

	it('should use requestIdleCallback to load GA script if supported', () => {
		// Setup mock
		const requestIdleCallbackMock = vi.fn()
		window.requestIdleCallback = requestIdleCallbackMock

		const script = document.createElement('script')
		script.textContent = scriptContent
		document.head.appendChild(script)

		expect(requestIdleCallbackMock).toHaveBeenCalledTimes(1)
		expect(requestIdleCallbackMock.mock.calls[0][1]).toEqual({ timeout: 3000 })

		// Simulate the callback firing
		const callback = requestIdleCallbackMock.mock.calls[0][0]
		callback()

		// Verify the GA script was injected
		const gaScript = document.getElementById('ga-gtag') as HTMLScriptElement
		expect(gaScript).not.toBeNull()
		expect(gaScript.async).toBe(true)
		expect(gaScript.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-2NMTBPYB0R')
	})

	it('should fallback to load event if requestIdleCallback is not supported', () => {
		// Remove requestIdleCallback to simulate unsupported browser
		delete window.requestIdleCallback

		const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

		const script = document.createElement('script')
		script.textContent = scriptContent
		document.head.appendChild(script)

		expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function))

		// Simulate the load event
		const loadHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'load')![1] as EventListener
		loadHandler(new window.Event('load'))

		// Verify the GA script was injected
		const gaScript = document.getElementById('ga-gtag') as HTMLScriptElement
		expect(gaScript).not.toBeNull()
		expect(gaScript.async).toBe(true)
		expect(gaScript.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-2NMTBPYB0R')
	})

	it('should not inject the GA script twice (idempotency)', () => {
		const requestIdleCallbackMock = vi.fn()
		window.requestIdleCallback = requestIdleCallbackMock

		const script = document.createElement('script')
		script.textContent = scriptContent
		document.head.appendChild(script)

		// Simulate callback firing twice
		const callback = requestIdleCallbackMock.mock.calls[0][0]
		callback()
		callback()

		// Verify only one GA script exists
		const gaScripts = document.querySelectorAll('#ga-gtag')
		expect(gaScripts.length).toBe(1)
	})
})
