import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@xoxosurveys.com' },
    update: {},
    create: {
      userId: 100,
      email: 'admin@xoxosurveys.com',
      name: 'Admin User',
      passwordHash: '$2b$10$q1KuT6s5.6p8QQJzVa3WCubKCUWCKGqVYK2SOVDv51YXbDCivIO7e', // admin123
      role: 'admin',
      emailVerified: true,
      isActive: true,
      inviteCode: 'NICE-ADMIN1',
      balance: 0,
      totalEarned: 0,
      surveysCompleted: 0,
      fraudScore: 0,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Create sample users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john@example.com' },
      update: {},
      create: {
        userId: 101,
        email: 'john@example.com',
        name: 'John Doe',
        passwordHash: '$2a$10$dummy',
        role: 'user',
        emailVerified: true,
        isActive: true,
        inviteCode: 'NICE-JOHN01',
        balance: 45.50,
        totalEarned: 120.00,
        surveysCompleted: 34,
        fraudScore: 5,
        lastLoginIp: '192.168.1.1',
        loginCount: 45,
      },
    }),
    prisma.user.upsert({
      where: { email: 'sarah@example.com' },
      update: {},
      create: {
        userId: 102,
        email: 'sarah@example.com',
        name: 'Sarah Smith',
        passwordHash: '$2a$10$dummy',
        role: 'user',
        emailVerified: true,
        isActive: true,
        inviteCode: 'NICE-SARAH1',
        balance: 22.30,
        totalEarned: 78.50,
        surveysCompleted: 22,
        fraudScore: 75,
        isFlagged: true,
        lastLoginIp: '10.0.0.55',
        loginCount: 30,
      },
    }),
    prisma.user.upsert({
      where: { email: 'mike@example.com' },
      update: {},
      create: {
        userId: 103,
        email: 'mike@example.com',
        name: 'Mike Johnson',
        passwordHash: '$2a$10$dummy',
        role: 'user',
        emailVerified: false,
        isBanned: true,
        isActive: false,
        banReason: 'Fraudulent activity',
        inviteCode: 'NICE-MIKE01',
        balance: 0,
        totalEarned: 15.00,
        surveysCompleted: 5,
        fraudScore: 90,
        isFlagged: true,
        lastLoginIp: '172.16.0.1',
        loginCount: 8,
      },
    }),
    prisma.user.upsert({
      where: { email: 'emma@example.com' },
      update: {},
      create: {
        userId: 104,
        email: 'emma@example.com',
        name: 'Emma Wilson',
        passwordHash: '$2a$10$dummy',
        role: 'user',
        emailVerified: true,
        isActive: true,
        inviteCode: 'NICE-EMMA01',
        balance: 88.90,
        totalEarned: 210.00,
        surveysCompleted: 56,
        fraudScore: 2,
        lastLoginIp: '203.0.113.42',
        loginCount: 120,
      },
    }),
    prisma.user.upsert({
      where: { email: 'bot_user@example.com' },
      update: {},
      create: {
        userId: 105,
        email: 'bot_user@example.com',
        name: 'Bot Account',
        passwordHash: '$2a$10$dummy',
        role: 'user',
        emailVerified: false,
        isBanned: true,
        isActive: false,
        banReason: 'Bot detected',
        inviteCode: 'NICE-BOT001',
        balance: 0,
        totalEarned: 2.50,
        surveysCompleted: 150,
        fraudScore: 95,
        isFlagged: true,
        deviceFingerprint: 'fp_bot_001',
        lastLoginIp: '45.33.32.156',
        loginCount: 3,
      },
    }),
  ])
  console.log(`✅ ${users.length} sample users created`)

  // Create survey walls
  const wallCpx = await prisma.surveyWall.upsert({
    where: { id: 'wall_cpx' },
    update: {},
    create: {
      id: 'wall_cpx',
      name: 'CPX Research',
      provider: 'cpx-research',
      apiKey: 'cpx_live_abc123',
      apiSecret: 'cpx_secret_xyz789',
      endpointUrl: 'https://api.cpx-research.com/v1',
      isActive: true,
      priority: 10,
      minPayout: 0.10,
      maxPayout: 5.00,
      description: 'CPX Research - High quality surveys with good completion rates',
      config: '{}',
      requireVerification: 0,
      blockVpn: true,
      blockProxy: true,
      minFraudScore: 50,
      cooldownMinutes: 5,
    },
  })

  const wallBitlabs = await prisma.surveyWall.upsert({
    where: { id: 'wall_bitlabs' },
    update: {},
    create: {
      id: 'wall_bitlabs',
      name: 'Bitlabs',
      provider: 'bitlabs',
      apiKey: 'bit_live_def456',
      apiSecret: 'bit_secret_uvW321',
      endpointUrl: 'https://api.bitlabs.com/v2',
      isActive: true,
      priority: 8,
      minPayout: 0.05,
      maxPayout: 3.00,
      description: 'Bitlabs - Wide variety of surveys globally',
      config: '{}',
      requireVerification: 0,
      blockVpn: true,
      blockProxy: false,
      minFraudScore: 40,
      cooldownMinutes: 3,
    },
  })

  const wallInbrain = await prisma.surveyWall.upsert({
    where: { id: 'wall_inbrain' },
    update: {},
    create: {
      id: 'wall_inbrain',
      name: 'Inbrain',
      provider: 'inbrain',
      apiKey: 'inb_live_ghi789',
      apiSecret: 'inb_secret_rst654',
      endpointUrl: 'https://api.inbrain.ai/v1',
      isActive: false,
      priority: 5,
      minPayout: 0.20,
      maxPayout: 4.00,
      description: 'Inbrain - Premium market research surveys',
      config: '{}',
      requireVerification: 1,
      blockVpn: true,
      blockProxy: true,
      minFraudScore: 60,
      cooldownMinutes: 10,
    },
  })
  console.log('✅ 3 survey walls created:', wallCpx.name, wallBitlabs.name, wallInbrain.name)

  // Create sample surveys
  const surveyData = [
    { wallId: wallCpx.id, title: 'Consumer Preferences Survey', category: 'Consumer', timeMinutes: 10, reward: 0.65, rating: 4.5, reviews: 120, available: 500, currentCompletions: 320, country: 'US', language: 'English' },
    { wallId: wallCpx.id, title: 'Technology Usage Study', category: 'Technology', timeMinutes: 15, reward: 1.20, rating: 4.2, reviews: 85, available: 300, currentCompletions: 180, country: 'US', language: 'English' },
    { wallId: wallCpx.id, title: 'Automotive Preferences', category: 'Automotive', timeMinutes: 20, reward: 2.50, rating: 4.8, reviews: 45, available: 100, maxCompletions: 100, currentCompletions: 78, country: 'US', language: 'English' },
    { wallId: wallCpx.id, title: 'Gaming Preferences', category: 'Gaming', timeMinutes: 7, reward: 0.40, rating: 4.3, reviews: 180, available: 800, currentCompletions: 450, country: 'US', language: 'English' },
    { wallId: wallBitlabs.id, title: 'Health & Wellness Survey', category: 'Health', timeMinutes: 8, reward: 0.45, rating: 4.0, reviews: 200, available: 1000, currentCompletions: 650, country: 'US', language: 'English' },
    { wallId: wallBitlabs.id, title: 'Food & Beverage Survey', category: 'Food', timeMinutes: 5, reward: 0.30, rating: 3.8, reviews: 340, available: 2000, currentCompletions: 1200, country: 'US', language: 'English' },
    { wallId: wallBitlabs.id, title: 'Travel Habits Survey', category: 'Travel', timeMinutes: 12, reward: 0.85, rating: 4.1, reviews: 95, available: 400, currentCompletions: 210, country: 'US', language: 'English' },
    { wallId: wallBitlabs.id, title: 'Entertainment Preferences', category: 'Entertainment', timeMinutes: 6, reward: 0.35, rating: 3.9, reviews: 250, available: 1500, currentCompletions: 800, country: 'US', language: 'English' },
    { wallId: wallInbrain.id, title: 'Premium Market Research', category: 'Market Research', timeMinutes: 25, reward: 3.50, rating: 4.9, reviews: 30, available: 50, maxCompletions: 50, currentCompletions: 42, country: 'US', language: 'English' },
    { wallId: wallInbrain.id, title: 'Financial Services Study', category: 'Finance', timeMinutes: 18, reward: 2.00, rating: 4.6, reviews: 55, available: 200, currentCompletions: 120, country: 'US', language: 'English' },
  ]

  for (const s of surveyData) {
    await prisma.survey.upsert({
      where: { id: `survey_${s.title.replace(/\s+/g, '_').toLowerCase()}` },
      update: {},
      create: {
        id: `survey_${s.title.replace(/\s+/g, '_').toLowerCase()}`,
        wallId: s.wallId,
        title: s.title,
        description: `${s.title} - ${s.category} category`,
        timeMinutes: s.timeMinutes,
        reward: s.reward,
        rating: s.rating,
        reviews: s.reviews,
        available: s.available,
        maxCompletions: s.maxCompletions || -1,
        currentCompletions: s.currentCompletions,
        category: s.category,
        country: s.country,
        language: s.language,
        isActive: true,
      },
    })
  }
  console.log('✅ 10 sample surveys created')

  // Create sample fraud events
  const fraudEvents = [
    { userId: users[1].id, eventType: 'vpn_detected', severity: 'high', details: '{"provider":"NordVPN","ip":"45.33.32.156"}', ipAddress: '45.33.32.156', country: 'DE' },
    { userId: users[2].id, eventType: 'fast_completion', severity: 'medium', details: '{"surveyTime":5,"expectedTime":20,"speedRatio":0.25}', ipAddress: '172.16.0.1', deviceFingerprint: 'fp_abc123', country: 'US' },
    { userId: users[4].id, eventType: 'bot_detected', severity: 'critical', details: '{"pattern":"rapid_fire","requestsPerMinute":120}', ipAddress: '45.33.32.156', deviceFingerprint: 'fp_bot_001', country: 'DE' },
    { userId: users[1].id, eventType: 'duplicate_ip', severity: 'medium', details: '{"accounts":3,"sameIp":"10.0.0.200"}', ipAddress: '10.0.0.200', country: 'US' },
    { userId: users[3].id, eventType: 'impossible_pattern', severity: 'high', details: '{"completedIn":2,"minPossible":10}', ipAddress: '203.0.113.42', deviceFingerprint: 'fp_xyz789', country: 'US', isResolved: true },
  ]

  for (const fe of fraudEvents) {
    await prisma.fraudEvent.create({ data: fe as Parameters<typeof prisma.fraudEvent.create>[0]['data'] })
  }
  console.log('✅ Sample fraud events created')

  // Create blocked IPs
  const blockedIps = [
    { ipAddress: '45.33.32.156', reason: 'Known VPN exit node', isAutoBlocked: true },
    { ipAddress: '185.220.101.1', reason: 'Tor exit node', isAutoBlocked: true },
    { ipAddress: '103.21.244.0', reason: 'Multiple fraud accounts', isAutoBlocked: false },
  ]

  for (const ip of blockedIps) {
    await prisma.blockedIp.upsert({
      where: { ipAddress: ip.ipAddress },
      update: {},
      create: ip,
    })
  }
  console.log('✅ Blocked IPs created')

  // Create blocked devices
  const blockedDevices = [
    { fingerprint: 'fp_bot_001', reason: 'Bot automation detected', isAutoBlocked: true },
    { fingerprint: 'fp_multi_001', reason: 'Multiple accounts same device', isAutoBlocked: false },
  ]

  for (const device of blockedDevices) {
    await prisma.blockedDevice.upsert({
      where: { fingerprint: device.fingerprint },
      update: {},
      create: device,
    })
  }
  console.log('✅ Blocked devices created')

  // Create admin settings
  const settings = [
    { key: 'siteName', value: 'XoXoSurveys', description: 'Site name' },
    { key: 'minCashout', value: '5.00', description: 'Minimum cashout amount' },
    { key: 'referralBonusPercent', value: '10', description: 'Referral bonus percentage' },
    { key: 'vpnBlockThreshold', value: '70', description: 'VPN detection confidence threshold' },
    { key: 'completionSpeedThreshold', value: '0.3', description: 'Minimum completion speed ratio' },
    { key: 'fraudScoreBlockThreshold', value: '50', description: 'Fraud score above which users are blocked' },
    { key: 'autoBlockVpn', value: 'true', description: 'Auto-block VPN connections' },
    { key: 'autoBlockProxy', value: 'true', description: 'Auto-block proxy connections' },
    { key: 'autoBlockTor', value: 'true', description: 'Auto-block Tor connections' },
    { key: 'autoFlagFastCompletion', value: 'true', description: 'Auto-flag suspiciously fast completions' },
    { key: 'defaultBlockVpn', value: 'true', description: 'Default VPN blocking for new walls' },
    { key: 'defaultBlockProxy', value: 'true', description: 'Default proxy blocking for new walls' },
    { key: 'defaultMinFraudScore', value: '50', description: 'Default fraud score threshold for new walls' },
    { key: 'defaultCooldown', value: '5', description: 'Default cooldown minutes for new walls' },
  ]

  for (const setting of settings) {
    await prisma.adminSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log('✅ Admin settings created')

  // Create sample cashouts
  const cashoutData = [
    { userId: users[0].id, giftCardType: 'PayPal', amount: 25.50, status: 'pending' },
    { userId: users[1].id, giftCardType: 'Amazon', amount: 50.00, status: 'pending', isFlagged: true, flagReason: 'VPN detected on cashout', ipAddress: '10.0.0.55' },
    { userId: users[3].id, giftCardType: 'PayPal', amount: 100.00, status: 'approved', reviewedAt: new Date(), ipAddress: '203.0.113.42' },
    { userId: users[4].id, giftCardType: 'Bitcoin', amount: 200.00, status: 'flagged', isFlagged: true, flagReason: 'Bot account, suspicious amount', ipAddress: '45.33.32.156' },
  ]

  for (const co of cashoutData) {
    await prisma.cashout.create({ data: co as Parameters<typeof prisma.cashout.create>[0]['data'] })
  }
  console.log('✅ Sample cashouts created')

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
