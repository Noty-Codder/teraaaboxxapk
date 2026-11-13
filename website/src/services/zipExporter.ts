import JSZip from 'jszip';
import { BOT_FILES } from './botCodeTemplates';

export async function generateBotZip(customEnv?: Record<string, string | undefined>): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('BetaBotHub_Telegram_Bot') || zip;

  // Add all bot source files
  for (const [filename, content] of Object.entries(BOT_FILES)) {
    folder.file(filename, content);
  }

  // Create custom .env.example with user's settings if provided
  const envContent = `# Beta Bot Hub Environment Configuration
API_ID=${customEnv?.API_ID || '12345678'}
API_HASH=${customEnv?.API_HASH || 'your_api_hash_here'}
BOT_TOKEN=${customEnv?.BOT_TOKEN || 'your_bot_token_from_botfather'}
ADMIN_IDS=${customEnv?.ADMIN_IDS || '123456789'}
CHANNEL_USERNAME=${customEnv?.CHANNEL_USERNAME || '@betabot_hub'}
GROUP_USERNAME=${customEnv?.GROUP_USERNAME || '@betabot_support'}
UPDATE_CHANNEL=${customEnv?.UPDATE_CHANNEL || '@betabot_hub'}
SUPPORT_CHANNEL=${customEnv?.SUPPORT_CHANNEL || '@betabot_support'}
COMMUNITY_CHANNEL=${customEnv?.COMMUNITY_CHANNEL || '@sukoon_s'}
# Auto Payment Gateway (API key from https://betapaymentgateway.up.railway.app/dashboard)
PAYMENT_API_URL=${customEnv?.PAYMENT_API_URL || 'https://betapaymentgateway.up.railway.app'}
PAYMENT_API_KEY=${customEnv?.PAYMENT_API_KEY || ''}
PAYMENT_POLL_SECONDS=8
QR_EXPIRY_MINUTES=10
TERABOX_COOKIE=${customEnv?.TERABOX_COOKIE || 'ndus=YOUR_COOKIE_HERE;'}
WATERMARK_TEXT=${customEnv?.WATERMARK_TEXT || 'BETA BOT HUB'}
MONGODB_URI=${customEnv?.MONGODB_URI || ''}
# 3 Dedicated Telegram Logger Groups (Group / Supergroup IDs)
LOG_GROUP_ID=${customEnv?.LOG_GROUP_ID || customEnv?.LOG_CHANNEL_ID || '-1001928374651'}
PAYMENT_LOG_GROUP_ID=${customEnv?.PAYMENT_LOG_GROUP_ID || customEnv?.PAYMENT_LOG_CHANNEL || '-1002019283741'}
DATA_LOG_GROUP_ID=${customEnv?.DATA_LOG_GROUP_ID || customEnv?.DATA_LOG_CHANNEL || customEnv?.ERROR_LOG_CHANNEL || '-1002198374102'}
LOG_CHANNEL_ID=${customEnv?.LOG_GROUP_ID || customEnv?.LOG_CHANNEL_ID || '-1001928374651'}
PAYMENT_LOG_CHANNEL=${customEnv?.PAYMENT_LOG_GROUP_ID || customEnv?.PAYMENT_LOG_CHANNEL || '-1002019283741'}
DATA_LOG_CHANNEL=${customEnv?.DATA_LOG_GROUP_ID || customEnv?.DATA_LOG_CHANNEL || '-1002198374102'}
`;

  folder.file('.env.example', envContent);
  folder.file('.env', envContent);

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
