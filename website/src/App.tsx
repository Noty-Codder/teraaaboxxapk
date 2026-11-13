import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TelegramBotFrame } from './components/TelegramBotFrame';
import { DownloaderSection } from './components/DownloaderSection';
import { UploadSection } from './components/UploadSection';
import { OfflineManager } from './components/OfflineManager';
import { PlansSection } from './components/PlansSection';
import { ReferralSection } from './components/ReferralSection';
import { AdminPanel } from './components/AdminPanel';
import { ActivityLoggerSection } from './components/ActivityLoggerSection';
import { SourceCodeViewer } from './components/SourceCodeViewer';
import { CookieSettingsModal } from './components/CookieSettingsModal';
import { ZipExportModal } from './components/ZipExportModal';
import { 
  UserProfile, 
  BotSettings, 
  PaymentRequest, 
  MediaItem, 
  AppNotification,
  ActivityLog,
  ActivityLogType,
  PremiumGrantRecord
} from './types';
import { 
  loadUserProfile, 
  saveUserProfile, 
  loadSettings, 
  saveSettings, 
  loadPayments, 
  savePayments,
  loadActivityLogs,
  saveActivityLogs,
  addActivityLog,
  resetDemoActivityLogs,
  loadPremiumGrants,
  savePremiumGrants
} from './services/state';
import { saveMediaOffline } from './services/offlineStorage';
import { Bell, X, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile>(() => loadUserProfile());
  const [settings, setSettings] = useState<BotSettings>(() => loadSettings());
  const [payments, setPayments] = useState<PaymentRequest[]>(() => loadPayments());
  const [grants, setGrants] = useState<PremiumGrantRecord[]>(() => loadPremiumGrants());
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadActivityLogs());
  const [activeTab, setActiveTab] = useState<string>('bot');

  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);

  // Sync state changes
  const handleUpdateUser = (updated: UserProfile) => {
    setUser(updated);
    saveUserProfile(updated);
  };

  const handleUpdateSettings = (updated: BotSettings) => {
    setSettings(updated);
    saveSettings(updated);
  };

  // Activity Log Recorder
  const handleRecordLog = (logData: Omit<ActivityLog, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => {
    const created = addActivityLog(logData);
    setActivityLogs((prev) => [created, ...prev]);
    return created;
  };

  const handleClearLogs = () => {
    saveActivityLogs([]);
    setActivityLogs([]);
  };

  const handleResetDemoLogs = () => {
    const refreshed = resetDemoActivityLogs();
    setActivityLogs(refreshed);
  };

  const handleSimulateLog = (type: ActivityLogType) => {
    const demoUsers = [
      { id: '892102', username: 'priya_m', name: 'Priya Sharma' },
      { id: '741209', username: 'vikram_99', name: 'Vikram Singh' },
      { id: '904512', username: 'karan_dev', name: 'Karan Mehra' },
      { id: '652391', username: 'sneha_stream', name: 'Sneha Roy' },
      { id: '419208', username: 'amit_kumar', name: 'Amit Kumar' },
    ];
    const u = demoUsers[Math.floor(Math.random() * demoUsers.length)];

    if (type === 'bot_start') {
      handleRecordLog({
        type: 'bot_start',
        userId: u.id,
        username: u.username,
        userDisplayName: u.name,
        telegramHandle: `@${u.username}`,
        referralCodeUsed: Math.random() > 0.5 ? 'REF_VIP_' + Math.floor(Math.random() * 9000 + 1000) : undefined,
        sourceClient: 'Telegram Android App',
        status: 'success',
        details: 'User pressed /start button and checked daily quota.',
      });
    } else if (type === 'plan_purchase') {
      const plans = [
        { id: 'pro_7d', name: 'Pro Plan (7 Days)', amount: 15, duration: '7 Days' },
        { id: 'pro_30d', name: 'Pro Plan (30 Days)', amount: 27, duration: '30 Days' },
        { id: 'beta_30d', name: 'Beta VIP Unlimited (30 Days)', amount: 69, duration: '30 Days' },
      ];
      const p = plans[Math.floor(Math.random() * plans.length)];
      const utr = '4' + Math.floor(10000000000 + Math.random() * 90000000000);
      handleRecordLog({
        type: 'plan_purchase',
        userId: u.id,
        username: u.username,
        userDisplayName: u.name,
        telegramHandle: `@${u.username}`,
        planId: p.id,
        planName: p.name,
        planDuration: p.duration,
        amountPaid: p.amount,
        paymentMethod: 'UPI_QR',
        utrNumber: utr,
        status: 'success',
        grantedBy: 'Admin Approval (UTR Verified)',
        details: `Purchased ${p.name} for ₹${p.amount} via dynamic 10-minute UPI QR.`,
      });
    } else if (type === 'download') {
      const titles = [
        'Interstellar_IMAX_DirectStream_1080p.mkv',
        'TopGun_Maverick_4K_HDR.mp4',
        'Cyberpunk_Edgerunners_S01E05.mkv',
        'Data_Science_Masterclass_Complete.zip',
        'Lofi_Chill_Music_Collection_2026.mp3',
      ];
      const t = titles[Math.floor(Math.random() * titles.length)];
      const sizes = ['450.2 MB', '1.2 GB', '820.0 MB', '2.4 GB', '68.5 MB'];
      const s = sizes[Math.floor(Math.random() * sizes.length)];
      handleRecordLog({
        type: 'download',
        userId: u.id,
        username: u.username,
        userDisplayName: u.name,
        telegramHandle: `@${u.username}`,
        fileTitle: t,
        fileSize: s,
        sourcePlatform: 'terabox',
        sourceUrl: `https://teraboxapp.com/s/1tb_${Math.random().toString(36).substring(2, 8)}`,
        downloadUrl: `https://d.terabox.app/download/cdn_${Math.random().toString(36).substring(2, 10)}/${encodeURIComponent(t)}`,
        mediaType: t.endsWith('.mp3') ? 'audio' : t.endsWith('.zip') ? 'document' : 'video',
        autoDeleteAt: Date.now() + 5 * 60 * 1000,
        status: 'success',
        details: 'Direct stream generated; auto-delete scheduled in 5 minutes.',
      });
    } else if (type === 'upload') {
      const files = [
        { name: 'Machine_Learning_Notes_Final.pdf', size: '12.4 MB' },
        { name: 'Vlog_Trip_Manali_2026.mp4', size: '380.0 MB' },
        { name: 'Project_Source_Code.tar.gz', size: '4.8 MB' },
        { name: 'Podcast_Episode_12.mp3', size: '45.2 MB' },
      ];
      const f = files[Math.floor(Math.random() * files.length)];
      const link = `https://teraboxapp.com/s/1tb_${Math.random().toString(36).substring(2, 9)}_${f.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 10)}`;
      handleRecordLog({
        type: 'upload',
        userId: u.id,
        username: u.username,
        userDisplayName: u.name,
        telegramHandle: `@${u.username}`,
        uploadedFileName: f.name,
        uploadedFileSize: f.size,
        generatedLink: link,
        status: 'success',
        details: 'Uploaded to cloud storage and TeraBox link created.',
      });
    }
  };

  const handleAddPayment = (newPay: PaymentRequest) => {
    const updated = [newPay, ...payments];
    setPayments(updated);
    savePayments(updated);
  };

  const handleAddGrant = (newGrant: PremiumGrantRecord) => {
    const updated = [newGrant, ...grants];
    setGrants(updated);
    savePremiumGrants(updated);

    handleRecordLog({
      type: 'plan_grant',
      userId: newGrant.userId,
      username: newGrant.username,
      planId: newGrant.plan,
      planName: `${newGrant.plan.toUpperCase()} Plan (${newGrant.durationLabel})`,
      planDuration: newGrant.durationLabel,
      amountPaid: 0,
      paymentMethod: 'ADMIN_GRANT',
      grantedBy: newGrant.grantedBy,
      planExpiresAt: newGrant.expiresAt,
      status: 'success',
      details: `Manual premium grant by ${newGrant.grantedBy}. Note: ${newGrant.note || 'None'}`,
    });
  };

  const handleRevokeGrant = (grantId: string) => {
    const updated = grants.filter((g) => g.id !== grantId);
    setGrants(updated);
    savePremiumGrants(updated);
  };

  const handleApprovePayment = (paymentId: string) => {
    const updated = payments.map((p) => {
      if (p.id === paymentId) {
        return { ...p, status: 'approved' as const };
      }
      return p;
    });
    setPayments(updated);
    savePayments(updated);

    const pay = payments.find((p) => p.id === paymentId);
    if (pay) {
      const planKey = pay.planId.includes('beta') ? 'beta' : 'pro';
      const duration = pay.durationDays;
      const expiry = Date.now() + duration * 24 * 3600 * 1000;

      // Log plan purchase in Master Activity Logger
      handleRecordLog({
        type: 'plan_purchase',
        userId: pay.userId,
        username: pay.userName,
        userDisplayName: pay.userName,
        telegramHandle: pay.telegramHandle,
        planId: pay.planId,
        planName: pay.planName,
        planDuration: `${pay.durationDays} Days`,
        amountPaid: pay.amount,
        paymentMethod: 'UPI_QR',
        utrNumber: pay.utrNumber,
        grantedBy: 'Admin Approval (UTR Verified)',
        planExpiresAt: expiry,
        status: 'success',
        details: `Approved ₹${pay.amount} payment for ${pay.planName}. Subscription activated until ${new Date(expiry).toLocaleDateString()}.`,
      });

      const notif: AppNotification = {
        id: 'notif_approved_' + Date.now(),
        title: '🎉 Payment Approved!',
        message: `Your payment of ₹${pay.amount} for ${pay.planName} has been approved by admin. Enjoy high speed access!`,
        timestamp: Date.now(),
        read: false,
        type: 'success',
      };

      const updatedUser: UserProfile = {
        ...user,
        currentPlan: planKey,
        planDuration: duration === 7 ? '7d' : '30d',
        planExpiresAt: expiry,
        notifications: [notif, ...user.notifications],
      };

      handleUpdateUser(updatedUser);
      setToastNotification(notif);
      setTimeout(() => setToastNotification(null), 5000);
    }
  };

  const handleRejectPayment = (paymentId: string) => {
    const updated = payments.map((p) => {
      if (p.id === paymentId) {
        return { ...p, status: 'rejected' as const };
      }
      return p;
    });
    setPayments(updated);
    savePayments(updated);

    const pay = payments.find((p) => p.id === paymentId);
    if (pay) {
      handleRecordLog({
        type: 'plan_purchase',
        userId: pay.userId,
        username: pay.userName,
        telegramHandle: pay.telegramHandle,
        planId: pay.planId,
        planName: pay.planName,
        amountPaid: pay.amount,
        paymentMethod: 'UPI_QR',
        utrNumber: pay.utrNumber,
        status: 'failed',
        details: `Payment of ₹${pay.amount} was rejected by Admin (Invalid UTR or payment not received).`,
      });
    }
  };

  const handleApprovePaymentLog = (logId: string) => {
    let approvedPlanName = 'Plan';
    let approvedAmount = 0;
    let targetUserId = '';
    let targetPlanId = '';
    let targetPaymentId: string | undefined;

    setActivityLogs((prev) =>
      prev.map((log) => {
        if (log.id === logId) {
          approvedPlanName = log.planName || 'Plan';
          approvedAmount = log.amountPaid || 0;
          targetUserId = log.userId;
          targetPlanId = log.planId || 'pro_30d';
          targetPaymentId = log.paymentId;
          return {
            ...log,
            paymentStatus: 'approved',
            status: 'success',
            details: (log.details ? log.details.replace(' • [Status: Rejected/Declined]', '') : '') + ' • [Status: Approved by Admin in Payment Logger]',
          };
        }
        return log;
      })
    );

    // If there is an associated payment request in payments table, approve it
    if (targetPaymentId) {
      handleApprovePayment(targetPaymentId);
    } else {
      // Direct log approval: activate user subscription
      const planKey = targetPlanId.includes('beta') ? 'beta' : 'pro';
      const duration = targetPlanId.includes('30') ? 30 : 7;
      const expiry = Date.now() + duration * 24 * 3600 * 1000;

      const notif: AppNotification = {
        id: 'notif_approved_' + Date.now(),
        title: '🎉 Payment Approved in Logger!',
        message: `Payment of ₹${approvedAmount} for ${approvedPlanName} has been approved in Payment Logger. Subscription is active.`,
        timestamp: Date.now(),
        read: false,
        type: 'success',
      };

      const updatedUser: UserProfile = {
        ...user,
        currentPlan: planKey,
        planDuration: duration === 7 ? '7d' : '30d',
        planExpiresAt: expiry,
        notifications: [notif, ...user.notifications],
      };

      handleUpdateUser(updatedUser);
      setToastNotification(notif);
      setTimeout(() => setToastNotification(null), 5000);
    }
  };

  const handleDeclinePaymentLog = (logId: string) => {
    let targetPaymentId: string | undefined;
    let userHandle = '';

    setActivityLogs((prev) =>
      prev.map((log) => {
        if (log.id === logId) {
          targetPaymentId = log.paymentId;
          userHandle = log.userDisplayName || log.username;
          return {
            ...log,
            paymentStatus: 'rejected',
            status: 'failed',
            details: (log.details ? log.details.replace(' • [Status: Approved by Admin in Payment Logger]', '') : '') + ' • [Status: Declined by Admin in Payment Logger]',
          };
        }
        return log;
      })
    );

    if (targetPaymentId) {
      handleRejectPayment(targetPaymentId);
    }

    const notif: AppNotification = {
      id: 'notif_declined_' + Date.now(),
      title: '❌ Payment Declined',
      message: `Payment request for ${userHandle || 'user'} has been declined in Payment Logger.`,
      timestamp: Date.now(),
      read: false,
      type: 'warning',
    };
    setToastNotification(notif);
    setTimeout(() => setToastNotification(null), 5000);
  };

  const handleSaveToOfflineVault = async (item: MediaItem) => {
    try {
      await saveMediaOffline(item);
      const notif: AppNotification = {
        id: 'notif_vault_' + Date.now(),
        title: '💾 Saved to Offline Vault',
        message: `"${item.title}" is now available in your Offline Media Vault for playback without internet.`,
        timestamp: Date.now(),
        read: false,
        type: 'info',
      };
      setToastNotification(notif);
      setTimeout(() => setToastNotification(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#131e33] border border-cyan-500/50 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white">{toastNotification.title}</h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{toastNotification.message}</p>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header & Nav */}
      <Header
        user={user}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenZipModal={() => setIsZipModalOpen(true)}
        onOpenCookieModal={() => setIsCookieModalOpen(true)}
      />

      {/* Page Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'bot' && (
          <TelegramBotFrame
            user={user}
            settings={settings}
            onUpdateUser={handleUpdateUser}
            onSaveToOfflineVault={handleSaveToOfflineVault}
            onNavigateTab={setActiveTab}
            onRecordLog={handleRecordLog}
          />
        )}

        {activeTab === 'downloader' && (
          <DownloaderSection
            user={user}
            settings={settings}
            onUpdateUser={handleUpdateUser}
            onSaveOffline={handleSaveToOfflineVault}
            onNavigatePlans={() => setActiveTab('plans')}
            onRecordLog={handleRecordLog}
          />
        )}

        {activeTab === 'upload' && (
          <UploadSection
            user={user}
            settings={settings}
            onUpdateUser={handleUpdateUser}
            onNavigatePlans={() => setActiveTab('plans')}
            onRecordLog={handleRecordLog}
          />
        )}

        {activeTab === 'offline' && <OfflineManager />}

        {activeTab === 'plans' && (
          <PlansSection
            user={user}
            settings={settings}
            onAddPayment={handleAddPayment}
            onUpdateUser={handleUpdateUser}
            onRecordLog={handleRecordLog}
          />
        )}

        {activeTab === 'referral' && (
          <ReferralSection
            user={user}
            settings={settings}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            payments={payments}
            settings={settings}
            user={user}
            grants={grants}
            onApprovePayment={handleApprovePayment}
            onRejectPayment={handleRejectPayment}
            onUpdateSettings={handleUpdateSettings}
            onUpdateUser={handleUpdateUser}
            onAddGrant={handleAddGrant}
            onRevokeGrant={handleRevokeGrant}
            onNavigateLogger={() => setActiveTab('logger')}
            onNavigateTab={setActiveTab}
            onRecordLog={handleRecordLog}
          />
        )}

        {activeTab === 'logger' && (
          <ActivityLoggerSection
            logs={activityLogs}
            settings={settings}
            onClearLogs={handleClearLogs}
            onResetDemoLogs={handleResetDemoLogs}
            onAddSimulatedLog={handleSimulateLog}
            onApprovePaymentLog={handleApprovePaymentLog}
            onDeclinePaymentLog={handleDeclinePaymentLog}
          />
        )}

        {activeTab === 'code' && (
          <SourceCodeViewer
            settings={settings}
            onOpenZipModal={() => setIsZipModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#060a12] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <p>
            ⚡ <strong>Beta Bot Hub</strong> • TeraBox Media Engine • Stamped with "BETA BOT HUB"
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsCookieModalOpen(true)}
              className="hover:text-cyan-400 transition-colors"
            >
              Cookie Settings
            </button>
            <span>•</span>
            <button
              onClick={() => setIsZipModalOpen(true)}
              className="hover:text-cyan-400 transition-colors"
            >
              Export Bot (.zip)
            </button>
            <span>•</span>
            <a
              href={settings.supportChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition-colors"
            >
              Support Channel
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CookieSettingsModal
        settings={settings}
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
        onSave={handleUpdateSettings}
      />

      <ZipExportModal
        settings={settings}
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
      />
    </div>
  );
}
