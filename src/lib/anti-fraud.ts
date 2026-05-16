import { db } from '@/lib/db'
import crypto from 'crypto'

// ==================== Types ====================

export interface IpCheckResult {
  isVpn: boolean
  isProxy: boolean
  isTor: boolean
  country: string
  city: string
  riskScore: number // 0-100
}

export interface FingerprintData {
  userAgent: string
  acceptLanguage: string
  screenResolution?: string
  timezone?: string
  platform?: string
  canvasHash?: string
  webglHash?: string
}

export interface CompletionSpeedResult {
  isSuspicious: boolean
  speedRatio: number // actual/expected, lower = more suspicious
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface AnswerPatternResult {
  consistencyScore: number // 0-100, lower = more suspicious
  isSuspicious: boolean
  flags: string[]
}

export interface RiskAssessmentParams {
  userId?: string
  ipAddress: string
  deviceFingerprint?: string
  action: 'login' | 'survey_start' | 'survey_complete' | 'cashout' | 'register'
  additionalData?: Record<string, unknown>
}

export interface RiskAssessmentResult {
  riskScore: number // 0-100
  shouldBlock: boolean
  shouldFlag: boolean
  flags: string[]
  recommendedAction: 'allow' | 'flag' | 'block' | 'challenge'
}

export interface FraudEventParams {
  userId?: string
  eventType: string
  severity: string
  details: Record<string, unknown>
  ipAddress?: string
  deviceFingerprint?: string
  country?: string
  city?: string
}

export interface ActivityLogParams {
  userId: string
  action: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  country?: string
  city?: string
}

export interface DuplicateAccountResult {
  isDuplicate: boolean
  matchingUsers: string[]
  confidence: number
}

// ==================== VPN/Proxy IP Ranges (Datacenter ranges) ====================

const DATACENTER_RANGES = [
  // AWS
  { start: '3.0.0.0', end: '3.255.255.255' },
  { start: '13.0.0.0', end: '13.255.255.255' },
  { start: '15.0.0.0', end: '15.255.255.255' },
  { start: '18.0.0.0', end: '18.255.255.255' },
  { start: '23.0.0.0', end: '23.255.255.255' },
  { start: '35.0.0.0', end: '35.255.255.255' },
  { start: '52.0.0.0', end: '52.255.255.255' },
  { start: '54.0.0.0', end: '54.255.255.255' },
  // Google Cloud
  { start: '34.0.0.0', end: '34.255.255.255' },
  { start: '35.192.0.0', end: '35.207.255.255' },
  // Azure
  { start: '20.0.0.0', end: '20.255.255.255' },
  { start: '40.0.0.0', end: '40.255.255.255' },
  { start: '52.96.0.0', end: '52.127.255.255' },
  // DigitalOcean
  { start: '64.225.0.0', end: '64.225.127.255' },
  { start: '138.68.0.0', end: '138.68.255.255' },
  { start: '142.93.0.0', end: '142.93.255.255' },
  // Vultr
  { start: '45.32.0.0', end: '45.77.255.255' },
  { start: '149.28.0.0', end: '149.28.255.255' },
  // Linode
  { start: '45.33.0.0', end: '45.33.127.255' },
  { start: '139.144.0.0', end: '139.144.255.255' },
  // Hetzner
  { start: '49.12.0.0', end: '49.13.255.255' },
  { start: '65.108.0.0', end: '65.109.255.255' },
  // OVH
  { start: '51.68.0.0', end: '51.79.255.255' },
  { start: '54.36.0.0', end: '54.38.255.255' },
  // Known VPN provider ranges
  { start: '5.181.26.0', end: '5.181.27.255' },  // NordVPN
  { start: '193.27.12.0', end: '193.27.15.255' }, // ExpressVPN
  { start: '89.44.10.0', end: '89.44.11.255' },   // Surfshark
]

// Common Tor exit node ranges (simplified)
const TOR_EXIT_RANGES = [
  { start: '178.17.170.0', end: '178.17.170.255' },
  { start: '185.220.100.0', end: '185.220.103.255' },
  { start: '199.249.230.0', end: '199.249.230.255' },
  { start: '51.15.43.0', end: '51.15.43.255' },
  { start: '62.102.148.0', end: '62.102.148.255' },
  { start: '104.244.72.0', end: '104.244.73.255' },
  { start: '195.176.3.0', end: '195.176.3.255' },
  { start: '213.61.215.0', end: '213.61.215.255' },
]

// Known VPN/Proxy provider IP patterns (simplified for demo)
const VPN_PROXY_PATTERNS = [
  /^10\./,           // Private (sometimes VPN)
  /^172\.(1[6-9]|2\d|3[01])\./, // Private (sometimes VPN)
  /^192\.168\./,     // Private (sometimes VPN)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
]

// ==================== Helper Functions ====================

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function isIpInRange(ip: string, start: string, end: string): boolean {
  try {
    const ipNum = ipToNumber(ip)
    const startNum = ipToNumber(start)
    const endNum = ipToNumber(end)
    return ipNum >= startNum && ipNum <= endNum
  } catch {
    return false
  }
}

function isPrivateIp(ip: string): boolean {
  return VPN_PROXY_PATTERNS.some(pattern => pattern.test(ip))
}

// Simple hash for fingerprint generation
function stableHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32)
}

// ==================== Anti-Fraud Engine ====================

class AntiFraudEngine {
  // Check if an IP is a VPN/proxy/Tor using multiple heuristics
  async checkIp(ip: string): Promise<IpCheckResult> {
    let isVpn = false
    let isProxy = false
    let isTor = false
    let riskScore = 0
    let country = 'Unknown'
    let city = 'Unknown'

    // Check if IP is in blocked list from DB
    const blockedIp = await db.blockedIp.findUnique({
      where: { ipAddress: ip },
    })

    if (blockedIp) {
      riskScore = 100
      isProxy = true
      return { isVpn: true, isProxy: true, isTor: true, country, city, riskScore }
    }

    // Check against known datacenter IP ranges (VPN/hosting)
    for (const range of DATACENTER_RANGES) {
      if (isIpInRange(ip, range.start, range.end)) {
        isVpn = true
        riskScore += 40
        break
      }
    }

    // Check against Tor exit node ranges
    for (const range of TOR_EXIT_RANGES) {
      if (isIpInRange(ip, range.start, range.end)) {
        isTor = true
        riskScore += 60
        break
      }
    }

    // Check if private/reserved IP
    if (isPrivateIp(ip)) {
      isProxy = true
      riskScore += 20
    }

    // Check if this IP has been seen before with VPN/proxy flags
    const existingIp = await db.userIp.findFirst({
      where: { ipAddress: ip },
    })

    if (existingIp) {
      if (existingIp.isVpn) {
        isVpn = true
        riskScore += 30
      }
      if (existingIp.isProxy) {
        isProxy = true
        riskScore += 25
      }
      if (existingIp.isTor) {
        isTor = true
        riskScore += 40
      }
      if (existingIp.isBlocked) {
        riskScore += 50
      }
      // Use stored geolocation if available
      if (existingIp.country) country = existingIp.country
      if (existingIp.city) city = existingIp.city
    }

    // Heuristic: Check for suspicious IP patterns
    const ipParts = ip.split('.')
    if (ipParts.length === 4) {
      const firstOctet = Number(ipParts[0])
      // Datacenter ranges often start with specific octets
      if ([3, 5, 13, 15, 18, 23, 34, 35, 40, 45, 49, 51, 52, 54, 64, 65, 89, 104, 138, 142, 149, 199].includes(firstOctet)) {
        riskScore += 10 // Minor suspicion
      }
    }

    // Simulated geolocation based on IP hash (for demo purposes)
    if (country === 'Unknown') {
      const hash = stableHash(ip)
      const countries = ['United States', 'United Kingdom', 'Germany', 'France', 'Netherlands', 'Canada', 'Australia', 'Japan', 'Brazil', 'India']
      const cities = ['New York', 'London', 'Berlin', 'Paris', 'Amsterdam', 'Toronto', 'Sydney', 'Tokyo', 'São Paulo', 'Mumbai']
      const idx = parseInt(hash.substring(0, 2), 16) % countries.length
      country = countries[idx]
      city = cities[idx]
    }

    riskScore = Math.min(100, riskScore)

    return { isVpn, isProxy, isTor, country, city, riskScore }
  }

  // Generate a device fingerprint hash from request data
  generateFingerprint(data: FingerprintData): string {
    const components: string[] = []

    components.push(data.userAgent || '')
    components.push(data.acceptLanguage || '')
    components.push(data.screenResolution || '')
    components.push(data.timezone || '')
    components.push(data.platform || '')
    components.push(data.canvasHash || '')
    components.push(data.webglHash || '')

    return stableHash(components.join('|'))
  }

  // Check if user is completing surveys too fast
  checkCompletionSpeed(attempt: {
    surveyTimeMinutes: number
    actualTimeSeconds: number
  }): CompletionSpeedResult {
    const expectedTimeSeconds = attempt.surveyTimeMinutes * 60
    const speedRatio = expectedTimeSeconds > 0
      ? attempt.actualTimeSeconds / expectedTimeSeconds
      : 1

    let isSuspicious = false
    let severity: CompletionSpeedResult['severity'] = 'low'

    if (speedRatio < 0.3) {
      // Less than 30% of expected time — critical
      isSuspicious = true
      severity = 'critical'
    } else if (speedRatio < 0.5) {
      // Less than 50% of expected time — high
      isSuspicious = true
      severity = 'high'
    } else if (speedRatio < 0.7) {
      // Less than 70% of expected time — medium
      isSuspicious = true
      severity = 'medium'
    }

    return { isSuspicious, speedRatio: Math.round(speedRatio * 1000) / 1000, severity }
  }

  // Detect answer pattern anomalies (straight-lining, random patterns)
  analyzeAnswerPattern(answers: Record<string, unknown>): AnswerPatternResult {
    const flags: string[] = []
    const values = Object.values(answers)
    let consistencyScore = 100

    if (values.length === 0) {
      return { consistencyScore: 0, isSuspicious: true, flags: ['no_answers'] }
    }

    // Check for straight-lining (all same answers)
    const uniqueValues = new Set(values.map(v => JSON.stringify(v)))
    const straightLineRatio = uniqueValues.size / values.length

    if (straightLineRatio <= 0.1 && values.length >= 5) {
      // Almost all answers are the same
      flags.push('straight_lining')
      consistencyScore -= 50
    } else if (straightLineRatio <= 0.2 && values.length >= 5) {
      flags.push('near_straight_lining')
      consistencyScore -= 30
    }

    // Check for sequential pattern (1,2,3,4,5,1,2,3,4,5)
    const numericValues = values.filter(v => typeof v === 'number') as number[]
    if (numericValues.length >= 4) {
      let isSequential = true
      for (let i = 1; i < numericValues.length; i++) {
        if (numericValues[i] !== numericValues[i - 1] + 1) {
          isSequential = false
          break
        }
      }
      if (isSequential) {
        flags.push('sequential_pattern')
        consistencyScore -= 35
      }

      // Check for alternating pattern (1,2,1,2)
      let isAlternating = true
      if (numericValues.length >= 4) {
        for (let i = 2; i < numericValues.length; i++) {
          if (numericValues[i] !== numericValues[i % 2]) {
            isAlternating = false
            break
          }
        }
        if (isAlternating) {
          flags.push('alternating_pattern')
          consistencyScore -= 30
        }
      }
    }

    // Check for random answering (very high variance in rating questions)
    if (numericValues.length >= 5) {
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length
      const stdDev = Math.sqrt(variance)

      // For typical 1-5 scales, standard deviation > 2 suggests random answering
      if (stdDev > 2.0 && mean > 0) {
        flags.push('random_answering')
        consistencyScore -= 25
      }
    }

    // Check for impossible patterns in text answers
    const textValues = values.filter(v => typeof v === 'string') as string[]
    if (textValues.length >= 3) {
      const shortTexts = textValues.filter(v => v.trim().length <= 2)
      if (shortTexts.length / textValues.length > 0.7) {
        flags.push('short_gibberish_answers')
        consistencyScore -= 30
      }

      // Check for repeated identical text answers
      const textSet = new Set(textValues.map(v => v.trim().toLowerCase()))
      if (textSet.size === 1 && textValues.length >= 3) {
        flags.push('repeated_text_answers')
        consistencyScore -= 40
      }
    }

    consistencyScore = Math.max(0, consistencyScore)
    const isSuspicious = consistencyScore < 60

    return { consistencyScore, isSuspicious, flags }
  }

  // Main risk assessment for a user action
  async assessRisk(params: RiskAssessmentParams): Promise<RiskAssessmentResult> {
    const flags: string[] = []
    let riskScore = 0

    // 1. Check IP address
    const ipResult = await this.checkIp(params.ipAddress)
    if (ipResult.isVpn) {
      flags.push('vpn_detected')
      riskScore += 25
    }
    if (ipResult.isProxy) {
      flags.push('proxy_detected')
      riskScore += 20
    }
    if (ipResult.isTor) {
      flags.push('tor_detected')
      riskScore += 40
    }
    riskScore += Math.floor(ipResult.riskScore * 0.3)

    // 2. Check device fingerprint against blocked devices
    if (params.deviceFingerprint) {
      const blockedDevice = await db.blockedDevice.findUnique({
        where: { fingerprint: params.deviceFingerprint },
      })
      if (blockedDevice) {
        flags.push('blocked_device')
        riskScore += 50
      }
    }

    // 3. Check user's existing fraud score
    if (params.userId) {
      const user = await db.user.findUnique({
        where: { id: params.userId },
        select: {
          fraudScore: true,
          fraudFlags: true,
          isFlagged: true,
          isBanned: true,
          isVpnBlocked: true,
        },
      })

      if (user) {
        if (user.isBanned) {
          flags.push('banned_user')
          riskScore += 100
        }
        if (user.isFlagged) {
          flags.push('flagged_user')
          riskScore += 30
        }
        if (user.isVpnBlocked && ipResult.isVpn) {
          flags.push('vpn_blocked_user')
          riskScore += 40
        }
        riskScore += Math.floor(user.fraudScore * 0.3)
      }

      // 4. Check for duplicate accounts
      const duplicateCheck = await this.checkDuplicateAccount({
        ipAddress: params.ipAddress,
        deviceFingerprint: params.deviceFingerprint,
        currentUserEmail: params.userId,
      })
      if (duplicateCheck.isDuplicate) {
        flags.push('duplicate_account')
        riskScore += Math.floor(duplicateCheck.confidence * 35)
      }

      // 5. Check recent activity frequency
      const recentActivity = await db.activityLog.findMany({
        where: {
          userId: params.userId,
          action: params.action,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // last hour
        },
      })

      if (recentActivity.length > 10) {
        flags.push('high_frequency_action')
        riskScore += 25
      } else if (recentActivity.length > 5) {
        flags.push('elevated_frequency')
        riskScore += 10
      }

      // 6. For survey_complete, check completion speed and answer patterns
      if (params.action === 'survey_complete' && params.additionalData) {
        const { surveyTimeMinutes, actualTimeSeconds, answers } = params.additionalData as Record<string, unknown>

        if (typeof surveyTimeMinutes === 'number' && typeof actualTimeSeconds === 'number') {
          const speedResult = this.checkCompletionSpeed({
            surveyTimeMinutes,
            actualTimeSeconds: actualTimeSeconds,
          })
          if (speedResult.isSuspicious) {
            flags.push(`fast_completion_${speedResult.severity}`)
            riskScore += speedResult.severity === 'critical' ? 50
              : speedResult.severity === 'high' ? 35
              : speedResult.severity === 'medium' ? 20
              : 10
          }
        }

        if (answers && typeof answers === 'object') {
          const patternResult = this.analyzeAnswerPattern(answers as Record<string, unknown>)
          if (patternResult.isSuspicious) {
            flags.push(...patternResult.flags.map(f => `pattern_${f}`))
            riskScore += Math.floor((100 - patternResult.consistencyScore) * 0.3)
          }
        }
      }

      // 7. For cashout, check for suspicious patterns
      if (params.action === 'cashout') {
        const recentCashouts = await db.cashout.findMany({
          where: {
            userId: params.userId,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        })
        if (recentCashouts.length >= 3) {
          flags.push('frequent_cashouts')
          riskScore += 30
        }
      }
    }

    // 8. Timezone mismatch check (if additional data has timezone)
    if (params.additionalData?.timezone && ipResult.country !== 'Unknown') {
      const clientTimezone = params.additionalData.timezone as string
      const ipResultForTz = await this.checkIp(params.ipAddress)
      // Simple heuristic: if timezone doesn't match expected country
      const timezoneCountryMap: Record<string, string[]> = {
        'America/New_York': ['United States'],
        'America/Los_Angeles': ['United States'],
        'America/Chicago': ['United States'],
        'Europe/London': ['United Kingdom'],
        'Europe/Berlin': ['Germany'],
        'Europe/Paris': ['France'],
        'Europe/Amsterdam': ['Netherlands'],
        'America/Toronto': ['Canada'],
        'Australia/Sydney': ['Australia'],
        'Asia/Tokyo': ['Japan'],
        'America/Sao_Paulo': ['Brazil'],
        'Asia/Kolkata': ['India'],
      }
      const expectedCountries = timezoneCountryMap[clientTimezone]
      if (expectedCountries && !expectedCountries.includes(ipResultForTz.country)) {
        flags.push('timezone_mismatch')
        riskScore += 20
      }
    }

    riskScore = Math.min(100, riskScore)

    // Determine recommended action
    let recommendedAction: RiskAssessmentResult['recommendedAction'] = 'allow'
    let shouldBlock = false
    let shouldFlag = false

    if (riskScore >= 80) {
      recommendedAction = 'block'
      shouldBlock = true
    } else if (riskScore >= 60) {
      recommendedAction = 'challenge'
      shouldFlag = true
    } else if (riskScore >= 35) {
      recommendedAction = 'flag'
      shouldFlag = true
    }

    return { riskScore, shouldBlock, shouldFlag, flags, recommendedAction }
  }

  // Log a fraud event
  async logFraudEvent(params: FraudEventParams): Promise<void> {
    await db.fraudEvent.create({
      data: {
        userId: params.userId,
        eventType: params.eventType,
        severity: params.severity,
        details: JSON.stringify(params.details),
        ipAddress: params.ipAddress,
        deviceFingerprint: params.deviceFingerprint,
        country: params.country,
        city: params.city,
      },
    })

    // Update user's fraud score if userId provided
    if (params.userId) {
      const scoreIncrease =
        params.severity === 'critical' ? 20
        : params.severity === 'high' ? 15
        : params.severity === 'medium' ? 10
        : 5

      await db.user.update({
        where: { id: params.userId },
        data: {
          fraudScore: { increment: Math.min(scoreIncrease, 100) },
          isFlagged: true,
          fraudFlags: JSON.stringify([
            ...JSON.parse(
              (await db.user.findUnique({ where: { id: params.userId }, select: { fraudFlags: true } }))?.fraudFlags || '[]'
            ),
            params.eventType,
          ]),
        },
      })
    }
  }

  // Log user activity
  async logActivity(params: ActivityLogParams): Promise<void> {
    await db.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        details: JSON.stringify(params.details || {}),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        deviceFingerprint: params.deviceFingerprint,
        country: params.country,
        city: params.city,
      },
    })
  }

  // Check for multiple accounts from same IP/device
  async checkDuplicateAccount(params: {
    ipAddress: string
    deviceFingerprint?: string
    currentUserEmail?: string
  }): Promise<DuplicateAccountResult> {
    const matchingUsers: string[] = []
    let confidence = 0

    // Find other users with the same IP
    const ipMatches = await db.userIp.findMany({
      where: { ipAddress: params.ipAddress },
      include: { user: { select: { id: true, email: true } } },
    })

    const ipUserIds = ipMatches
      .filter(m => m.userId !== params.currentUserEmail)
      .map(m => m.user?.id)
      .filter(Boolean) as string[]

    if (ipUserIds.length > 0) {
      matchingUsers.push(...ipUserIds)
      confidence += 0.4
    }

    // Find other users with the same device fingerprint
    if (params.deviceFingerprint) {
      const deviceSessions = await db.session.findMany({
        where: { deviceFingerprint: params.deviceFingerprint },
        include: { user: { select: { id: true } } },
      })

      const deviceUserIds = deviceSessions
        .filter(s => s.userId !== params.currentUserEmail)
        .map(s => s.user.id)
        .filter(id => !matchingUsers.includes(id))

      if (deviceUserIds.length > 0) {
        matchingUsers.push(...deviceUserIds)
        confidence += 0.5
      }

      // Also check user table for matching device fingerprints
      const matchingDeviceUsers = await db.user.findMany({
        where: {
          deviceFingerprint: params.deviceFingerprint,
          id: { not: params.currentUserEmail },
        },
        select: { id: true },
      })

      const additionalIds = matchingDeviceUsers
        .map(u => u.id)
        .filter(id => !matchingUsers.includes(id))

      if (additionalIds.length > 0) {
        matchingUsers.push(...additionalIds)
        confidence += 0.4
      }
    }

    // If both IP and device match, high confidence
    if (ipUserIds.length > 0 && params.deviceFingerprint && matchingUsers.length > 0) {
      confidence = Math.min(1, confidence + 0.2)
    }

    // Multiple accounts from same IP alone is moderate confidence
    if (ipUserIds.length >= 3) {
      confidence = Math.min(1, confidence + 0.2)
    }

    return {
      isDuplicate: matchingUsers.length > 0,
      matchingUsers: [...new Set(matchingUsers)],
      confidence: Math.min(1, confidence),
    }
  }

  // Store/update IP info for a user
  async recordUserIp(params: {
    userId: string
    ipAddress: string
    country?: string
    city?: string
    isVpn?: boolean
    isProxy?: boolean
    isTor?: boolean
  }): Promise<void> {
    await db.userIp.upsert({
      where: {
        userId_ipAddress: {
          userId: params.userId,
          ipAddress: params.ipAddress,
        },
      },
      create: {
        userId: params.userId,
        ipAddress: params.ipAddress,
        country: params.country,
        city: params.city,
        isVpn: params.isVpn || false,
        isProxy: params.isProxy || false,
        isTor: params.isTor || false,
      },
      update: {
        country: params.country,
        city: params.city,
        isVpn: params.isVpn || false,
        isProxy: params.isProxy || false,
        isTor: params.isTor || false,
      },
    })
  }

  // ==================== EARNING VELOCITY CHECK ====================
  // Detect if a user is earning money suspiciously fast (auto-surveying / bot)
  async checkEarningVelocity(userId: string): Promise<{
    isSuspicious: boolean
    earnedLast1h: number
    earnedLast24h: number
    completionsLast1h: number
    completionsLast24h: number
    severity: 'low' | 'medium' | 'high' | 'critical'
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Check activity logs for survey completions
    const completions1h = await db.activityLog.findMany({
      where: {
        userId,
        action: { in: ['survey_complete', 'provider_postback', 'revtoo_survey_complete'] },
        createdAt: { gte: oneHourAgo },
      },
    })

    const completions24h = await db.activityLog.findMany({
      where: {
        userId,
        action: { in: ['survey_complete', 'provider_postback', 'revtoo_survey_complete'] },
        createdAt: { gte: twentyFourHoursAgo },
      },
    })

    let earnedLast1h = 0
    let earnedLast24h = 0

    for (const log of completions1h) {
      try {
        const details = JSON.parse(log.details || '{}')
        earnedLast1h += details.reward || details.earnedAmount || 0
      } catch {}
    }

    for (const log of completions24h) {
      try {
        const details = JSON.parse(log.details || '{}')
        earnedLast24h += details.reward || details.earnedAmount || 0
      } catch {}
    }

    const completionsLast1h = completions1h.length
    const completionsLast24h = completions24h.length

    let isSuspicious = false
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

    // Critical: More than 20 completions or $10+ in 1 hour
    if (completionsLast1h > 20 || earnedLast1h > 10) {
      isSuspicious = true
      severity = 'critical'
    }
    // High: More than 15 completions or $7+ in 1 hour
    else if (completionsLast1h > 15 || earnedLast1h > 7) {
      isSuspicious = true
      severity = 'high'
    }
    // Medium: More than 50 completions or $20+ in 24 hours
    else if (completionsLast24h > 50 || earnedLast24h > 20) {
      isSuspicious = true
      severity = 'medium'
    }

    return {
      isSuspicious,
      earnedLast1h,
      earnedLast24h,
      completionsLast1h,
      completionsLast24h,
      severity,
    }
  }

  // ==================== BOT PATTERN DETECTION ====================
  // Detect auto-surveying bots by analyzing completion timing patterns
  async checkBotPattern(userId: string): Promise<{
    isBot: boolean
    confidence: number // 0-1
    patterns: string[]
  }> {
    const patterns: string[] = []
    let confidence = 0

    // Get recent survey completion activity
    const recentLogs = await db.activityLog.findMany({
      where: {
        userId,
        action: { in: ['survey_complete', 'survey_start'] },
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // Last 2 hours
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    if (recentLogs.length < 3) {
      return { isBot: false, confidence: 0, patterns: [] }
    }

    // Check for perfectly regular intervals (bots often have consistent timing)
    const timestamps = recentLogs.map(l => l.createdAt.getTime())
    const intervals: number[] = []
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1])
    }

    if (intervals.length >= 3) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const variance = intervals.reduce((sum, iv) => sum + Math.pow(iv - avgInterval, 2), 0) / intervals.length
      const stdDev = Math.sqrt(variance)

      // If standard deviation is very low compared to average, it's suspicious
      const coefficientOfVariation = avgInterval > 0 ? stdDev / avgInterval : 0
      if (coefficientOfVariation < 0.1 && intervals.length >= 4) {
        // Very regular intervals - strong bot indicator
        patterns.push('regular_intervals')
        confidence += 0.5
      } else if (coefficientOfVariation < 0.2 && intervals.length >= 5) {
        patterns.push('semi_regular_intervals')
        confidence += 0.25
      }

      // Check for exact same interval repeated
      const uniqueIntervals = new Set(intervals.map(iv => Math.round(iv / 1000)))
      if (uniqueIntervals.size <= 2 && intervals.length >= 5) {
        patterns.push('identical_intervals')
        confidence += 0.4
      }
    }

    // Check for identical time gaps between start and complete (always same duration)
    const startCompletePairs: Record<number, number> = {}
    for (let i = 0; i < recentLogs.length - 1; i++) {
      if (recentLogs[i].action === 'survey_start' && recentLogs[i + 1].action === 'survey_complete') {
        try {
          const startDetails = JSON.parse(recentLogs[i].details || '{}')
          const completeDetails = JSON.parse(recentLogs[i + 1].details || '{}')
          if (startDetails.surveyId === completeDetails.surveyId) {
            const duration = recentLogs[i + 1].createdAt.getTime() - recentLogs[i].createdAt.getTime()
            const key = Math.round(duration / 1000) // Round to seconds
            startCompletePairs[key] = (startCompletePairs[key] || 0) + 1
          }
        } catch {}
      }
    }

    const pairValues = Object.values(startCompletePairs)
    const identicalCount = pairValues.filter(v => v >= 3).length
    if (identicalCount > 0) {
      patterns.push('identical_completion_times')
      confidence += 0.4
    }

    // Check for rapid-fire completions (multiple completions in very short time)
    const rapidFireThreshold = 15 * 1000 // 15 seconds
    let rapidFireCount = 0
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 1] < rapidFireThreshold && 
          recentLogs[i].action === 'survey_complete' && 
          recentLogs[i - 1].action === 'survey_complete') {
        rapidFireCount++
      }
    }
    if (rapidFireCount >= 2) {
      patterns.push('rapid_fire_completions')
      confidence += 0.5
    }

    confidence = Math.min(1, confidence)
    return {
      isBot: confidence >= 0.5,
      confidence,
      patterns,
    }
  }

  // ==================== REFERRAL FRAUD DETECTION ====================
  // Check if referred accounts are legitimate (same IP/device = fake referrals)
  async checkReferralFraud(userId: string): Promise<{
    isFraud: boolean
    suspiciousReferrals: string[]
    confidence: number
  }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, inviteCode: true, ips: true, deviceFingerprint: true },
    })

    if (!user) return { isFraud: false, suspiciousReferrals: [], confidence: 0 }

    // Find users who were invited by this user
    const referredUsers = await db.user.findMany({
      where: { invitedBy: user.inviteCode },
      select: { id: true, email: true, ips: true, deviceFingerprint: true, surveysCompleted: true, createdAt: true },
    })

    if (referredUsers.length === 0) return { isFraud: false, suspiciousReferrals: [], confidence: 0 }

    const suspiciousReferrals: string[] = []
    let confidence = 0

    const referrerIps = user.ips.map(ip => ip.ipAddress)
    const referrerDevice = user.deviceFingerprint

    for (const referred of referredUsers) {
      let isSuspicious = false

      // Same device fingerprint as referrer
      if (referrerDevice && referred.deviceFingerprint && referrerDevice === referred.deviceFingerprint) {
        isSuspicious = true
        confidence += 0.4
      }

      // Same IP address as referrer
      const referredIps = referred.ips.map(ip => ip.ipAddress)
      const commonIps = referredIps.filter(ip => referrerIps.includes(ip))
      if (commonIps.length > 0) {
        isSuspicious = true
        confidence += 0.3
      }

      // Referred account has zero or very few surveys (created just for referral bonus)
      if (referred.surveysCompleted < 1) {
        isSuspicious = true
        confidence += 0.2
      }

      // Referred account created very recently and already earned
      const accountAge = Date.now() - new Date(referred.createdAt).getTime()
      const accountAgeHours = accountAge / (1000 * 60 * 60)
      if (accountAgeHours < 24 && referred.surveysCompleted > 5) {
        isSuspicious = true
        confidence += 0.3
      }

      // Check if referred accounts share IPs/devices with each other
      for (const otherReferred of referredUsers) {
        if (otherReferred.id === referred.id) continue
        const otherIps = otherReferred.ips.map(ip => ip.ipAddress)
        const sharedIps = referredIps.filter(ip => otherIps.includes(ip))
        if (sharedIps.length > 0) {
          isSuspicious = true
          confidence += 0.15
        }
      }

      if (isSuspicious) {
        suspiciousReferrals.push(referred.email)
      }
    }

    confidence = Math.min(1, confidence)
    return {
      isFraud: suspiciousReferrals.length > 0 && confidence >= 0.3,
      suspiciousReferrals,
      confidence,
    }
  }

  // ==================== AUTO-BLOCK / AUTO-FLAG ====================
  // Automatically block or flag a user based on criteria
  async autoBlockUser(userId: string, reason: string, blockType: 'flag' | 'block' | 'ban'): Promise<void> {
    if (blockType === 'ban') {
      await db.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason,
          fraudScore: 100,
          isFlagged: true,
        },
      })
    } else if (blockType === 'block') {
      await db.user.update({
        where: { id: userId },
        data: {
          isVpnBlocked: true,
          fraudScore: { increment: 30 },
          isFlagged: true,
        },
      })
    } else {
      await db.user.update({
        where: { id: userId },
        data: {
          isFlagged: true,
          fraudScore: { increment: 15 },
        },
      })
    }

    // Log the auto-action
    await db.fraudEvent.create({
      data: {
        userId,
        eventType: blockType === 'ban' ? 'auto_banned' : blockType === 'block' ? 'auto_blocked' : 'auto_flagged',
        severity: blockType === 'ban' ? 'critical' : blockType === 'block' ? 'high' : 'medium',
        details: JSON.stringify({ reason, blockType, autoAction: true }),
      },
    })
  }

  // ==================== RATE LIMITER ====================
  // Check if a user has exceeded rate limits for an action
  async checkRateLimit(userId: string, action: string, maxActions: number, windowMinutes: number): Promise<{
    isLimited: boolean
    currentCount: number
    windowMinutes: number
  }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
    const recentActions = await db.activityLog.findMany({
      where: {
        userId,
        action,
        createdAt: { gte: windowStart },
      },
    })

    return {
      isLimited: recentActions.length >= maxActions,
      currentCount: recentActions.length,
      windowMinutes,
    }
  }
}

// Export singleton instance
export const antiFraudEngine = new AntiFraudEngine()
