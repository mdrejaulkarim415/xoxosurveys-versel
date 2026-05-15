'use client'

import { useEffect, useRef } from 'react'

interface FingerprintData {
  fingerprint: string
  userAgent: string
  screenResolution: string
  timezone: string
  platform: string
  language: string
  colorDepth: number
  deviceMemory: number | null
  hardwareConcurrency: number | null
  touchSupport: boolean
  canvasHash: string
  webglHash: string
  webglRenderer: string
  plugins: string[]
}

/**
 * Generates a stable hash from a string using a simple but effective algorithm.
 * This avoids the SubtleCrypto async API and works synchronously.
 */
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const combined = 4294967296 * (h2 >>> 0) + (h1 >>> 0)
  return combined.toString(16).padStart(16, '0')
}

/**
 * Generate a canvas fingerprint hash.
 * Renders text and shapes to a canvas and hashes the resulting pixel data.
 */
function generateCanvasHash(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    // Draw text with specific fonts
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('XoXoSurveys FP', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('XoXoSurveys FP', 4, 17)

    // Draw shapes
    ctx.beginPath()
    ctx.arc(50, 25, 20, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.fill()

    const dataUrl = canvas.toDataURL()
    return simpleHash(dataUrl)
  } catch {
    return 'canvas-error'
  }
}

/**
 * Generate a WebGL fingerprint hash by reading renderer info.
 */
function generateWebglHash(): { hash: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return { hash: 'no-webgl', renderer: 'no-webgl' }

    const glContext = gl as WebGLRenderingContext
    const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo
      ? glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : glContext.getParameter(glContext.RENDERER)

    const vendor = debugInfo
      ? glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : glContext.getParameter(glContext.VENDOR)

    return {
      hash: simpleHash(`${renderer}|${vendor}`),
      renderer: typeof renderer === 'string' ? renderer : 'unknown',
    }
  } catch {
    return { hash: 'webgl-error', renderer: 'webgl-error' }
  }
}

/**
 * Collect browser fingerprint data.
 */
function collectFingerprint(): FingerprintData {
  const canvasHash = generateCanvasHash()
  const { hash: webglHash, renderer: webglRenderer } = generateWebglHash()

  // Get screen info
  const screenResolution = `${screen.width}x${screen.height}`
  const colorDepth = screen.colorDepth || 24

  // Get navigator info
  const platform = navigator.platform || 'unknown'
  const language = navigator.language || 'unknown'
  const hardwareConcurrency = navigator.hardwareConcurrency || null

  // Device memory (only available in some browsers)
  const nav = navigator as Navigator & { deviceMemory?: number }
  const deviceMemory = nav.deviceMemory || null

  // Touch support
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Plugins (non-invasive)
  const plugins: string[] = []
  if (navigator.plugins) {
    for (let i = 0; i < Math.min(navigator.plugins.length, 10); i++) {
      plugins.push(navigator.plugins[i].name)
    }
  }

  // Timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // User agent
  const userAgent = navigator.userAgent

  // Generate composite fingerprint hash from all components
  const components = [
    userAgent,
    screenResolution,
    colorDepth.toString(),
    timezone,
    platform,
    language,
    canvasHash,
    webglHash,
    hardwareConcurrency?.toString() || '',
    deviceMemory?.toString() || '',
    touchSupport.toString(),
    plugins.join(','),
  ]

  const fingerprint = simpleHash(components.join('|'))

  return {
    fingerprint,
    userAgent,
    screenResolution,
    timezone,
    platform,
    language,
    colorDepth,
    deviceMemory,
    hardwareConcurrency,
    touchSupport,
    canvasHash,
    webglHash,
    webglRenderer,
    plugins,
  }
}

/**
 * FingerprintCollector — a silent component that collects browser
 * fingerprint data on mount and submits it to the server.
 * Add this to your dashboard layout to enable automatic fingerprint collection.
 */
export function FingerprintCollector() {
  const hasSubmitted = useRef(false)

  useEffect(() => {
    if (hasSubmitted.current) return
    hasSubmitted.current = true

    const submitFingerprint = async () => {
      try {
        const data = collectFingerprint()

        const response = await fetch('/api/anti-fraud/fingerprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          console.warn('[FingerprintCollector] Submission failed:', response.status)
        }
      } catch (error) {
        // Silently fail — fingerprint collection should not disrupt the user experience
        console.warn('[FingerprintCollector] Error:', error)
      }
    }

    // Delay slightly to avoid blocking initial page render
    const timer = setTimeout(submitFingerprint, 1500)
    return () => clearTimeout(timer)
  }, [])

  // This component renders nothing
  return null
}
