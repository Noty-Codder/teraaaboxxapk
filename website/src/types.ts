export type PlanType = 'free' | 'pro' | 'beta';

export interface PlanConfig {
  id: PlanType;
  name: string;
  badge: string;
  color: string;
  downloadsPerDay: number | 'unlimited';
  uploadsPerDay: number | 'unlimited';
  pricing: {
    sevenDays?: number;
    thirtyDays?: number;
  };
  features: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  telegramHandle: string;
  email: string;
  currentPlan: PlanType;
  planDuration: '7d' | '30d' | 'daily_pass' | null;
  planExpiresAt: number | null; // timestamp
  downloadsToday: number;
  uploadsToday: number;
  totalDownloads: number;
  totalUploads: number;
  lastActiveDate: string; // YYYY-MM-DD
  referralCode: string;
  referredBy: string | null;
  isVerified: boolean; // joined group + support channel
  hasJoinedGroup: boolean;
  hasJoinedSupport: boolean;
  rewardPassExpiresAt: number | null;
  betaReferralBonusGranted: boolean;
  mustJoinStatus?: {
    '@betabot_hub': boolean;
    '@betabot_support': boolean;
    '@sukoon_s': boolean;
  };
  notifications: AppNotification[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'success' | 'info' | 'warning' | 'promo';
}

export interface ReferralRecord {
  id: string;
  username: string;
  joinedAt: number;
  verified: boolean;
  boughtBeta: boolean;
  rewardGranted: boolean;
}

export interface MediaItem {
  id: string;
  source: 'terabox' | 'upload';
  originalUrl?: string;
  title: string;
  type: 'video' | 'audio' | 'photo' | 'document';
  size: string;
  sizeBytes: number;
  resolution?: string;
  duration?: string;
  downloadUrl: string;
  streamUrl: string;
  thumbnailUrl: string;
  watermarkedThumbUrl?: string;
  createdAt: number;
  offlineSaved?: boolean;
  offlineBlobKey?: string;
  fileMime?: string;
  autoDeleteAt?: number;
  isDeleted?: boolean;
  extractionEngine?: 'terabox_cookie' | 'direct';
  apiFallbackTriggered?: boolean;
}

export interface PremiumGrantRecord {
  id: string;
  userId: string;
  username: string;
  plan: PlanType;
  durationLabel: string;
  durationDays: number;
  grantedBy: string;
  grantedAt: number;
  expiresAt: number | null;
  note?: string;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  telegramHandle: string;
  planId: 'pro_7d' | 'pro_30d' | 'beta_30d';
  planName: string;
  durationDays: number;
  amount: number;
  upiIdUsed: string;
  utrNumber: string;
  proofImageUrl?: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
  adminRemarks?: string;
}

export interface BotChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  media?: MediaItem;
  timestamp: string;
  autoDeleteAt?: number;
  isDeleted?: boolean;
  inlineButtons?: Array<{
    label: string;
    action: string;
    url?: string;
    style?: 'primary' | 'secondary' | 'accent';
  }>;
}

export interface BotSettings {
  upiId: string;
  upiName: string;
  teraboxCookie: string;
  mustJoinChannels: string[];
  supportChannelUrl: string;
  updateChannelUrl: string;
  supportGroupUsername: string;
  botOwnerId: string;
  groupJoinUrl: string;
  watermarkText: string;
  watermarkEnabled: boolean;
  maxFreeDownloads: number;
  maxFreeUploads: number;
  maxProDownloads: number;
  maxProUploads: number;
  qrExpiryMinutes: number;
  mediaAutoDeleteMinutes: number;
  botToken: string;
  apiId: string;
  apiHash: string;
  mongoUri: string;
  adminIds: string;
  // 3 Dedicated Telegram Logger Groups (Group/Supergroup IDs)
  logGroupId?: string;           // Activity Log Group
  paymentLogGroupId?: string;    // Payment Log Group
  dataLogGroupId?: string;       // Data Log Group (Download & Upload data)
  // Backward compatibility aliases
  logChannelId?: string;
  paymentLogChannelId?: string;
  errorLogChannelId?: string;
  dataLogChannelId?: string;
}

export type ActivityLogType = 'bot_start' | 'plan_purchase' | 'plan_grant' | 'download' | 'upload';

export interface ActivityLog {
  id: string;
  type: ActivityLogType;
  timestamp: number;
  // User identification
  userId: string;
  username: string;
  userDisplayName?: string;
  telegramHandle?: string;
  // For bot_start
  referralCodeUsed?: string;
  sourceClient?: string;
  // For plan_purchase or plan_grant
  paymentId?: string;
  paymentStatus?: 'pending' | 'approved' | 'rejected';
  planId?: string;
  planName?: string;
  planDuration?: string;
  amountPaid?: number;
  paymentMethod?: 'UPI_QR' | 'ADMIN_GRANT' | 'REFERRAL_REWARD';
  utrNumber?: string;
  grantedBy?: string;
  planExpiresAt?: number | null;
  // For downloader logger (kis user ne kya download kiya)
  fileTitle?: string;
  fileSize?: string;
  fileSizeBytes?: number;
  sourcePlatform?: 'terabox' | 'direct';
  extractionEngine?: string;
  apiFallbackTriggered?: boolean;
  sourceUrl?: string;
  downloadUrl?: string;
  mediaType?: 'video' | 'audio' | 'photo' | 'document';
  autoDeleteAt?: number;
  // For uploader logger (kis user ne kya upload kiya)
  uploadedFileName?: string;
  uploadedFileSize?: string;
  generatedLink?: string;
  // Execution metadata
  status: 'success' | 'failed' | 'processing' | 'pending';
  details?: string;
}
