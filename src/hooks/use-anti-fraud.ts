'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface AntiFraudState {
  riskScore: number
  isBlocked: boolean
  isLoading: boolean
  ipInfo: {
    isVpn: boolean
    isProxy: boolean
    isTor: boolean
    country: string
    city: string
  } | null
  deviceFingerprint: string | null
}

interface RiskCheckResult {
  riskScore: number
  shouldBlock: boolean
  shouldFlag: boolean
  flags: string[]
  recommendedAction: 'allow' | 'flag' | 'block' | 'challenge'
}

/**
 * useAntiFraud — React hook that wraps anti-fraud checks for client-side use.
 *
 * - Checks IP on mount
 * - Collects and submits device fingerprint
 * - Provides checkBeforeAction() function that runs risk assessment before critical actions
 */
export function useAntiFraud() {
  const [state, setState] = useState<AntiFraudState>({
    riskScore: 0,
    isBlocked: false,
    isLoading: true,
    ipInfo: null,
    deviceFingerprint: null,
  })

  const hasInitialized = useRef(false)

  // Collect browser fingerprint
  const collectFingerprint = useCallback((): string => {
    try {
      const components: string[] = [
        navigator.userAgent,
        `${screen.width}x${screen.height}`,
        screen.colorDepth?.toString() || '24',
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.platform || 'unknown',
        navigator.language || 'unknown',
      ]

      // Canvas hash
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 200
        canvas.height = 50
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.textBaseline = 'top'
          ctx.font = '14px Arial'
          ctx.fillStyle = '#f60'
          ctx.fillRect(125, 1, 62, 20)
          ctx.fillStyle = '#069'
          ctx.fillText('XoXoSurveys FP', 2, 15)
          components.push(canvas.toDataURL())
        }
      } catch {
        // Canvas not available
      }

      // WebGL hash
      try {
        const glCanvas = document.createElement('canvas')
        const gl = glCanvas.getContext('webgl')
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
          if (debugInfo) {
            components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
          }
        }
      } catch {
        // WebGL not available
      }

      // Simple hash function
      let h1 = 0xdeadbeef
      let h2 = 0x41c6ce57
      const str = components.join('|')
      for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i)
        h1 = Math.imul(h1 ^ ch, 2654435761)
        h2 = Math.imul(h2 ^ ch, 1597334677)
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
      const combined = 4294967296 * (h2 >>> 0) + (h1 >>> 0)
      return combined.toString(16).padStart(16, '0')
    } catch {
      return 'fp-error-' + Date.now()
    }
  }, [])

  // Initialize: check IP and submit fingerprint
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initialize = async () => {
      try {
        // 1. Collect fingerprint
        const fingerprint = collectFingerprint()

        // 2. Submit fingerprint
        const fingerprintPromise = fetch('/api/anti-fraud/fingerprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fingerprint,
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            platform: navigator.platform,
            canvasHash: '',
            webglHash: '',
          }),
        }).catch(() => null)

        // 3. Check IP (we use a simulated client IP for demo)
        const ipCheckPromise = fetch('/api/anti-fraud/ip-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ipAddress: '0.0.0.0' }), // Server will use real IP from headers
        }).catch(() => null)

        const [fingerprintRes, ipCheckRes] = await Promise.all([
          fingerprintPromise,
          ipCheckPromise,
        ])

        let isBlocked = false
        let riskScore = 0
        let ipInfo: AntiFraudState['ipInfo'] = null

        // Process fingerprint result
        if (fingerprintRes?.ok) {
          const fpData = await fingerprintRes.json()
          if (fpData.isBlocked) {
            isBlocked = true
            riskScore = fpData.riskScore || 100
          }
          riskScore = Math.max(riskScore, fpData.riskScore || 0)
        }

        // Process IP check result
        if (ipCheckRes?.ok) {
          const ipData = await ipCheckRes.json()
          ipInfo = {
            isVpn: ipData.isVpn || false,
            isProxy: ipData.isProxy || false,
            isTor: ipData.isTor || false,
            country: ipData.country || 'Unknown',
            city: ipData.city || 'Unknown',
          }
          if (ipData.isBlocked) {
            isBlocked = true
          }
          riskScore = Math.max(riskScore, ipData.riskScore || 0)
        }

        setState(prev => ({
          ...prev,
          riskScore,
          isBlocked,
          isLoading: false,
          ipInfo,
          deviceFingerprint: fingerprint,
        }))
      } catch (error) {
        console.warn('[useAntiFraud] Initialization error:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
        }))
      }
    }

    initialize()
  }, [collectFingerprint])

  /**
   * Run a risk assessment before a critical action.
   * Returns the risk assessment result, or null if the check fails.
   */
  const checkBeforeAction = useCallback(
    async (
      action: 'login' | 'survey_start' | 'survey_complete' | 'cashout' | 'register',
      additionalData?: Record<string, unknown>,
      userId?: string,
    ): Promise<RiskCheckResult | null> => {
      try {
        const response = await fetch('/api/anti-fraud/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ipAddress: '0.0.0.0', // Server will use real IP from headers
            deviceFingerprint: state.deviceFingerprint,
            action,
            additionalData,
          }),
        })

        if (!response.ok) {
          console.warn('[useAntiFraud] Check failed:', response.status)
          return null
        }

        const result: RiskCheckResult = await response.json()

        // Update local state with the risk score
        setState(prev => ({
          ...prev,
          riskScore: result.riskScore,
          isBlocked: result.shouldBlock,
        }))

        return result
      } catch (error) {
        console.warn('[useAntiFraud] checkBeforeAction error:', error)
        return null
      }
    },
    [state.deviceFingerprint]
  )

  return {
    riskScore: state.riskScore,
    isBlocked: state.isBlocked,
    isLoading: state.isLoading,
    ipInfo: state.ipInfo,
    deviceFingerprint: state.deviceFingerprint,
    checkBeforeAction,
  }
}
