import React, { useState } from 'react';
import { 
  BookOpen, 
  Key, 
  Database, 
  ShieldCheck, 
  QrCode, 
  Clock, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Download,
  AlertTriangle,
  Server,
  Layers,
  Crown
} from 'lucide-react';
import { BotSettings } from '../types';

interface SetupGuideSectionProps {
  settings: BotSettings;
  onUpdateSettings: (settings: BotSettings) => void;
}

export const SetupGuideSection: React.FC<SetupGuideSectionProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live .env editor state
  const [envBotToken, setEnvBotToken] = useState(settings.botToken || '7192837461:AAF_example_token_BetaBotHub');
  const [envApiId, setEnvApiId] = useState(settings.apiId || '29837410');
  const [envApiHash, setEnvApiHash] = useState(settings.apiHash || 'd7a90b4e2f81639c01f89e273bc5e912');
  const [envMongoUri, setEnvMongoUri] = useState(settings.mongoUri || 'mongodb+srv://betabot_admin:Pass12345@cluster0.mongodb.net/betabothub?retryWrites=true&w=majority');
  const [envAdminIds, setEnvAdminIds] = useState(settings.adminIds || '123456789,987654321');
  const [envUpiId, setEnvUpiId] = useState(settings.upiId || 'shivashish0@fam');
  const [envUpiName, setEnvUpiName] = useState(settings.upiName || 'Shivashish Official');
  const [envCookie, setEnvCookie] = useState(settings.teraboxCookie || 'ndus=YOUR_COOKIE_HERE;');
  const [envLogGroupId, setEnvLogGroupId] = useState(settings.logGroupId || settings.logChannelId || '-1001928374651');
  const [envPaymentLogGroupId, setEnvPaymentLogGroupId] = useState(settings.paymentLogGroupId || settings.paymentLogChannelId || '-1002019283741');
  const [envDataLogGroupId, setEnvDataLogGroupId] = useState(settings.dataLogGroupId || settings.dataLogChannelId || settings.errorLogChannelId || '-1002198374102');

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveToAppSettings = () => {
    onUpdateSettings({
      ...settings,
      botToken: envBotToken,
      apiId: envApiId,
      apiHash: envApiHash,
      mongoUri: envMongoUri,
      adminIds: envAdminIds,
      upiId: envUpiId,
      upiName: envUpiName,
      teraboxCookie: envCookie,
      logGroupId: envLogGroupId,
      paymentLogGroupId: envPaymentLogGroupId,
      dataLogGroupId: envDataLogGroupId,
      logChannelId: envLogGroupId,
      paymentLogChannelId: envPaymentLogGroupId,
      dataLogChannelId: envDataLogGroupId,
      errorLogChannelId: envDataLogGroupId,
    });
    handleCopy('Saved to app!', 'save_app_settings');
  };

  const generatedEnvContent = `# ==========================================
# BETA BOT HUB - COMPLETE PRODUCTION CONFIG
# ==========================================

# 1. Telegram Bot API Credentials (from https://my.telegram.org & @BotFather)
BOT_TOKEN=${envBotToken}
API_ID=${envApiId}
API_HASH=${envApiHash}

# 2. Database Connection (MongoDB Atlas Cloud URL or leave empty for SQLite)
MONGODB_URI=${envMongoUri}
DB_NAME=betabothub

# 3. Master Owner & Admin Telegram IDs (comma-separated, get from @userinfobot)
ADMIN_IDS=${envAdminIds}

# 4. UPI Payment & Dynamic 10-Minute QR Configuration
UPI_ID=${envUpiId}
UPI_NAME=${envUpiName}
QR_EXPIRY_MINUTES=10

# 5. Media 5-Minute Auto-Deletion System
MEDIA_AUTO_DELETE_MINUTES=5
DELETE_WARNING_ENABLED=true

# 6. Referral & Force-Join Verification Channels
CHANNEL_USERNAME=@betabot_hub
GROUP_USERNAME=@betabot_support
UPDATE_CHANNEL=@betabot_hub
SUPPORT_CHANNEL=@betabot_support
COMMUNITY_CHANNEL=@sukoon_s

# 7. TeraBox Cookies & Watermarking Branding
TERABOX_COOKIE=${envCookie}
WATERMARK_TEXT=BETA BOT HUB
WATERMARK_ENABLED=true

# 8. Three Dedicated Telegram Logger Groups (Group / Supergroup IDs)
# All 3 are Telegram Groups (not channels) where your bot is added as Admin:
LOG_GROUP_ID=${envLogGroupId}
PAYMENT_LOG_GROUP_ID=${envPaymentLogGroupId}
DATA_LOG_GROUP_ID=${envDataLogGroupId}

# Backward Compatibility Aliases:
LOG_CHANNEL_ID=${envLogGroupId}
PAYMENT_LOG_CHANNEL=${envPaymentLogGroupId}
DATA_LOG_CHANNEL=${envDataLogGroupId}
`;

  const handleDownloadEnv = () => {
    const blob = new Blob([generatedEnvContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1c33] via-[#102444] to-[#0d1c33] rounded-3xl border border-cyan-500/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Step-by-Step Setup & Deployment Guide</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bot Token, MongoDB & Deployment Blueprint
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Complete instructions for setting up your <strong>Telegram Bot Token</strong>, <strong>API Hash</strong>, 
              <strong>MongoDB Atlas database</strong>, <strong>Dynamic 10-minute UPI QR</strong>, and 
              <strong>5-minute auto-delete media scheduler</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              id="guide-download-env-btn"
              onClick={handleDownloadEnv}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Ready .env</span>
            </button>
            <button
              id="guide-copy-env-btn"
              onClick={() => handleCopy(generatedEnvContent, 'all_env')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs transition-all active:scale-95"
            >
              {copiedKey === 'all_env' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === 'all_env' ? 'Copied .env!' : 'Copy .env File'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveStep(1)}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeStep === 1
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span>1. Bot Token</span>
        </button>

        <button
          onClick={() => setActiveStep(2)}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeStep === 2
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>2. MongoDB Atlas</span>
        </button>

        <button
          onClick={() => setActiveStep(3)}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeStep === 3
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-3.5 h-3.5 text-amber-400" />
          <span>3. UPI 10m QR</span>
        </button>

        <button
          onClick={() => setActiveStep(4)}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeStep === 4
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <span>4. 5m Auto-Delete</span>
        </button>

        <button
          onClick={() => setActiveStep(5)}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeStep === 5
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-[#0f172a] text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-purple-400" />
          <span>5. Deploy & Run</span>
        </button>
      </div>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Detailed Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Bot Token & API Credentials */}
          {activeStep === 1 && (
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">How to Get Telegram Bot Token & API Credentials</h3>
                  <p className="text-xs text-slate-400">Takes only 2 minutes directly on Telegram and the official portal.</p>
                </div>
              </div>

              {/* Substep A: BotFather */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <span>Part A: Create Bot via @BotFather</span>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                  >
                    Open @BotFather <ExternalLink className="w-3 h-3" />
                  </a>
                </h4>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                    <p><strong>1.</strong> Open Telegram and search for <code>@BotFather</code> (ensure it has the verified blue tick).</p>
                    <p><strong>2.</strong> Send <code>/newbot</code></p>
                    <p><strong>3.</strong> Enter a display name for your bot: e.g. <code>Beta Bot Hub</code></p>
                    <p><strong>4.</strong> Choose a unique username ending in <code>bot</code>: e.g. <code>MyBetaBotHub_bot</code></p>
                    <p><strong>5.</strong> @BotFather will send your <strong>API Token</strong>:</p>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-cyan-500/40 font-mono text-cyan-300 text-[11px] flex items-center justify-between">
                      <span>7192837461:AAF_ExampleBotTokenSecretValue</span>
                      <button
                        onClick={() => handleCopy('7192837461:AAF_ExampleBotTokenSecretValue', 'sample_tok')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'sample_tok' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Substep B: Telegram API_ID and API_HASH */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <span>Part B: Get API_ID & API_HASH from my.telegram.org</span>
                  <a
                    href="https://my.telegram.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                  >
                    Open my.telegram.org <ExternalLink className="w-3 h-3" />
                  </a>
                </h4>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <p><strong>1.</strong> Log in to <code>https://my.telegram.org</code> with your Telegram mobile number & OTP.</p>
                  <p><strong>2.</strong> Click on <strong>"API development tools"</strong>.</p>
                  <p><strong>3.</strong> Fill in App title (e.g. <code>BetaBotHub</code>) and Short name (e.g. <code>betabot</code>).</p>
                  <p><strong>4.</strong> Click "Create application" and copy your numeric <code>api_id</code> and 32-character <code>api_hash</code>.</p>
                </div>
              </div>

              {/* Substep C: Admin Telegram ID */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <span>Part C: Find Your Owner / Admin Numeric ID</span>
                </h4>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <p>Search <code>@userinfobot</code> in Telegram, send <code>/start</code>, and copy the numeric ID (e.g. <code>123456789</code>). This is your <code>ADMIN_IDS</code>.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MongoDB Atlas Setup */}
          {activeStep === 2 && (
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">How to Set Up Free MongoDB Atlas Cloud Database</h3>
                  <p className="text-xs text-slate-400">Stores user plans, daily download quotas, referrals, and payment approvals 24/7 forever for free.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-emerald-400 text-sm">Step 1: Create Free Account & Cluster</strong>
                    <a
                      href="https://www.mongodb.com/cloud/atlas/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span>Register MongoDB Atlas</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p>Sign up and select the <strong>M0 FREE Shared Cluster</strong> (512 MB Free Forever, no credit card required).</p>

                  <div className="h-px bg-slate-800 my-2" />

                  <strong className="text-emerald-400 block text-sm">Step 2: Create Database User</strong>
                  <p>
                    Go to <strong>Database Access</strong> in the left sidebar. Click <strong>Add New Database User</strong>.
                    Set username to <code>betabot_admin</code> and enter a strong password (remember this password!).
                  </p>

                  <div className="h-px bg-slate-800 my-2" />

                  <strong className="text-emerald-400 block text-sm">Step 3: Whitelist All IP Addresses (0.0.0.0/0)</strong>
                  <p>
                    Go to <strong>Network Access</strong> in the left sidebar. Click <strong>Add IP Address</strong>.
                    Select <strong>"Allow Access from Anywhere" (0.0.0.0/0)</strong> so your Telegram bot can connect from any VPS, Docker, or Cloud container!
                  </p>

                  <div className="h-px bg-slate-800 my-2" />

                  <strong className="text-emerald-400 block text-sm">Step 4: Get Connection String URI</strong>
                  <p>
                    Go to <strong>Clusters / Deployment</strong> → Click <strong>Connect</strong> → Choose <strong>"Drivers" (Python)</strong>.
                    Copy the connection string format:
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-500/30 font-mono text-emerald-300 text-[11px] break-all flex items-center justify-between">
                    <span>mongodb+srv://betabot_admin:&lt;password&gt;@cluster0.abcde.mongodb.net/betabothub?retryWrites=true&w=majority</span>
                    <button
                      onClick={() => handleCopy('mongodb+srv://betabot_admin:<password>@cluster0.abcde.mongodb.net/betabothub?retryWrites=true&w=majority', 'mongo_sample')}
                      className="text-slate-400 hover:text-white shrink-0 ml-2"
                    >
                      {copiedKey === 'mongo_sample' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Replace <code>&lt;password&gt;</code> with your database user password!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: UPI 10-Minute Dynamic QR System */}
          {activeStep === 3 && (
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dynamic 10-Minute UPI QR System</h3>
                  <p className="text-xs text-slate-400">Auto-generates verified UPI QR codes valid for strictly 10 minutes with your custom UPI ID.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <QrCode className="w-4 h-4" />
                    <span>How the 10-Minute Expiry Works</span>
                  </div>
                  <p>
                    When a user clicks on a plan in Telegram (e.g. <code>Pro ₹15</code>, <code>Pro ₹27</code>, or <code>Beta VIP ₹69</code>), 
                    the bot dynamically generates a UPI QR containing:
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-amber-500/30 font-mono text-amber-300 text-[11px]">
                    upi://pay?pa={envUpiId}&pn={encodeURIComponent(envUpiName)}&am=15&cu=INR&tn=BetaBotHub_User12345
                  </div>
                  <p>
                    The bot captures the generation timestamp. It sends the QR with a <strong>live 10-minute warning timer</strong>.
                    If the user tries to submit a payment UTR after 10 minutes, the bot warns them that the QR expired and provides a button to regenerate a fresh QR.
                  </p>
                </div>

                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-white block">Setting Your UPI ID:</span>
                  <p>
                    Simply set <code>UPI_ID=yourname@upi</code> in your <code>.env</code> file or enter it in the configuration editor on the right!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: 5-Minute Auto-Delete System */}
          {activeStep === 4 && (
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">5-Minute Media Auto-Deletion Engine & Warnings</h3>
                  <p className="text-xs text-slate-400">Protects storage and privacy by automatically purging downloaded videos, audios, and documents after 5 minutes.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <Clock className="w-4 h-4" />
                    <span>Automatic Purging Workflow</span>
                  </div>
                  <p>
                    1. When user sends a TeraBox link, the bot delivers the <strong>DIRECT VIDEO/AUDIO/PDF</strong> file.
                  </p>
                  <p>
                    2. The bot sends an explicit warning banner:
                    <br />
                    <code>⚠️ WARNING: This file will be auto-deleted in 5 minutes! Forward to your 'Saved Messages' now.</code>
                  </p>
                  <p>
                    3. Behind the scenes, Python spawns an asynchronous task:
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-rose-500/30 font-mono text-rose-300 text-[11px]">
                    asyncio.create_task(auto_delete_after_delay(client, chat_id, message.id, delay=300))
                  </div>
                  <p>
                    4. Exactly after 300 seconds (5 minutes), the media message is deleted from Telegram chat, and a cleanup notice is posted.
                  </p>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>User Warning Rule:</strong> Always remind users in chat to forward the video to their personal "Saved Messages" or save it directly to their device gallery before the 5-minute timer expires!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Deployment & Commands */}
          {activeStep === 5 && (
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Deploying & Running the Bot (Railway, Heroku, VPS, Docker)</h3>
                  <p className="text-xs text-slate-400">Step-by-step instructions to host your 24/7 Telegram bot on Railway or Heroku.</p>
                </div>
              </div>

              <div className="space-y-5 text-xs text-slate-300">
                {/* RAILWAY DEPLOYMENT GUIDE */}
                <div className="p-4 bg-slate-900/90 rounded-xl border border-purple-500/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[11px] font-bold border border-purple-500/30">
                        RECOMMENDED
                      </span>
                      <strong className="text-purple-300 text-sm font-bold flex items-center gap-1.5">
                        <span>🚂 Option 1: Railway.app Hosting (Sabse Easy & Reliable)</span>
                      </strong>
                    </div>
                    <a
                      href="https://railway.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold underline"
                    >
                      Open Railway.app <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-slate-300 leading-relaxed text-xs">
                    Railway par Telegram bot 24/7 background worker ke roop mein chalta hai. Nixpacks automatically <code>requirements.txt</code> aur <code>railway.json</code> ko detect karke bot start kar deta hai.
                  </p>

                  <div className="space-y-2 bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px]">
                    <p className="font-semibold text-white">📋 Steps to Deploy on Railway:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                      <li>
                        <b>Download BOT ZIP:</b> Upar diye gaye <span className="text-cyan-300 font-semibold">"Download Ready .env"</span> ya <span className="text-emerald-300 font-semibold">"Export Bot ZIP"</span> button se saari bot files download karein.
                      </li>
                      <li>
                        <b>GitHub Repository Banayein:</b> GitHub par nayi private repository banayein aur unzipped files ko push ya upload karein (including <code>bot.py</code>, <code>Procfile</code>, <code>railway.json</code>, <code>requirements.txt</code>).
                      </li>
                      <li>
                        <b>Railway Project Create Karein:</b> Railway.app par sign in karein ➔ <b>"New Project"</b> par click karein ➔ <b>"Deploy from GitHub repo"</b> select karein.
                      </li>
                      <li>
                        <b>Environment Variables Add Karein:</b> Project ke <b>"Variables"</b> tab mein jaakar yeh values add karein:
                        <div className="mt-1.5 p-2 bg-slate-900 rounded font-mono text-[10px] text-cyan-300 border border-slate-800 space-y-0.5">
                          <p>BOT_TOKEN = {envBotToken}</p>
                          <p>API_ID = {envApiId}</p>
                          <p>API_HASH = {envApiHash}</p>
                          <p>ADMIN_IDS = {envAdminIds}</p>
                          <p>MONGODB_URI = {envMongoUri}</p>
                          <p className="text-amber-300 font-bold">UPI_ID = {envUpiId}</p>
                          <p>UPI_NAME = {envUpiName}</p>
                          <p>TERABOX_COOKIE = {envCookie}</p>
                          <p className="text-emerald-400 font-bold">LOG_GROUP_ID = {envLogGroupId} (Activity Group)</p>
                          <p className="text-amber-400 font-bold">PAYMENT_LOG_GROUP_ID = {envPaymentLogGroupId} (Payment Group)</p>
                          <p className="text-cyan-400 font-bold">DATA_LOG_GROUP_ID = {envDataLogGroupId} (Data Log: DL & UL Group)</p>
                        </div>
                      </li>
                      <li>
                        <b>Auto Deploy:</b> Railway automatically <code>python3 bot.py</code> command run karega. <b>"Deploy Logs"</b> check karein: <span className="text-emerald-400 font-mono">"BetaBotHub Started successfully"</span> print hote hi bot Telegram par live ho jayega!
                      </li>
                    </ol>
                  </div>
                </div>

                {/* HEROKU DEPLOYMENT GUIDE */}
                <div className="p-4 bg-slate-900/90 rounded-xl border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <strong className="text-indigo-300 text-sm font-bold flex items-center gap-1.5">
                      <span>🟣 Option 2: Heroku Hosting (Worker Dyno)</span>
                    </strong>
                    <a
                      href="https://dashboard.heroku.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
                    >
                      Open Heroku Dashboard <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-slate-300 leading-relaxed text-xs">
                    Heroku par Telegram Bot ko <b>Worker Dyno</b> par chalana hota hai (Web Dyno band rakhna hota hai, kyunki bot HTTP server nahi hai, long-polling client hai).
                  </p>

                  <div className="space-y-2 bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px]">
                    <p className="font-semibold text-white">📋 Steps to Deploy on Heroku:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                      <li>
                        <b>Procfile Check:</b> Bot files mein already <code>Procfile</code> shamil hai:
                        <div className="mt-1 p-1.5 bg-slate-900 rounded font-mono text-cyan-300 border border-slate-800 text-[11px]">
                          worker: python3 bot.py
                        </div>
                      </li>
                      <li>
                        <b>Create Heroku App:</b> Heroku dashboard par <b>"New" ➔ "Create new app"</b> karein.
                      </li>
                      <li>
                        <b>Config Vars (Environment Variables):</b> App ki <b>Settings ➔ Config Vars ➔ Reveal Config Vars</b> mein jaakar yeh zaroori variables dalein:
                        <div className="mt-1 p-1.5 bg-slate-900 rounded font-mono text-cyan-300 border border-slate-800 text-[10px] space-y-0.5">
                          <p><code>BOT_TOKEN</code>, <code>API_ID</code>, <code>API_HASH</code>, <code>ADMIN_IDS</code></p>
                          <p><code>UPI_ID = {envUpiId}</code></p>
                          <p><code>LOG_GROUP_ID = {envLogGroupId}</code> (Activity Group)</p>
                          <p><code>PAYMENT_LOG_GROUP_ID = {envPaymentLogGroupId}</code> (Payment Group)</p>
                          <p><code>DATA_LOG_GROUP_ID = {envDataLogGroupId}</code> (Data Log: DL/UL Group)</p>
                        </div>
                      </li>
                      <li>
                        <b>Connect GitHub & Deploy:</b> <b>Deploy</b> tab mein GitHub repo connect karein aur <b>Deploy Branch</b> par click karein.
                      </li>
                      <li>
                        <b>⚠️ CRITICAL STEP - Enable Worker Dyno:</b>
                        <p className="text-amber-300 mt-1">
                          App ke <b>Resources</b> tab par jayein. <b>web dyno ko OFF</b> karein aur <b>worker (python3 bot.py) ko ON (active)</b> karein!
                        </p>
                        <div className="mt-1 p-1.5 bg-slate-900 rounded font-mono text-slate-300 border border-slate-800 text-[10px]">
                          # Heroku CLI command:<br />
                          heroku ps:scale web=0 worker=1 -a your-app-name
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>

                {/* VPS Commands */}
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <strong className="text-cyan-400 block text-sm">Option 3: Ubuntu VPS / Debian (Self-Hosted)</strong>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-1">
                    <p className="text-slate-500"># 1. Clone or unzip bot files</p>
                    <p>unzip betabothub-bot.zip -d betabot && cd betabot</p>
                    <p className="text-slate-500"># 2. Configure .env file</p>
                    <p>nano .env</p>
                    <p className="text-slate-500"># 3. Run automated start script</p>
                    <p>bash run.sh</p>
                  </div>
                </div>

                {/* Docker Command */}
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <strong className="text-emerald-400 block text-sm">Option 4: Docker Container Deployment</strong>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300 space-y-1">
                    <p>docker build -t betabothub .</p>
                    <p>docker run -d --restart=always --name betabothub --env-file .env betabothub</p>
                  </div>
                </div>

                {/* Admin Commands in Bot */}
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <Crown className="w-4 h-4" />
                    <span>Owner & Admin Commands in Telegram Chat</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 space-y-1.5">
                    <p><code>/addpremium &lt;user_id&gt; 7d pro</code> - Grant 7 Days Pro</p>
                    <p><code>/addpremium &lt;user_id&gt; 1m beta</code> - Grant 1 Month Beta VIP</p>
                    <p><code>/addpremium &lt;user_id&gt; 1y beta</code> - Grant 1 Year Beta VIP</p>
                    <p><code>/removepremium &lt;user_id&gt;</code> - Revoke user back to Free</p>
                    <p><code>/checkuser &lt;user_id&gt;</code> - Inspect quota, expiry & plan</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live .env Configurator */}
        <div className="space-y-4">
          <div className="bg-[#0f172a] rounded-2xl border border-cyan-500/30 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Live .env Configurator</h4>
              </div>
              <button
                id="save-live-env-to-app-btn"
                onClick={handleSaveToAppSettings}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold hover:bg-cyan-500/30 transition-colors"
              >
                {copiedKey === 'save_app_settings' ? 'Saved to App!' : 'Apply to App'}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-400 font-medium text-[11px]">
                  BOT_TOKEN (@BotFather)
                </label>
                <input
                  type="text"
                  value={envBotToken}
                  onChange={(e) => setEnvBotToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium text-[11px]">
                    API_ID (my.telegram)
                  </label>
                  <input
                    type="text"
                    value={envApiId}
                    onChange={(e) => setEnvApiId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium text-[11px]">
                    API_HASH
                  </label>
                  <input
                    type="text"
                    value={envApiHash}
                    onChange={(e) => setEnvApiHash(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium text-[11px]">
                  MONGODB_URI (Atlas Cloud)
                </label>
                <input
                  type="text"
                  value={envMongoUri}
                  onChange={(e) => setEnvMongoUri(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium text-[11px]">
                  ADMIN_IDS (Owner IDs, comma-separated)
                </label>
                <input
                  type="text"
                  value={envAdminIds}
                  onChange={(e) => setEnvAdminIds(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium text-[11px]">
                    UPI_ID (Payment QR)
                  </label>
                  <input
                    type="text"
                    value={envUpiId}
                    onChange={(e) => setEnvUpiId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium text-[11px]">
                    UPI Merchant Name
                  </label>
                  <input
                    type="text"
                    value={envUpiName}
                    onChange={(e) => setEnvUpiName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium text-[11px]">
                  TERABOX_COOKIE (ndus=...)
                </label>
                <input
                  type="text"
                  value={envCookie}
                  onChange={(e) => setEnvCookie(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* 3 Dedicated Telegram Logger Groups */}
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    3 Telegram Logger Groups:
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono">Groups / Supergroups</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <label className="block text-emerald-400 text-[10px] font-mono">
                      LOG_GROUP_ID (Activity Group)
                    </label>
                    <input
                      type="text"
                      value={envLogGroupId}
                      onChange={(e) => setEnvLogGroupId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-400 text-[10px] font-mono">
                      PAYMENT_LOG_GROUP_ID (Payment Group)
                    </label>
                    <input
                      type="text"
                      value={envPaymentLogGroupId}
                      onChange={(e) => setEnvPaymentLogGroupId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-cyan-400 text-[10px] font-mono">
                      DATA_LOG_GROUP_ID (Data Log: DL/UL Group)
                    </label>
                    <input
                      type="text"
                      value={envDataLogGroupId}
                      onChange={(e) => setEnvDataLogGroupId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[10px] focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                id="guide-download-env-side-btn"
                onClick={handleDownloadEnv}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .env File</span>
              </button>
              <button
                id="guide-copy-env-side-btn"
                onClick={() => handleCopy(generatedEnvContent, 'side_copy')}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                {copiedKey === 'side_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'side_copy' ? 'Copied to Clipboard!' : 'Copy .env Text'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
