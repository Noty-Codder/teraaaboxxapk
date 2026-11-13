import { UserProfile, PaymentRequest, BotSettings, PlanType, PlanConfig, ActivityLog } from '../types';

export const PLANS_CONFIG: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free Plan',
    badge: '🥉 Standard',
    color: 'slate',
    downloadsPerDay: 3,
    uploadsPerDay: 3,
    pricing: {},
    features: [
      '3 TeraBox downloads per day',
      '3 File uploads to create links per day',
      'Supports Audio, Video, Photo formats',
      'Standard download speeds',
      'Integrated Offline Media Vault',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    badge: '🥈 High Speed',
    color: 'cyan',
    downloadsPerDay: 17,
    uploadsPerDay: 15,
    pricing: {
      sevenDays: 15,
      thirtyDays: 27,
    },
    features: [
      '17 TeraBox downloads per day',
      '15 Video/Audio uploads to create links',
      'High-speed multi-threaded acceleration',
      'Watermarked Video Thumbnails',
      'Priority Offline Media Manager',
    ],
  },
  beta: {
    id: 'beta',
    name: 'Beta VIP Plan',
    badge: '🥇 Unlimited VIP',
    color: 'amber',
    downloadsPerDay: 'unlimited',
    uploadsPerDay: 'unlimited',
    pricing: {
      thirtyDays: 69,
    },
    features: [
      '♾️ Unlimited TeraBox downloads',
      '♾️ Unlimited Uploads to create share links',
      'Ultra Turbo VIP download speed',
      'Watermarked Video Thumbnails (Custom tag option)',
      'Direct Offline Caching without wait queues',
      '24/7 VIP Priority Support',
    ],
  },
};

const DEFAULT_SETTINGS: BotSettings = {
  upiId: 'shivashish0@fam',
  upiName: 'Shivashish Official',
  teraboxCookie: 'ndus=Y0V4...YOUR_TERABOX_NDUS_COOKIE',
  mustJoinChannels: ['@betabot_hub', '@betabot_support', '@sukoon_s'],
  supportChannelUrl: 'https://t.me/betabot_support',
  updateChannelUrl: 'https://t.me/betabot_hub',
  supportGroupUsername: 'betabot_support',
  botOwnerId: '652194821',
  groupJoinUrl: 'https://t.me/betabot_support',
  watermarkText: 'BETA BOT HUB',
  watermarkEnabled: true,
  maxFreeDownloads: 3,
  maxFreeUploads: 3,
  maxProDownloads: 17,
  maxProUploads: 15,
  qrExpiryMinutes: 10,
  mediaAutoDeleteMinutes: 5,
  botToken: '7192837461:AAF_example_token_BetaBotHub',
  apiId: '29837410',
  apiHash: 'd7a90b4e2f81639c01f89e273bc5e912',
  mongoUri: 'mongodb+srv://betabot_admin:Pass12345@cluster0.mongodb.net/betabothub?retryWrites=true&w=majority',
  adminIds: '123456789,987654321',
  // 3 Dedicated Telegram Logger Groups (Group/Supergroup IDs)
  logGroupId: '-1001928374651',        // 1. Activity Log Group (Starts, referrals, stats)
  paymentLogGroupId: '-1002019283741', // 2. Payment Log Group (UPI QR, UTR submissions, approvals)
  dataLogGroupId: '-1002198374102',    // 3. Data Log Group (Download & Upload media data)
  // Backward compatibility
  logChannelId: '-1001928374651',
  paymentLogChannelId: '-1002019283741',
  errorLogChannelId: '-1002198374102',
  dataLogChannelId: '-1002198374102',
};

const STORAGE_USER_KEY = 'betabothub_user_profile';
const STORAGE_PAYMENTS_KEY = 'betabothub_payments_list';
const STORAGE_SETTINGS_KEY = 'betabothub_settings';
const STORAGE_GRANTS_KEY = 'betabothub_premium_grants';
const STORAGE_LOGS_KEY = 'betabothub_activity_logs';

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadSettings(): BotSettings {
  const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Auto-migrate default UPI ID to user-requested UPI ID
      if (parsed.upiId === 'betabothub@okaxis' || parsed.upiId === 'betabothub@upi' || !parsed.upiId) {
        parsed.upiId = 'shivashish0@fam';
        parsed.upiName = 'Shivashish Official';
      }
      if (!parsed.logGroupId && !parsed.logChannelId) parsed.logGroupId = '-1001928374651';
      if (!parsed.paymentLogGroupId && !parsed.paymentLogChannelId) parsed.paymentLogGroupId = '-1002019283741';
      if (!parsed.dataLogGroupId && !parsed.dataLogChannelId) parsed.dataLogGroupId = '-1002198374102';
      parsed.logGroupId = parsed.logGroupId || parsed.logChannelId || '-1001928374651';
      parsed.paymentLogGroupId = parsed.paymentLogGroupId || parsed.paymentLogChannelId || '-1002019283741';
      parsed.dataLogGroupId = parsed.dataLogGroupId || parsed.dataLogChannelId || parsed.errorLogChannelId || '-1002198374102';
      parsed.dataLogChannelId = parsed.dataLogGroupId;
      parsed.logChannelId = parsed.logGroupId;
      parsed.paymentLogChannelId = parsed.paymentLogGroupId;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      // ignore
    }
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: BotSettings): void {
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadUserProfile(): UserProfile {
  const today = getTodayDateString();
  const saved = localStorage.getItem(STORAGE_USER_KEY);
  let profile: UserProfile;

  if (saved) {
    try {
      profile = JSON.parse(saved);
      // Daily quota reset check
      if (profile.lastActiveDate !== today) {
        profile.downloadsToday = 0;
        profile.uploadsToday = 0;
        profile.lastActiveDate = today;
      }
      // Check plan expiration
      if (profile.planExpiresAt && Date.now() > profile.planExpiresAt) {
        profile.currentPlan = 'free';
        profile.planDuration = null;
        profile.planExpiresAt = null;
      }
      if (!profile.mustJoinStatus) {
        profile.mustJoinStatus = {
          '@betabot_hub': true,
          '@betabot_support': true,
          '@sukoon_s': true,
        };
      }
      return profile;
    } catch {
      // fallback
    }
  }

  // Create initial user
  const randomId = Math.floor(100000 + Math.random() * 900000).toString();
  profile = {
    id: randomId,
    username: 'TelegramUser_' + randomId.slice(-4),
    telegramHandle: '@user_' + randomId.slice(-4),
    email: `user${randomId}@telegram.org`,
    currentPlan: 'free',
    planDuration: null,
    planExpiresAt: null,
    downloadsToday: 0,
    uploadsToday: 0,
    totalDownloads: 0,
    totalUploads: 0,
    lastActiveDate: today,
    referralCode: 'ref_' + randomId,
    referredBy: null,
    isVerified: true,
    hasJoinedGroup: true,
    hasJoinedSupport: true,
    mustJoinStatus: {
      '@betabot_hub': true,
      '@betabot_support': true,
      '@sukoon_s': true,
    },
    rewardPassExpiresAt: null,
    betaReferralBonusGranted: false,
    notifications: [
      {
        id: 'notif_welcome',
        title: '⚡ Welcome to Beta Bot Hub!',
        message: 'Download any TeraBox links, upload media, or refer 3 friends to get a 1-day premium pass!',
        timestamp: Date.now(),
        read: false,
        type: 'info',
      },
    ],
  };

  saveUserProfile(profile);
  return profile;
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profile));
}

export function loadPayments(): PaymentRequest[] {
  const saved = localStorage.getItem(STORAGE_PAYMENTS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }

  // Demo initial payment records for admin preview
  const demoPayments: PaymentRequest[] = [
    {
      id: 'pay_demo_101',
      userId: '748291',
      userName: 'Aakash Sharma',
      telegramHandle: '@aakash_tele',
      planId: 'pro_7d',
      planName: 'Pro Plan (7 Days)',
      durationDays: 7,
      amount: 15,
      upiIdUsed: 'shivashish0@fam',
      utrNumber: '428910284719',
      timestamp: Date.now() - 3600000 * 3,
      status: 'pending',
    },
    {
      id: 'pay_demo_102',
      userId: '891023',
      userName: 'Rohit Verma',
      telegramHandle: '@rohit_streamer',
      planId: 'beta_30d',
      planName: 'Beta VIP (30 Days)',
      durationDays: 30,
      amount: 69,
      upiIdUsed: 'shivashish0@fam',
      utrNumber: '428909871625',
      timestamp: Date.now() - 3600000 * 8,
      status: 'approved',
      adminRemarks: 'Verified in bank account. Instant Beta VIP activated.',
    },
  ];

  localStorage.setItem(STORAGE_PAYMENTS_KEY, JSON.stringify(demoPayments));
  return demoPayments;
}

export function savePayments(payments: PaymentRequest[]): void {
  localStorage.setItem(STORAGE_PAYMENTS_KEY, JSON.stringify(payments));
}

export function loadPremiumGrants(): import('../types').PremiumGrantRecord[] {
  const saved = localStorage.getItem(STORAGE_GRANTS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return [
    {
      id: 'grant_init_1',
      userId: '748291',
      username: 'Aakash Sharma',
      plan: 'pro',
      durationLabel: '7 Days',
      durationDays: 7,
      grantedBy: 'Admin (Master)',
      grantedAt: Date.now() - 86400000 * 2,
      expiresAt: Date.now() + 86400000 * 5,
      note: 'Granted for community help',
    },
  ];
}

export function savePremiumGrants(grants: import('../types').PremiumGrantRecord[]): void {
  localStorage.setItem(STORAGE_GRANTS_KEY, JSON.stringify(grants));
}

export function loadActivityLogs(): ActivityLog[] {
  const saved = localStorage.getItem(STORAGE_LOGS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }

  // Pre-seed with realistic logs covering all required types
  const now = Date.now();
  const demoLogs: ActivityLog[] = [
    {
      id: 'log_dl_101',
      type: 'download',
      timestamp: now - 1000 * 60 * 4, // 4 mins ago
      userId: '748291',
      username: 'aakash_tele',
      userDisplayName: 'Aakash Sharma',
      telegramHandle: '@aakash_tele',
      fileTitle: 'Inception_2010_1080p_BluRay_x264.mp4',
      fileSize: '412.5 MB',
      fileSizeBytes: 432537600,
      sourcePlatform: 'terabox',
      sourceUrl: 'https://teraboxapp.com/s/1tb_4k98124',
      downloadUrl: 'https://d.terabox.app/download/stream?id=4k98124',
      mediaType: 'video',
      autoDeleteAt: now + 1000 * 60 * 1, // 1 min remaining
      status: 'success',
      details: 'Direct video stream delivered in chat with 5-minute auto-delete notice',
    },
    {
      id: 'log_plan_109',
      type: 'plan_purchase',
      timestamp: now - 1000 * 60 * 12, // 12 mins ago
      userId: '652881',
      username: 'vikram_singh',
      userDisplayName: 'Vikram Singh',
      telegramHandle: '@vikram_singh',
      planId: 'pro_30d',
      planName: 'Pro Plan (30 Days)',
      planDuration: '30 Days',
      amountPaid: 27,
      paymentMethod: 'UPI_QR',
      paymentStatus: 'pending',
      utrNumber: '992817462531',
      status: 'pending',
      details: '₹27 dynamic QR payment submitted by user via UPI. Awaiting admin approval in Payment Logger.',
    },
    {
      id: 'log_plan_102',
      type: 'plan_purchase',
      timestamp: now - 1000 * 60 * 28, // 28 mins ago
      userId: '891023',
      username: 'rohit_streamer',
      userDisplayName: 'Rohit Verma',
      telegramHandle: '@rohit_streamer',
      planId: 'beta_30d',
      planName: 'Beta VIP (30 Days Unlimited)',
      planDuration: '30 Days',
      amountPaid: 69,
      paymentMethod: 'UPI_QR',
      paymentStatus: 'approved',
      utrNumber: '428909871625',
      grantedBy: 'Admin Approval (UTR Verified)',
      planExpiresAt: now + 86400000 * 30,
      status: 'success',
      details: '₹69 dynamic QR paid. Instant VIP activated with unlimited DL/UL limits. • [Status: Approved by Admin in Payment Logger]',
    },
    {
      id: 'log_up_103',
      type: 'upload',
      timestamp: now - 1000 * 60 * 52, // 52 mins ago
      userId: '891023',
      username: 'rohit_streamer',
      userDisplayName: 'Rohit Verma',
      telegramHandle: '@rohit_streamer',
      uploadedFileName: 'Final_Premiere_Edit_Master.mp4',
      uploadedFileSize: '184.2 MB',
      generatedLink: 'https://teraboxapp.com/s/1tb_rohit981',
      mediaType: 'video',
      status: 'success',
      details: 'Uploaded file to TeraBox storage; public share link generated for group.',
    },
    {
      id: 'log_start_104',
      type: 'bot_start',
      timestamp: now - 1000 * 60 * 95, // 1.5 hours ago
      userId: '429184',
      username: 'priya_singh',
      userDisplayName: 'Priya S.',
      telegramHandle: '@priya_singh',
      referralCodeUsed: 'ref_748291',
      sourceClient: 'Telegram for Android (v10.14)',
      status: 'success',
      details: 'New user joined via referral code ref_748291 (Aakash Sharma).',
    },
    {
      id: 'log_plan_105',
      type: 'plan_grant',
      timestamp: now - 1000 * 60 * 120, // 2 hours ago
      userId: '429184',
      username: 'priya_singh',
      userDisplayName: 'Priya S.',
      telegramHandle: '@priya_singh',
      planId: 'pro_1d_pass',
      planName: 'Pro Plan (1 Day Reward Pass)',
      planDuration: '24 Hours',
      amountPaid: 0,
      paymentMethod: 'REFERRAL_REWARD',
      grantedBy: 'Automated Referral System (3 Verified Joins)',
      planExpiresAt: now + 86400000 * 1,
      status: 'success',
      details: 'Awarded 24-hour Pro Pass after 3 referred friends completed group & channel verification.',
    },
    {
      id: 'log_dl_106',
      type: 'download',
      timestamp: now - 1000 * 60 * 180, // 3 hours ago
      userId: '429184',
      username: 'priya_singh',
      userDisplayName: 'Priya S.',
      telegramHandle: '@priya_singh',
      fileTitle: 'Python_Data_Structures_Handwritten_Notes.pdf',
      fileSize: '34.8 MB',
      fileSizeBytes: 36490444,
      sourcePlatform: 'terabox',
      sourceUrl: 'https://teraboxapp.com/s/1py_notes_99',
      downloadUrl: 'https://cdn.terabox.com/files/py_notes_99.pdf',
      mediaType: 'document',
      autoDeleteAt: now - 1000 * 60 * 175,
      status: 'success',
      details: 'TeraBox resolved and document dispatched directly to Telegram chat.',
    },
    {
      id: 'log_start_107',
      type: 'bot_start',
      timestamp: now - 1000 * 60 * 240, // 4 hours ago
      userId: '748291',
      username: 'aakash_tele',
      userDisplayName: 'Aakash Sharma',
      telegramHandle: '@aakash_tele',
      sourceClient: 'Telegram Desktop (Windows)',
      status: 'success',
      details: 'Direct /start without referral parameter.',
    },
    {
      id: 'log_up_108',
      type: 'upload',
      timestamp: now - 1000 * 60 * 310, // 5 hours ago
      userId: '748291',
      username: 'aakash_tele',
      userDisplayName: 'Aakash Sharma',
      telegramHandle: '@aakash_tele',
      uploadedFileName: 'Acoustic_Guitar_Track_Master.mp3',
      uploadedFileSize: '12.6 MB',
      generatedLink: 'https://teraboxapp.com/s/1tb_guitar_acoustic',
      mediaType: 'audio',
      status: 'success',
      details: 'Audio track uploaded to TeraBox cloud storage.',
    },
  ];

  localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(demoLogs));
  return demoLogs;
}

export function saveActivityLogs(logs: ActivityLog[]): void {
  localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));
}

export function addActivityLog(
  log: Omit<ActivityLog, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): ActivityLog {
  const current = loadActivityLogs();
  const newLog: ActivityLog = {
    ...log,
    id: log.id || 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    timestamp: log.timestamp || Date.now(),
  };

  const updated = [newLog, ...current];
  saveActivityLogs(updated);
  return newLog;
}

export function resetDemoActivityLogs(): ActivityLog[] {
  localStorage.removeItem(STORAGE_LOGS_KEY);
  return loadActivityLogs();
}
