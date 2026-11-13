import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Download, 
  Upload, 
  ExternalLink, 
  Film, 
  Music, 
  Image as ImageIcon, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  RefreshCw, 
  Copy, 
  Info,
  Clock,
  AlertTriangle,
  Trash2,
  Play,
  FileText,
  Paperclip,
  Share2,
  Users,
  Shield,
  ShieldAlert,
  Radio,
  Check,
  AlertCircle,
  Zap,
  Key,
  Cookie
} from 'lucide-react';
import { UserProfile, BotSettings, MediaItem, BotChatMessage, ActivityLog } from '../types';
import { extractMediaFromUrl, detectSource } from '../services/extractor';
import { PLANS_CONFIG } from '../services/state';

interface TelegramBotFrameProps {
  user: UserProfile;
  settings: BotSettings;
  onUpdateUser: (updated: UserProfile) => void;
  onSaveToOfflineVault: (item: MediaItem) => void;
  onNavigateTab: (tab: string) => void;
  onRecordLog?: (log: any) => void;
}

export const TelegramBotFrame: React.FC<TelegramBotFrameProps> = ({
  user,
  settings,
  onUpdateUser,
  onSaveToOfflineVault,
  onNavigateTab,
  onRecordLog,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Testing & Simulation states for prompt requirements
  const [chatContext, setChatContext] = useState<'dm' | 'support_group' | 'other_gc'>('dm');
  const [simulatedRole, setSimulatedRole] = useState<'user' | 'admin' | 'owner'>('user');

  // Live timer tick every 1000ms for accurate 5-minute auto-deletion countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [messages, setMessages] = useState<BotChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'bot',
      text: `⚡ <b>Welcome to Beta Bot Hub!</b> ⚡\n\nI am the ultra-advanced media engine for <b>TeraBox</b>.\n\n• 📥 <b>Daily Downloads:</b> <code>${user.downloadsToday}/${PLANS_CONFIG[user.currentPlan].downloadsPerDay === 'unlimited' ? '∞' : PLANS_CONFIG[user.currentPlan].downloadsPerDay}</code>\n• 📤 <b>Daily Uploads:</b> <code>${user.uploadsToday}/${PLANS_CONFIG[user.currentPlan].uploadsPerDay === 'unlimited' ? '∞' : PLANS_CONFIG[user.currentPlan].uploadsPerDay}</code>\n• 💎 <b>Current Tier:</b> <code>${user.currentPlan.toUpperCase()}</code>\n\n<i>🛡️ <b>Privacy & Auto-Delete:</b> All extracted videos, audio, and documents are <b>automatically deleted in 5 minutes</b> from chat for your privacy and storage conservation. Please download or forward to Saved Messages immediately!</i>`,
      timestamp: '12:00 PM',
      inlineButtons: [
        { label: '📥 Download Media', action: 'cmd_download', style: 'primary' },
        { label: '📤 Create TeraBox Link', action: 'cmd_upload', style: 'primary' },
        { label: '💎 Plans & Pricing', action: 'cmd_plans', style: 'accent' },
        { label: '👥 Refer & Earn (3=1 Day)', action: 'cmd_referral', style: 'secondary' },
        { label: '📂 Offline Vault', action: 'cmd_offline', style: 'secondary' },
        { label: '❓ Help & Support', action: 'cmd_help', style: 'secondary' },
      ],
    },
  ]);

  const getTimeStr = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: check if user is in all 3 required must-join channels
  const checkMustJoin = (): boolean => {
    const status = user.mustJoinStatus || {
      '@betabot_hub': true,
      '@betabot_support': true,
      '@sukoon_s': true,
    };
    return (
      status['@betabot_hub'] === true &&
      status['@betabot_support'] === true &&
      status['@sukoon_s'] === true
    );
  };

  // Toggle channel membership for testing force-join leave detection
  const handleToggleChannelStatus = (channel: '@betabot_hub' | '@betabot_support' | '@sukoon_s') => {
    const current = user.mustJoinStatus || {
      '@betabot_hub': true,
      '@betabot_support': true,
      '@sukoon_s': true,
    };
    const updated = {
      ...current,
      [channel]: !current[channel],
    };
    onUpdateUser({
      ...user,
      mustJoinStatus: updated,
    });
  };

  const handleLeaveAll = () => {
    onUpdateUser({
      ...user,
      mustJoinStatus: {
        '@betabot_hub': false,
        '@betabot_support': false,
        '@sukoon_s': false,
      },
    });
  };

  const handleJoinAll = () => {
    onUpdateUser({
      ...user,
      mustJoinStatus: {
        '@betabot_hub': true,
        '@betabot_support': true,
        '@sukoon_s': true,
      },
    });
  };

  const handleVerifyMustJoin = () => {
    const time = getTimeStr();
    const isJoined = checkMustJoin();
    if (isJoined) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_verify_ok_' + Date.now(),
          sender: 'bot',
          text: `✅ <b>Verification Successful!</b>\n\nYou are verified as a member of all required channels:\n• 📢 @betabot_hub\n• 🛠️ @betabot_support\n• ✨ @sukoon_s\n\n🎉 <i>Your access is now active! Send any TeraBox link to start downloading.</i>`,
          timestamp: time,
          inlineButtons: [
            { label: '📥 Send TeraBox Link', action: 'cmd_sample_terabox', style: 'primary' },
          ],
        },
      ]);
    } else {
      const status = user.mustJoinStatus || { '@betabot_hub': false, '@betabot_support': false, '@sukoon_s': false };
      const missing: string[] = [];
      if (!status['@betabot_hub']) missing.push('📢 @betabot_hub (Updates)');
      if (!status['@betabot_support']) missing.push('🛠️ @betabot_support (Support Channel)');
      if (!status['@sukoon_s']) missing.push('✨ @sukoon_s (Community)');

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_verify_fail_' + Date.now(),
          sender: 'bot',
          text: `❌ <b>Verification Incomplete!</b>\n\nYou still have not joined the following channel(s):\n${missing.map((m) => `• <b>${m}</b>`).join('\n')}\n\nPlease join all channels first and click <b>Verify Joined</b> below!`,
          timestamp: time,
          inlineButtons: [
            { label: '📢 Join @betabot_hub', action: 'join_hub', url: 'https://t.me/betabot_hub', style: 'primary' },
            { label: '🛠️ Join @betabot_support', action: 'join_sup', url: 'https://t.me/betabot_support', style: 'primary' },
            { label: '✨ Join @sukoon_s', action: 'join_sukoon', url: 'https://t.me/sukoon_s', style: 'primary' },
            { label: '✅ Verify Joined', action: 'cmd_verify_must_join', style: 'accent' },
          ],
        },
      ]);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatAutoDeleteTimer = (expiresAt?: number) => {
    if (!expiresAt) return '00:00';
    const diff = Math.max(0, Math.floor((expiresAt - nowTime) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleTriggerManualDelete = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              isDeleted: true,
              text: `🗑️ <b>[Media Auto-Deleted After 5 Minutes]</b>\n\n<i>This video / file was purged from the chat as requested to protect privacy and save server storage.</i>`,
            }
          : m
      )
    );
  };

  const handleDirectDeviceDownload = (media: MediaItem) => {
    const a = document.createElement('a');
    a.href = media.downloadUrl;
    a.download = `${media.title || 'media_betabothub'}.${media.type === 'video' ? 'mp4' : media.type === 'audio' ? 'mp3' : 'jpg'}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCommand = (cmd: string) => {
    const time = getTimeStr();

    // 1. MUST-JOIN VERIFICATION CHECK
    if (cmd === 'cmd_verify_must_join') {
      handleVerifyMustJoin();
      return;
    }

    // If user has left any channel, block commands (unless verifying)
    if (!checkMustJoin() && cmd !== '/help' && cmd !== 'cmd_help') {
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: cmd, timestamp: time },
        {
          id: 'bot_must_join_' + Date.now(),
          sender: 'bot',
          text: `⚠️ <b>Must-Join Channel Verification Required!</b>\n\nTo use this bot, you must join our official channels:\n1. 📢 <b>Updates:</b> @betabot_hub\n2. 🛠️ <b>Support Channel:</b> @betabot_support\n3. ✨ <b>Community:</b> @sukoon_s\n\n<i>Notice: If you leave any of these channels, the bot will automatically stop functioning until you rejoin and verify!</i>`,
          timestamp: time,
          inlineButtons: [
            { label: '📢 Join @betabot_hub', action: 'join_hub', url: 'https://t.me/betabot_hub', style: 'primary' },
            { label: '🛠️ Join @betabot_support', action: 'join_sup', url: 'https://t.me/betabot_support', style: 'primary' },
            { label: '✨ Join @sukoon_s', action: 'join_sukoon', url: 'https://t.me/sukoon_s', style: 'primary' },
            { label: '✅ Verify Joined', action: 'cmd_verify_must_join', style: 'accent' },
          ],
        },
      ]);
      return;
    }

    // 2. SUPPORT GROUP SPECIFIC RESTRICTIONS
    if (chatContext === 'support_group') {
      // Rule: In support group, bot NEVER replies to normal users, sudo, or admins.
      // ONLY replies to bot owner!
      if (simulatedRole !== 'owner') {
        // Add user message, but NO bot reply
        setMessages((prev) => [
          ...prev,
          { id: 'user_' + Date.now(), sender: 'user', text: cmd, timestamp: time },
          {
            id: 'bot_muted_' + Date.now(),
            sender: 'bot',
            text: `<i>🔇 [Muted in @betabot_support: Bot ignores all messages from regular users and admins/sudo in the official support group]</i>`,
            timestamp: time,
          },
        ]);
        return;
      }

      // If simulatedRole IS owner, only 3 commands are permitted: /id, /plan, /premium
      if (cmd === '/id' || cmd === 'cmd_id') {
        setMessages((prev) => [
          ...prev,
          { id: 'user_' + Date.now(), sender: 'user', text: '/id', timestamp: time },
          {
            id: 'bot_id_' + Date.now(),
            sender: 'bot',
            text: `🆔 <b>Group & Owner Identity Information:</b>\n\n• <b>Chat ID:</b> <code>-1001928374650</code>\n• <b>Chat Title:</b> <code>BetaBot Support Official</code>\n• <b>Chat Username:</b> <code>@betabot_support</code>\n• <b>Your User ID:</b> <code>${settings.botOwnerId || '652194821'}</code>\n• <b>Your Role:</b> 👑 <b>BOT OWNER</b>\n\n<i>🛡️ Authorized in Support Group. Only /id, /plan, /premium are answered here.</i>`,
            timestamp: time,
          },
        ]);
        return;
      } else if (cmd === '/plan' || cmd === 'cmd_plans') {
        setMessages((prev) => [
          ...prev,
          { id: 'user_' + Date.now(), sender: 'user', text: '/plan', timestamp: time },
          {
            id: 'bot_plan_owner_' + Date.now(),
            sender: 'bot',
            text: `👑 <b>Owner Plan Overview & Management:</b>\n\n• <b>Pro 7 Days:</b> ₹15 (17 dl / 15 ul per day)\n• <b>Pro 30 Days:</b> ₹27 (17 dl / 15 ul per day)\n• <b>Beta VIP:</b> ₹69/month (Unlimited downloads & uploads)\n\n<b>Admin Grant Command:</b>\n<code>/addpremium &lt;user_id&gt; &lt;1d|7d|1m|1y&gt; &lt;pro|beta&gt;</code>`,
            timestamp: time,
            inlineButtons: [
              { label: '⚙️ Open Master Admin Panel', action: 'nav_admin', style: 'accent' },
            ],
          },
        ]);
        return;
      } else if (cmd === '/premium' || cmd === 'cmd_premium') {
        setMessages((prev) => [
          ...prev,
          { id: 'user_' + Date.now(), sender: 'user', text: '/premium', timestamp: time },
          {
            id: 'bot_prem_owner_' + Date.now(),
            sender: 'bot',
            text: `👑 <b>Owner Premium Administration:</b>\n\n• <b>Owner Status:</b> Active\n• <b>Manual Grants:</b> Available directly via Admin Console\n• <b>Payment Approvals:</b> In Logger tab with Approve/Decline buttons\n\n<i>Command /premium is authorized exclusively for Bot Owner in @betabot_support.</i>`,
            timestamp: time,
            inlineButtons: [
              { label: '💎 Open VIP Plans', action: 'nav_plans', style: 'primary' },
              { label: '⚙️ Open Admin Grants', action: 'nav_admin', style: 'accent' },
            ],
          },
        ]);
        return;
      } else {
        // Any other command is ignored for support group
        setMessages((prev) => [
          ...prev,
          { id: 'user_' + Date.now(), sender: 'user', text: cmd, timestamp: time },
          {
            id: 'bot_restricted_' + Date.now(),
            sender: 'bot',
            text: `<i>🔇 [Support Group Policy]: In @betabot_support, only 3 commands are permitted for Owner: <code>/id</code>, <code>/plan</code>, and <code>/premium</code>. Other commands work in other group chats or private chat.</i>`,
            timestamp: time,
          },
        ]);
        return;
      }
    }

    // 3. NORMAL COMMAND EXECUTION (For DM and Other GC)
    if (cmd === '/start' || cmd === 'cmd_start') {
      if (onRecordLog) {
        onRecordLog({
          type: 'bot_start',
          userId: user.id,
          username: user.username,
          telegramHandle: user.telegramHandle,
          referralCodeUsed: user.referredBy || undefined,
          sourceClient: chatContext === 'other_gc' ? 'Other Group Chat' : 'Telegram DM',
          status: 'success',
          details: `User executed /start. Plan: ${user.currentPlan.toUpperCase()}`,
        });
      }

      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: '/start', timestamp: time },
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: `⚡ <b>Beta Bot Hub Dashboard</b>\n\nPlan: <b>${user.currentPlan.toUpperCase()}</b>\nDownloads Left: <b>${
            PLANS_CONFIG[user.currentPlan].downloadsPerDay === 'unlimited'
              ? 'Unlimited'
              : Math.max(0, (PLANS_CONFIG[user.currentPlan].downloadsPerDay as number) - user.downloadsToday)
          }</b>\nUploads Left: <b>${
            PLANS_CONFIG[user.currentPlan].uploadsPerDay === 'unlimited'
              ? 'Unlimited'
              : Math.max(0, (PLANS_CONFIG[user.currentPlan].uploadsPerDay as number) - user.uploadsToday)
          }</b>\n\n<b>Supported Platforms:</b>\n• 📥 <b>Downloads:</b> TeraBox (Cookie Session)\n• 📤 <b>Uploads:</b> Strictly TeraBox Only\n\nPaste a link below for <b>Direct Video Delivery</b>:`,
          timestamp: time,
          inlineButtons: [
            { label: '📥 Send TeraBox Link', action: 'cmd_sample_terabox', style: 'primary' },
            { label: '💎 View VIP Plans (₹15/₹27/₹69)', action: 'cmd_plans', style: 'accent' },
            { label: '📜 View Live Activity Logger', action: 'nav_logger', style: 'secondary' },
          ],
        },
      ]);
    } else if (cmd === '/id' || cmd === 'cmd_id') {
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: '/id', timestamp: time },
        {
          id: 'bot_id_' + Date.now(),
          sender: 'bot',
          text: `🆔 <b>Your Telegram Information:</b>\n\n• <b>User ID:</b> <code>${user.id}</code>\n• <b>Username:</b> @${user.username}\n• <b>Full Name:</b> ${(user as any).displayName || user.username}\n• <b>Current Plan:</b> <code>${user.currentPlan.toUpperCase()}</code>\n• <b>Chat Type:</b> ${chatContext === 'other_gc' ? 'Other Group Chat' : 'Private DM'}`,
          timestamp: time,
        },
      ]);
    } else if (cmd === '/logs' || cmd === 'cmd_logs') {
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: '/logs', timestamp: time },
        {
          id: 'bot_logs_' + Date.now(),
          sender: 'bot',
          text: `📜 <b>Centralized Activity & Downloader Logger</b>\n\nAll actions (Bot starts, Plan purchases, TeraBox downloads, and file uploads) are recorded in real-time in the Master Activity Logger.\n\n• <b>Your User ID:</b> <code>${user.id}</code> (@${user.username})\n• <b>Current Plan:</b> <code>${user.currentPlan.toUpperCase()}</code>\n• <b>Downloads Today:</b> <code>${user.downloadsToday}</code>\n• <b>Uploads Today:</b> <code>${user.uploadsToday}</code>\n• <b>Auto-Delete Time:</b> <code>${settings.mediaAutoDeleteMinutes || 5} Minutes</code>\n\nClick below to open the Live Logger UI:`,
          timestamp: time,
          inlineButtons: [
            { label: '📜 Open Master Activity Logger', action: 'nav_logger', style: 'primary' },
            { label: '⚡ Run /start', action: 'cmd_start', style: 'secondary' },
          ],
        },
      ]);
    } else if (cmd === '/plan' || cmd === 'cmd_plans') {
      onNavigateTab('plans');
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: '/plan', timestamp: time },
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: `💎 <b>Beta Bot Hub Premium Subscription Tiers</b>\n\n1. <b>Free Tier:</b>\n• 3 Downloads & 3 Uploads daily\n• 100% Free forever\n\n2. <b>Pro Plan:</b>\n• 17 Downloads & 15 Uploads daily\n• 7 Days: <b>₹15</b> | 30 Days: <b>₹27</b>\n• Auto-generated 10-minute dynamic UPI QR\n\n3. <b>Beta VIP Plan:</b>\n• <b>Unlimited</b> Uploads & Downloads!\n• 30 Days: <b>₹69</b>\n• Ultra Turbo High-Speed CDN\n\nSelect a plan to open secure 10-minute UPI QR payment:`,
          timestamp: time,
          inlineButtons: [
            { label: '🥈 Pro Plan (₹15 / ₹27)', action: 'nav_plans', style: 'primary' },
            { label: '🥇 Beta VIP Plan (₹69)', action: 'nav_plans', style: 'accent' },
          ],
        },
      ]);
    } else if (cmd === '/premium' || cmd === 'cmd_premium') {
      onNavigateTab('plans');
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: '/premium', timestamp: time },
        {
          id: 'bot_prem_' + Date.now(),
          sender: 'bot',
          text: `👑 <b>VIP Premium Subscriptions:</b>\n\nUnlock unlimited downloads, zero waiting time, and highest priority extraction.\n• <b>Pro 7 Days:</b> ₹15\n• <b>Pro 30 Days:</b> ₹27\n• <b>Beta VIP:</b> ₹69/month`,
          timestamp: time,
          inlineButtons: [
            { label: '💎 Upgrade Now', action: 'nav_plans', style: 'accent' },
          ],
        },
      ]);
    } else if (cmd === '/referral' || cmd === 'cmd_referral') {
      onNavigateTab('referral');
      const refLink = `https://t.me/BetaBotHubBot?start=ref_${user.referralCode}`;
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: '/referral', timestamp: time },
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: `👥 <b>Referral Reward System</b>\n\n• <b>Rule:</b> Refer <b>3 friends</b> = Get <b>1 Free Download & Upload Pass</b> for 24 hours!\n• <b>Mandatory Condition:</b> Each referred friend must click your link and join our official channels:\n  - 📢 @betabot_hub\n  - 🛠️ @betabot_support\n  - ✨ @sukoon_s\n\nYour Referral Link:\n<code>${refLink}</code>`,
          timestamp: time,
          inlineButtons: [
            { label: '👥 Manage Referrals & Join Check', action: 'nav_referral', style: 'primary' },
          ],
        },
      ]);
    } else if (cmd === '/help' || cmd === 'cmd_help') {
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: '/help', timestamp: time },
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: `❓ <b>Help & Support — Beta Bot Hub:</b>\n\n1. <b>Direct Video Download:</b> Send TeraBox links.\n2. <b>Uploads (TeraBox Only):</b> Uploads are strictly restricted to TeraBox cloud storage.\n3. <b>5-Minute Auto-Delete:</b> Downloaded media files are automatically removed after 5 minutes for privacy.\n4. <b>Dynamic 10-Min QR:</b> Upgrades use auto-generated UPI QR codes valid for 10 minutes.\n5. <b>Support Group Policy:</b> In @betabot_support, the bot only responds to Bot Owner for <code>/id</code>, <code>/plan</code>, and <code>/premium</code>.`,
          timestamp: time,
          inlineButtons: [
            { label: '📢 Update Channel (@betabot_hub)', action: 'open_hub', url: 'https://t.me/betabot_hub', style: 'secondary' },
            { label: '🛠️ Support Channel (@betabot_support)', action: 'open_support', url: 'https://t.me/betabot_support', style: 'secondary' },
            { label: '✨ Community (@sukoon_s)', action: 'open_sukoon', url: 'https://t.me/sukoon_s', style: 'secondary' },
          ],
        },
      ]);
    } else if (cmd === 'cmd_sample_terabox') {
      processLink('https://www.teraboxapp.com/s/1aX8B_sample_4k_video');
    } else if (cmd === 'cmd_download') {
      onNavigateTab('downloader');
    } else if (cmd === 'cmd_upload') {
      onNavigateTab('upload');
    } else if (cmd === 'cmd_offline') {
      onNavigateTab('offline');
    } else if (cmd === 'nav_plans' || cmd === 'btn_plans') {
      onNavigateTab('plans');
    } else if (cmd === 'nav_referral') {
      onNavigateTab('referral');
    } else if (cmd === 'nav_logger' || cmd === 'cmd_logger') {
      onNavigateTab('logger');
    } else if (cmd === 'nav_admin') {
      onNavigateTab('admin');
    } else if (cmd === '/renew' || cmd === 'cmd_renew' || cmd === 'btn_renew') {
      onNavigateTab('plans');
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: cmd === '/renew' ? '/renew' : '🔄 Renew Now (रिन्यू करें)', timestamp: time },
        {
          id: 'bot_renew_' + Date.now(),
          sender: 'bot',
          text: `🔄 <b>Premium Subscription Renewal / रिन्यूअल:</b>\n\nHello @${user.username}, apna subscription renew karne ke liye niche plan select karein:\n\n• <b>Pro 7 Days:</b> ₹15 (17 dl / 15 ul per day)\n• <b>Pro 30 Days:</b> ₹27 (17 dl / 15 ul per day)\n• <b>Beta VIP 30 Days:</b> ₹69 (Unlimited downloads & uploads)\n\n<i>Plan select karte hi 10-minute dynamic UPI QR (<code>${settings.upiId}</code>) open ho jayega!</i>`,
          timestamp: time,
          inlineButtons: [
            { label: '🥈 Pro Plan (₹15 / ₹27)', action: 'nav_plans', style: 'primary' },
            { label: '🥇 Beta VIP Plan (₹69)', action: 'nav_plans', style: 'accent' },
            { label: '💬 Support Group', action: 'open_support', url: 'https://t.me/betabot_support', style: 'secondary' },
          ],
        },
      ]);
    } else if (cmd.startsWith('/broadcast')) {
      const broadcastContent = cmd.replace('/broadcast', '').trim();
      if (simulatedRole !== 'owner' && simulatedRole !== 'admin') {
        setMessages((prev) => [
          ...prev,
          { id: 'user_' + Date.now(), sender: 'user', text: cmd, timestamp: time },
          {
            id: 'bot_denied_' + Date.now(),
            sender: 'bot',
            text: `🚫 <b>Access Denied:</b>\n\n<code>/broadcast</code> is strictly restricted to the <b>Bot Owner & Authorized Admins</b> only! Regular users cannot send broadcasts.`,
            timestamp: time,
          },
        ]);
        return;
      }

      if (!broadcastContent) {
        setMessages((prev) => [
          ...prev,
          { id: 'user_' + Date.now(), sender: 'user', text: cmd, timestamp: time },
          {
            id: 'bot_bcast_syntax_' + Date.now(),
            sender: 'bot',
            text: `📢 <b>Broadcast Command Usage:</b>\n\n• <code>/broadcast &lt;message&gt;</code> — Sends text announcement to all registered users.\n• Or reply to any photo/video with <code>/broadcast</code> to forward to all users.`,
            timestamp: time,
          },
        ]);
        return;
      }

      if (onRecordLog) {
        onRecordLog({
          type: 'broadcast',
          userId: user.id,
          username: user.username,
          status: 'success',
          details: `Admin broadcast dispatched: "${broadcastContent.slice(0, 35)}..." (1,268 delivered, 12 blocked)`,
        });
      }

      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: cmd, timestamp: time },
        {
          id: 'bot_bcast_ok_' + Date.now(),
          sender: 'bot',
          text: `📢 <b>Broadcast Sent Successfully!</b>\n\n<b>Message Dispatched:</b>\n"${broadcastContent}"\n\n• <b>Delivered:</b> 1,268 users\n• <b>Blocked/Failed:</b> 12 users\n• <b>Anti-Flood Throttling:</b> Active\n\n<i>Recorded in Master Activity Logger.</i>`,
          timestamp: time,
          inlineButtons: [
            { label: '📜 View Logger', action: 'nav_logger', style: 'primary' },
          ],
        },
      ]);
    } else if (cmd === 'cmd_simulate_expiry') {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_expiry_alert_' + Date.now(),
          sender: 'bot',
          text: `⚠️ <b>Subscription Expiry Alert / रिन्यूअल सूचना</b>\n\nHello @${user.username}, aapka <b>${user.currentPlan.toUpperCase()}</b> subscription <b>24 ghante ke andar expire</b> hone wala hai!\n\nBina kisi rukawat ke high-speed downloads aur uploads continue rakhne ke liye abhi apna plan renew karein:\n\n👉 Niche <b>'🔄 Renew Now (रिन्यू करें)'</b> button par click karein aur apna pasandeeda plan select karein!`,
          timestamp: time,
          inlineButtons: [
            { label: '🔄 Renew Now (रिन्यू करें)', action: 'cmd_renew', style: 'accent' },
            { label: '💎 View All Plans', action: 'nav_plans', style: 'primary' },
            { label: '💬 Support Group', action: 'open_support', url: 'https://t.me/betabot_support', style: 'secondary' },
          ],
        },
      ]);
    }
  };

  const processLink = async (url: string) => {
    const time = getTimeStr();

    // 1. MUST-JOIN CHECK
    if (!checkMustJoin()) {
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: url, timestamp: time },
        {
          id: 'bot_must_join_' + Date.now(),
          sender: 'bot',
          text: `⚠️ <b>Must-Join Channel Verification Required!</b>\n\nYou cannot download media because you have not joined (or have left) our official channels:\n\n1. 📢 <b>Updates:</b> @betabot_hub\n2. 🛠️ <b>Support Channel:</b> @betabot_support\n3. ✨ <b>Community:</b> @sukoon_s\n\n<i>Please join all 3 channels and click 'Verify Joined' below!</i>`,
          timestamp: time,
          inlineButtons: [
            { label: '📢 Join @betabot_hub', action: 'join_hub', url: 'https://t.me/betabot_hub', style: 'primary' },
            { label: '🛠️ Join @betabot_support', action: 'join_sup', url: 'https://t.me/betabot_support', style: 'primary' },
            { label: '✨ Join @sukoon_s', action: 'join_sukoon', url: 'https://t.me/sukoon_s', style: 'primary' },
            { label: '✅ Verify Joined', action: 'cmd_verify_must_join', style: 'accent' },
          ],
        },
      ]);
      return;
    }

    // 2. SUPPORT GROUP CHECK
    if (chatContext === 'support_group') {
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: url, timestamp: time },
        {
          id: 'bot_muted_' + Date.now(),
          sender: 'bot',
          text: `<i>🔇 [Muted in @betabot_support: Link processing is disabled in the official support group. Use private chat or other group chats.]</i>`,
          timestamp: time,
        },
      ]);
      return;
    }

    // 3. QUOTA CHECK
    const planConfig = PLANS_CONFIG[user.currentPlan];
    if (planConfig.downloadsPerDay !== 'unlimited' && user.downloadsToday >= (planConfig.downloadsPerDay as number)) {
      setMessages((prev) => [
        ...prev,
        { id: 'user_' + Date.now(), sender: 'user', text: url, timestamp: time },
        {
          id: 'bot_err_' + Date.now(),
          sender: 'bot',
          text: `⚠️ <b>Daily Download Quota Exceeded!</b>\n\nYou have used <b>${user.downloadsToday}/${planConfig.downloadsPerDay}</b> downloads today on your <b>${planConfig.name}</b>.\n\nUpgrade to <b>Pro</b> (17/day) or <b>Beta VIP</b> (unlimited), or refer 3 friends to get a 1-day free pass!`,
          timestamp: time,
          inlineButtons: [
            { label: '💎 Upgrade to Pro (₹15) / Beta (₹69)', action: 'cmd_plans', style: 'accent' },
            { label: '👥 Refer 3 Friends for 1 Day Pass', action: 'cmd_referral', style: 'primary' },
          ],
        },
      ]);
      return;
    }

    // 4. DETECT SOURCE (TeraBox)
    const detectedSource = detectSource(url);

    setIsProcessing(true);
    setMessages((prev) => [
      ...prev,
      { id: 'user_' + Date.now(), sender: 'user', text: url, timestamp: time },
      {
        id: 'bot_proc_' + Date.now(),
        sender: 'bot',
        text: `⚡ <i>Detecting link source: <b>${detectedSource.toUpperCase()}</b>... Extracting direct TeraBox video stream...</i>`,
        timestamp: time,
      },
    ]);

    // Perform extraction with API and Cookie fallback
    const result = await extractMediaFromUrl(url, {
      teraboxCookie: settings.teraboxCookie,
    });
    setIsProcessing(false);

    if (result.success && result.item) {
      const item = result.item;
      // 5-Minute Auto-Delete Timestamp Calculation
      const autoDeleteDurationMs = (settings.mediaAutoDeleteMinutes || 5) * 60 * 1000;
      const autoDeleteAt = Date.now() + autoDeleteDurationMs;
      item.autoDeleteAt = autoDeleteAt;
      item.isDeleted = false;

      // Increment user download count
      const updatedUser: UserProfile = {
        ...user,
        downloadsToday: user.downloadsToday + 1,
        totalDownloads: user.totalDownloads + 1,
      };
      onUpdateUser(updatedUser);

      const engineBadge = 'TERABOX DIRECT STREAM';

      if (onRecordLog) {
        onRecordLog({
          type: 'download',
          userId: user.id,
          username: user.username,
          telegramHandle: user.telegramHandle,
          fileTitle: item.title,
          fileSize: item.size,
          sourcePlatform: item.source as any,
          sourceUrl: url,
          downloadUrl: item.downloadUrl,
          mediaType: item.type,
          autoDeleteAt: autoDeleteAt,
          status: 'success',
          details: `Direct video delivery via Bot chat (${engineBadge})`,
        });
      }

      setMessages((prev) => [
        ...prev.filter((m) => !m.text?.includes('Detecting link source')),
        {
          id: 'bot_result_' + Date.now(),
          sender: 'bot',
          media: item,
          autoDeleteAt: autoDeleteAt,
          isDeleted: false,
          text: `🎬 <b>${item.title}</b>\n\n📦 <b>Size:</b> <code>${item.size}</code>\n⚡ <b>Engine:</b> <code>${engineBadge}</code>\n🏷️ <b>Watermark:</b> <code>${settings.watermarkText || 'BETA BOT HUB'}</code>\n\n⚠️ <b>WARNING:</b> This video will be <b>automatically deleted in 5 minutes!</b> Save to your device or forward to Saved Messages immediately.`,
          timestamp: time,
          inlineButtons: [
            { label: '⬇️ Direct Video Download', action: 'direct_dl_' + item.id, url: item.downloadUrl, style: 'primary' },
            { label: '💾 Save to Offline Vault', action: 'save_offline_' + item.id, style: 'accent' },
            { label: '📤 Share / Forward', action: 'share_link', url: `https://t.me/share/url?url=${encodeURIComponent(item.downloadUrl)}`, style: 'secondary' },
          ],
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev.filter((m) => !m.text?.includes('Detecting link source')),
        {
          id: 'bot_fail_' + Date.now(),
          sender: 'bot',
          text: `❌ <b>Extraction Failed:</b> ${result.error || 'Unable to fetch file'}\n\nMake sure the link is public and active.`,
          timestamp: time,
        },
      ]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const time = getTimeStr();

    // Must-join check
    if (!checkMustJoin()) {
      handleVerifyMustJoin();
      return;
    }

    // Support group check
    if (chatContext === 'support_group') {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_muted_' + Date.now(),
          sender: 'bot',
          text: `<i>🔇 [Muted in @betabot_support: Uploads are disabled in the official support group.]</i>`,
          timestamp: time,
        },
      ]);
      return;
    }

    // Check upload quota
    const planConfig = PLANS_CONFIG[user.currentPlan];
    if (planConfig.uploadsPerDay !== 'unlimited' && user.uploadsToday >= (planConfig.uploadsPerDay as number)) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_err_ul_' + Date.now(),
          sender: 'bot',
          text: `⚠️ <b>Daily Upload Limit Exceeded!</b>\n\nYou have uploaded <b>${user.uploadsToday}/${planConfig.uploadsPerDay}</b> files today on your ${planConfig.name}. Upgrade to Pro or Beta VIP for higher limits!`,
          timestamp: time,
        },
      ]);
      return;
    }

    setIsProcessing(true);
    const mockFileUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video');
    const isAudio = file.type.startsWith('audio');
    const isDoc = file.type.includes('pdf') || file.type.includes('document');
    const mediaType: 'video' | 'audio' | 'photo' | 'document' = isVideo ? 'video' : isAudio ? 'audio' : isDoc ? 'document' : 'photo';

    setTimeout(() => {
      setIsProcessing(false);
      const autoDeleteDurationMs = (settings.mediaAutoDeleteMinutes || 5) * 60 * 1000;
      const autoDeleteAt = Date.now() + autoDeleteDurationMs;

      const newMedia: MediaItem = {
        id: 'uploaded_' + Date.now(),
        title: file.name,
        type: mediaType,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        sizeBytes: file.size,
        thumbnailUrl: isVideo
          ? 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
        streamUrl: mockFileUrl,
        downloadUrl: mockFileUrl,
        source: 'terabox', // Strictly TeraBox Only
        createdAt: Date.now(),
        autoDeleteAt,
        isDeleted: false,
      };

      const generatedTeraBoxLink = `https://teraboxapp.com/s/1tb_${Date.now().toString(36)}`;

      onUpdateUser({
        ...user,
        uploadsToday: user.uploadsToday + 1,
        totalUploads: user.totalUploads + 1,
      });

      if (onRecordLog) {
        onRecordLog({
          type: 'upload',
          userId: user.id,
          username: user.username,
          telegramHandle: user.telegramHandle,
          uploadedFileName: file.name,
          uploadedFileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          generatedLink: generatedTeraBoxLink,
          status: 'success',
          details: `Uploaded via Bot chat; TeraBox cloud link created (TeraBox Exclusive)`,
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'user_file_' + Date.now(),
          sender: 'user',
          text: `📤 Sent file: <b>${file.name}</b> (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
          timestamp: time,
        },
        {
          id: 'bot_ul_res_' + Date.now(),
          sender: 'bot',
          media: newMedia,
          autoDeleteAt,
          isDeleted: false,
          text: `🎉 <b>TeraBox Cloud Link Created Successfully!</b>\n\n📁 <b>File:</b> <code>${file.name}</code>\n⚡ <b>Engine:</b> <code>TeraBox Cloud Storage (Upload is strictly TeraBox only)</code>\n🔗 <b>Generated Link:</b>\n<code>${generatedTeraBoxLink}</code>\n\n⚠️ <b>5-MINUTE AUTO-DELETE WARNING:</b> This media file will be automatically purged in 5 minutes! Download directly below:`,
          timestamp: time,
          inlineButtons: [
            { label: '⬇️ Direct Video Download', action: 'direct_dl_' + newMedia.id, url: newMedia.downloadUrl, style: 'primary' },
            { label: '📋 Copy TeraBox Link', action: 'copy_link_' + generatedTeraBoxLink, style: 'secondary' },
            { label: '💾 Save to Vault', action: 'save_offline_' + newMedia.id, style: 'accent' },
          ],
        },
      ]);
    }, 1200);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isProcessing) return;
    const text = inputVal.trim();
    setInputVal('');

    if (text.startsWith('/')) {
      handleCommand(text);
    } else {
      processLink(text);
    }
  };

  const mustJoinStatus = user.mustJoinStatus || {
    '@betabot_hub': true,
    '@betabot_support': true,
    '@sukoon_s': true,
  };
  const isMustJoinAllSatisfied = checkMustJoin();

  return (
    <div className="max-w-4xl mx-auto bg-[#0d1424] rounded-3xl border border-cyan-500/20 shadow-2xl overflow-hidden flex flex-col h-[750px] transition-all">
      {/* Bot Chat Header */}
      <div className="bg-[#101b30] px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-cyan-500/20">
              β
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#1e293b] rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-slate-100 text-sm">Beta Bot Hub</h3>
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">bot</span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>TeraBox</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </p>
          </div>
        </div>

        {/* Chat Context Selector (Private DM / Support Group / Other GC) */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 text-xs">
          <span className="text-[11px] text-slate-400 px-1 font-medium hidden sm:inline">Location:</span>
          <button
            onClick={() => setChatContext('dm')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              chatContext === 'dm'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💬 DM
          </button>
          <button
            onClick={() => setChatContext('support_group')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              chatContext === 'support_group'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Support Group (@betabot_support)"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>@betabot_support</span>
          </button>
          <button
            onClick={() => setChatContext('other_gc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              chatContext === 'other_gc'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Other Group Chat"
          >
            👥 Other GC
          </button>
        </div>

        {/* Quick command buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            id="bot-btn-quick-start"
            onClick={() => handleCommand('/start')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            /start
          </button>
          <button
            id="bot-btn-quick-id"
            onClick={() => handleCommand('/id')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            /id
          </button>
          <button
            id="bot-btn-quick-plan"
            onClick={() => handleCommand('/plan')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md transition-colors whitespace-nowrap"
          >
            /plan
          </button>
          <button
            id="bot-btn-quick-premium"
            onClick={() => handleCommand('/premium')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md transition-colors whitespace-nowrap"
          >
            /premium
          </button>
          <button
            id="bot-btn-quick-help"
            onClick={() => handleCommand('/help')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            /help
          </button>
          <button
            id="bot-btn-quick-renew-alert"
            onClick={() => handleCommand('cmd_simulate_expiry')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-md transition-colors whitespace-nowrap flex items-center gap-1"
            title="Simulate incoming Subscription Expiry notification with Renew Now button"
          >
            <span>⚠️ Expiry Alert ("Renew Now")</span>
          </button>
          <button
            id="bot-btn-quick-broadcast"
            onClick={() => handleCommand('/broadcast Flash Offer: Upgrade to Beta VIP today!')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md transition-colors whitespace-nowrap flex items-center gap-1"
            title="Test /broadcast command"
          >
            <span>📢 /broadcast</span>
          </button>
        </div>
      </div>

      {/* Support Group Role Simulator Bar (When in @betabot_support) */}
      {chatContext === 'support_group' && (
        <div className="bg-rose-950/50 border-b border-rose-500/30 px-4 py-2 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-rose-300">
              Support Group Mode:
            </span>
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              Bot remains silent for members & admins. Only Owner can run /id, /plan, /premium!
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Simulate Sender:</span>
            <select
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value as any)}
              className="bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded-lg border border-rose-500/40 focus:outline-none"
            >
              <option value="user">Regular User (Muted)</option>
              <option value="admin">Sudo / Admin (Muted)</option>
              <option value="owner">👑 Bot Owner (Authorized: /id, /plan, /premium)</option>
            </select>
          </div>
        </div>
      )}

      {/* Must-Join Channel Test & Verification Toolbar */}
      <div className="bg-[#0b1220] border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            Must-Join Channels:
          </span>
          {/* @betabot_hub */}
          <button
            onClick={() => handleToggleChannelStatus('@betabot_hub')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all flex items-center gap-1 ${
              mustJoinStatus['@betabot_hub']
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
            }`}
            title="Click to toggle Join / Leave"
          >
            {mustJoinStatus['@betabot_hub'] ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            <span>@betabot_hub</span>
            <span className="text-[10px] opacity-70">({mustJoinStatus['@betabot_hub'] ? 'Joined' : 'Left'})</span>
          </button>

          {/* @betabot_support */}
          <button
            onClick={() => handleToggleChannelStatus('@betabot_support')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all flex items-center gap-1 ${
              mustJoinStatus['@betabot_support']
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
            }`}
            title="Click to toggle Join / Leave"
          >
            {mustJoinStatus['@betabot_support'] ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            <span>@betabot_support</span>
            <span className="text-[10px] opacity-70">({mustJoinStatus['@betabot_support'] ? 'Joined' : 'Left'})</span>
          </button>

          {/* @sukoon_s */}
          <button
            onClick={() => handleToggleChannelStatus('@sukoon_s')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all flex items-center gap-1 ${
              mustJoinStatus['@sukoon_s']
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
            }`}
            title="Click to toggle Join / Leave"
          >
            {mustJoinStatus['@sukoon_s'] ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            <span>@sukoon_s</span>
            <span className="text-[10px] opacity-70">({mustJoinStatus['@sukoon_s'] ? 'Joined' : 'Left'})</span>
          </button>
        </div>

        {/* Quick Leave All / Rejoin All simulator */}
        <div className="flex items-center gap-1.5">
          {isMustJoinAllSatisfied ? (
            <button
              onClick={handleLeaveAll}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30"
              title="Simulate user leaving must-join channels"
            >
              Simulate Leaving (Test Block)
            </button>
          ) : (
            <button
              onClick={handleJoinAll}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
              title="Re-join all must-join channels"
            >
              Rejoin All & Verify
            </button>
          )}

        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0f1d] scroll-smooth">
        {messages.map((msg) => {
          const isDeleted = msg.isDeleted || (msg.autoDeleteAt && nowTime >= msg.autoDeleteAt);

          return (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-lg transition-all ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                    : isDeleted
                    ? 'bg-slate-900/90 border border-rose-500/30 text-slate-400 rounded-tl-none'
                    : 'bg-[#131e33] border border-slate-700/60 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* 5-Minute Auto-Delete Countdown Header */}
                {msg.autoDeleteAt && (
                  <div
                    className={`mb-3 pb-2.5 border-b flex items-center justify-between text-xs ${
                      isDeleted
                        ? 'border-rose-500/20 text-rose-400'
                        : 'border-slate-700/80 text-amber-400 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {isDeleted
                          ? 'Expired & Removed (5m Purge)'
                          : `Auto-Delete in: ${formatAutoDeleteTimer(msg.autoDeleteAt)}`}
                      </span>
                    </div>

                    {!isDeleted && (
                      <button
                        onClick={() => handleTriggerManualDelete(msg.id)}
                        className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                        title="Simulate 5-minute timeout instantly"
                      >
                        Purge Now
                      </button>
                    )}
                  </div>
                )}

                {/* Media Item Player / Preview (If attached and not deleted) */}
                {msg.media && !isDeleted && (
                  <div className="mb-3 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                    <div className="relative aspect-video bg-slate-900 flex items-center justify-center group">
                      <img
                        src={msg.media.thumbnailUrl}
                        alt={msg.media.title}
                        className="w-full h-full object-cover opacity-80"
                      />
                      {/* Watermark Overlay Stamp */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/40">
                        🏷️ {settings.watermarkText || 'BETA BOT HUB'}
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-200 text-[10px] font-bold uppercase border border-cyan-800">
                        {msg.media.source}
                      </div>
                      <a
                        href={msg.media.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Play className="w-5 h-5 ml-1 fill-white" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Text content */}
                {msg.text && (
                  <div
                    className="whitespace-pre-line leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                )}

                {/* Inline Interactive Buttons (Only if not deleted) */}
                {msg.inlineButtons && msg.inlineButtons.length > 0 && !isDeleted && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.inlineButtons.map((btn: { label: string; action: string; url?: string; style?: 'primary' | 'secondary' | 'accent' }, idx: number) => {
                      const isSaveOffline = btn.action.startsWith('save_offline_');
                      const isDirectDl = btn.action.startsWith('direct_dl_');
                      const isCopyLink = btn.action.startsWith('copy_link_');
                      const isStyleAccent = btn.style === 'accent';
                      const isStylePrimary = btn.style === 'primary';

                      if (btn.url && !isDirectDl) {
                        return (
                          <a
                            key={idx}
                            id={`bot-inline-btn-${idx}`}
                            href={btn.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all shadow-sm ${
                              isStyleAccent
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                                : isStylePrimary
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
                            }`}
                          >
                            <span>{btn.label}</span>
                            <ExternalLink className="w-3 h-3 opacity-80" />
                          </a>
                        );
                      }

                      return (
                        <button
                          key={idx}
                          id={`bot-inline-btn-${idx}`}
                          onClick={() => {
                            if (isDirectDl && msg.media) {
                              handleDirectDeviceDownload(msg.media);
                              handleCopy('Downloading directly to your device...', 'dl_' + msg.media.id);
                            } else if (isSaveOffline && msg.media) {
                              onSaveToOfflineVault(msg.media);
                              handleCopy('Saved to Offline Vault!', 'offline_' + msg.media.id);
                            } else if (isCopyLink) {
                              const linkToCopy = btn.action.replace('copy_link_', '');
                              handleCopy(linkToCopy, 'copied_link');
                            } else {
                              handleCommand(btn.action);
                            }
                          }}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all shadow-sm active:scale-95 ${
                            isStyleAccent
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                              : isStylePrimary
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
                              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
                          }`}
                        >
                          {isDirectDl ? (
                            <Download className="w-3.5 h-3.5" />
                          ) : isSaveOffline ? (
                            <Film className="w-3 h-3" />
                          ) : isCopyLink ? (
                            <Copy className="w-3 h-3" />
                          ) : null}
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-2 text-[10px] text-slate-400/80 flex items-center justify-end gap-1">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'user' && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preset Quick Link Triggers */}
      <div className="bg-[#0e1626] px-4 py-2 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-400 whitespace-nowrap font-medium">Quick Test:</span>
        <button
          id="quick-test-terabox"
          onClick={() => setInputVal('https://teraboxapp.com/s/1xyz_demo_video')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 whitespace-nowrap border border-slate-700"
        >
          📥 TeraBox Video Link
        </button>
        <button
          id="quick-test-plan"
          onClick={() => handleCommand('/plan')}
          className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 whitespace-nowrap border border-amber-500/30"
        >
          💎 ₹15 / ₹27 / ₹69 Plans
        </button>
      </div>

      {/* Input Field & File Upload Trigger */}
      <form onSubmit={handleSend} className="p-3 bg-[#131d31] border-t border-slate-800 flex items-center gap-2">
        {/* Hidden File Input: strictly TeraBox Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*,.pdf"
          onChange={handleFileUpload}
          className="hidden"
          id="bot-file-picker"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors shrink-0"
          title="Upload file to TeraBox Cloud Storage"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          id="bot-chat-input"
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Paste TeraBox link or attach media for TeraBox upload..."
          disabled={isProcessing}
          className="flex-1 bg-slate-900/90 text-slate-100 placeholder-slate-500 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
        />

        <button
          id="bot-chat-send-btn"
          type="submit"
          disabled={!inputVal.trim() || isProcessing}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-md shadow-cyan-500/20 active:scale-95 shrink-0"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
