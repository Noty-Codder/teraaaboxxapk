import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  X, 
  Clock, 
  DollarSign, 
  Users, 
  Settings, 
  Eye, 
  Key, 
  Save, 
  AlertCircle,
  Crown,
  Calendar,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Terminal,
  Radio,
  Send,
  BellRing,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { PaymentRequest, BotSettings, UserProfile, PremiumGrantRecord, PlanType, AppNotification } from '../types';

interface AdminPanelProps {
  payments: PaymentRequest[];
  settings: BotSettings;
  user: UserProfile;
  grants?: PremiumGrantRecord[];
  onApprovePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onUpdateSettings: (settings: BotSettings) => void;
  onUpdateUser?: (updated: UserProfile) => void;
  onAddGrant?: (grant: PremiumGrantRecord) => void;
  onRevokeGrant?: (grantId: string) => void;
  onNavigateLogger?: () => void;
  onNavigateTab?: (tab: string) => void;
  onRecordLog?: (log: any) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  payments,
  settings,
  user,
  grants = [],
  onApprovePayment,
  onRejectPayment,
  onUpdateSettings,
  onUpdateUser,
  onAddGrant,
  onRevokeGrant,
  onNavigateLogger,
  onNavigateTab,
  onRecordLog,
}) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'manual_premium' | 'broadcast' | 'settings'>('payments');
  const [editingSettings, setEditingSettings] = useState<BotSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Broadcast & Expiry Alert State
  const [broadcastTitle, setBroadcastTitle] = useState('🔥 Flash Upgrade Offer — Unlimited Downloads');
  const [broadcastBody, setBroadcastBody] = useState('Supercharge your daily limits! Get instant access to Beta VIP unlimited TeraBox extraction with zero queue time. Tap below to renew or upgrade your plan.');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'free' | 'pro' | 'beta'>('all');
  const [broadcastMediaType, setBroadcastMediaType] = useState<'text' | 'photo' | 'alert'>('alert');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [broadcastResult, setBroadcastResult] = useState<{
    total: number;
    delivered: number;
    blocked: number;
    duration: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [testAlertSent, setTestAlertSent] = useState(false);

  // Manual Premium Form State
  const [targetUserId, setTargetUserId] = useState(user.id);
  const [targetUsername, setTargetUsername] = useState(user.username);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('beta');
  const [durationType, setDurationType] = useState<'days' | 'months' | 'years'>('months');
  const [durationValue, setDurationValue] = useState<number>(1);
  const [grantNote, setGrantNote] = useState('Authorized by Master Admin');
  const [grantSuccessMsg, setGrantSuccessMsg] = useState<string | null>(null);

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const pastPayments = payments.filter((p) => p.status !== 'pending');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(editingSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleGrantPremium = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;

    let totalDays = durationValue;
    let durationLabel = `${durationValue} Days`;

    if (durationType === 'months') {
      totalDays = durationValue * 30;
      durationLabel = durationValue === 1 ? '1 Month (30 Days)' : `${durationValue} Months (${totalDays} Days)`;
    } else if (durationType === 'years') {
      totalDays = durationValue * 365;
      durationLabel = durationValue === 1 ? '1 Year (365 Days)' : `${durationValue} Years`;
    }

    const expiresAt = Date.now() + totalDays * 24 * 3600 * 1000;

    const newGrant: PremiumGrantRecord = {
      id: 'grant_' + Date.now(),
      userId: targetUserId.trim(),
      username: targetUsername.trim() || 'User_' + targetUserId.slice(-4),
      plan: selectedPlan,
      durationLabel,
      durationDays: totalDays,
      grantedBy: 'Owner / Master Admin',
      grantedAt: Date.now(),
      expiresAt,
      note: grantNote.trim(),
    };

    if (onAddGrant) {
      onAddGrant(newGrant);
    }

    // If target is current active user, update their live profile
    if (targetUserId.trim() === user.id && onUpdateUser) {
      onUpdateUser({
        ...user,
        currentPlan: selectedPlan,
        planDuration: totalDays <= 7 ? '7d' : '30d',
        planExpiresAt: expiresAt,
        notifications: [
          {
            id: 'notif_manual_grant_' + Date.now(),
            title: `👑 ${selectedPlan.toUpperCase()} Plan Granted!`,
            message: `Master Admin granted you ${durationLabel} of ${selectedPlan.toUpperCase()} access. Expiry: ${new Date(expiresAt).toLocaleDateString()}`,
            timestamp: Date.now(),
            read: false,
            type: 'promo',
          },
          ...user.notifications,
        ],
      });
    }

    setGrantSuccessMsg(`✅ Successfully granted ${selectedPlan.toUpperCase()} plan (${durationLabel}) to User ${targetUserId}!`);
    setTimeout(() => setGrantSuccessMsg(null), 4000);
  };

  const handleQuickFillMe = () => {
    setTargetUserId(user.id);
    setTargetUsername(user.username);
  };

  const handleQuickRevokeUser = () => {
    if (targetUserId.trim() === user.id && onUpdateUser) {
      onUpdateUser({
        ...user,
        currentPlan: 'free',
        planDuration: null,
        planExpiresAt: null,
        notifications: [
          {
            id: 'notif_revoked_' + Date.now(),
            title: '⚠️ Subscription Reset to Free',
            message: 'Your premium subscription was modified or reset to Free tier by Admin.',
            timestamp: Date.now(),
            read: false,
            type: 'warning',
          },
          ...user.notifications,
        ],
      });
      setGrantSuccessMsg(`User ${targetUserId} has been downgraded back to Free tier.`);
      setTimeout(() => setGrantSuccessMsg(null), 3500);
    }
  };

  const totalRevenue = payments
    .filter((p) => p.status === 'approved')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-[#1c121e] via-[#2a172c] to-[#1c121e] rounded-2xl border border-rose-500/30 p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Beta Bot Hub Admin Control Center
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Owner & Master Admin
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Verify UPI payments, manually grant premium (Day/Month/Year), manage watermarks, and control Telegram bot settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400">Pending UTRs: </span>
            <strong className="text-rose-400 font-bold ml-1">{pendingPayments.length}</strong>
            <span className="text-slate-600 mx-2">|</span>
            <span className="text-slate-400">Total Rev: </span>
            <strong className="text-emerald-400 font-bold ml-1">₹{totalRevenue}</strong>
          </div>

          {onNavigateLogger && (
            <button
              id="admin-btn-open-logger"
              onClick={onNavigateLogger}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>📜 Open Live Logger</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto no-scrollbar">
        <button
          id="admin-tab-payments"
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>UPI Payment Approvals ({pendingPayments.length})</span>
        </button>

        <button
          id="admin-tab-manual-premium"
          onClick={() => setActiveTab('manual_premium')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'manual_premium'
              ? 'border-amber-500 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>👑 Manual Premium Grant (Day / Month / Year)</span>
        </button>

        <button
          id="admin-tab-broadcast"
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'broadcast'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>📢 Broadcast & Expiry Alerts</span>
        </button>

        <button
          id="admin-tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Bot Cookies, UPI & Limits</span>
        </button>
      </div>

      {/* Tab 1: Payment Verification Queue */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Pending Approvals ({pendingPayments.length})</span>
            </h3>

            {pendingPayments.length === 0 ? (
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-8 text-center text-xs text-slate-400">
                🎉 No pending payments in queue! All UTR submissions have been processed.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#0f172a] rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{p.userName}</span>
                        <span className="text-slate-400 text-xs font-mono">{p.telegramHandle}</span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] uppercase">
                          {p.planName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                        <span>
                          Amount: <strong className="text-emerald-400 font-bold font-mono">₹{p.amount}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          UTR: <code className="text-cyan-400 font-bold font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{p.utrNumber}</code>
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(p.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {p.proofImageUrl && (
                        <div className="mt-2">
                          <a
                            href={p.proofImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Attached Payment Screenshot</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id={`approve-pay-${p.id}`}
                        onClick={() => onApprovePayment(p.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve & Activate</span>
                      </button>
                      <button
                        id={`reject-pay-${p.id}`}
                        onClick={() => onRejectPayment(p.id)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Payments History */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recent Processed History ({pastPayments.length})
            </h3>
            <div className="space-y-2">
              {pastPayments.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        p.status === 'approved' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <span className="font-semibold text-slate-200">{p.userName}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{p.planName}</span>
                    <span className="text-slate-400 font-mono text-[11px]">UTR: {p.utrNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white">₹{p.amount}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Manual Premium Grant (Owner & Admin) */}
      {activeTab === 'manual_premium' && (
        <div className="space-y-6">
          <div className="bg-[#0f172a] rounded-2xl border border-amber-500/30 p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Direct Manual Premium Granter</h3>
                  <p className="text-xs text-slate-400">
                    Owner and admins can manually assign <strong>Pro</strong> or <strong>Beta VIP</strong> for 
                    <strong>Day(s)</strong>, <strong>Month(s)</strong>, or <strong>Year(s)</strong> directly.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickFillMe}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Target currently active preview user"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Target Current User ({user.id})</span>
              </button>
            </div>

            {grantSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{grantSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleGrantPremium} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target User ID */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Target Telegram User ID *
                  </label>
                  <input
                    id="admin-grant-userid"
                    type="text"
                    required
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="e.g. 748291 or 123456789"
                    className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Target Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Target Username / Display Name
                  </label>
                  <input
                    id="admin-grant-username"
                    type="text"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    placeholder="e.g. Aakash_Tele"
                    className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Select Plan */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Subscription Plan Tier *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('pro')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedPlan === 'pro'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>🥈 Pro Plan</span>
                      <span className="text-[11px] font-mono">17 DL / 15 UL daily</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">High speed multi-thread downloading</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('beta')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedPlan === 'beta'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>🥇 Beta VIP Plan</span>
                      <span className="text-[11px] font-mono text-amber-400">♾️ Unlimited DL & UL</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Ultra Turbo VIP servers + Priority queue</p>
                  </button>
                </div>
              </div>

              {/* Select Duration: Day / Month / Year */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Select Duration Type & Value *</span>
                  <span className="text-[11px] text-amber-400">
                    Day(s), Month(s) or Year(s)
                  </span>
                </label>

                {/* Duration Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDurationType('days');
                      setDurationValue(7);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      durationType === 'days'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    📅 Days (1 - 30)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDurationType('months');
                      setDurationValue(1);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      durationType === 'months'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    🗓️ Month(s) (1 - 12)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDurationType('years');
                      setDurationValue(1);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      durationType === 'years'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    👑 Year(s) (1 - 5)
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {durationType === 'days' && (
                    <>
                      {[1, 3, 7, 14, 21, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDurationValue(d)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                            durationValue === d
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {d} {d === 1 ? 'Day' : 'Days'}
                        </button>
                      ))}
                    </>
                  )}

                  {durationType === 'months' && (
                    <>
                      {[1, 2, 3, 6, 12].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDurationValue(m)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                            durationValue === m
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {m} {m === 1 ? 'Month' : 'Months'}
                        </button>
                      ))}
                    </>
                  )}

                  {durationType === 'years' && (
                    <>
                      {[1, 2, 3, 5].map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setDurationValue(y)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                            durationValue === y
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {y} {y === 1 ? 'Year' : 'Years'}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Admin Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Grant Reason / Audit Log Note
                </label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="e.g. VIP Giveaway / Support Agent / Manual UPI transfer received"
                  className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="admin-submit-grant-btn"
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Crown className="w-4 h-4" />
                  <span>
                    Grant {selectedPlan.toUpperCase()} Plan ({durationValue} {durationType}) Instantly
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickRevokeUser}
                  className="px-4 py-3 rounded-xl font-bold text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 active:scale-95 transition-colors"
                  title="Downgrade user back to free"
                >
                  <X className="w-4 h-4" />
                  <span>Revoke / Reset to Free</span>
                </button>
              </div>
            </form>
          </div>

          {/* Past Grants Table */}
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Manual Premium Grants Audit Log ({grants.length})</span>
            </h4>

            {grants.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No manual grants recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {grants.map((g) => (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{g.username}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({g.userId})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          g.plan === 'beta' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {g.plan}
                        </span>
                        <span className="text-slate-400 font-medium">Duration: {g.durationLabel}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Granted by {g.grantedBy} • Note: {g.note || 'None'} • Expires:{' '}
                        {g.expiresAt ? new Date(g.expiresAt).toLocaleDateString() : 'Never'}
                      </div>
                    </div>

                    {onRevokeGrant && (
                      <button
                        onClick={() => onRevokeGrant(g.id)}
                        className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium"
                      >
                        Remove Log
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Settings Config */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Admin UPI ID for Auto-Generated 10-Minute QR:
              </label>
              <input
                id="admin-settings-upi-id"
                type="text"
                value={editingSettings.upiId}
                onChange={(e) => setEditingSettings({ ...editingSettings, upiId: e.target.value })}
                className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-amber-300 font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Watermark Stamp Text on Video Thumbnails:
              </label>
              <input
                id="admin-settings-watermark-text"
                type="text"
                value={editingSettings.watermarkText}
                onChange={(e) => setEditingSettings({ ...editingSettings, watermarkText: e.target.value })}
                className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-cyan-300 font-bold focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Support Channel Telegram Link:
              </label>
              <input
                id="admin-settings-channel"
                type="text"
                value={editingSettings.supportChannelUrl}
                onChange={(e) => setEditingSettings({ ...editingSettings, supportChannelUrl: e.target.value })}
                className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Community Group Telegram Link:
              </label>
              <input
                id="admin-settings-group"
                type="text"
                value={editingSettings.groupJoinUrl}
                onChange={(e) => setEditingSettings({ ...editingSettings, groupJoinUrl: e.target.value })}
                className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Dynamic QR Validity Window (Minutes):
              </label>
              <input
                id="admin-settings-qr-expiry"
                type="number"
                value={editingSettings.qrExpiryMinutes || 10}
                onChange={(e) => setEditingSettings({ ...editingSettings, qrExpiryMinutes: parseInt(e.target.value) || 10 })}
                className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Media Auto-Delete Timer (Minutes):
              </label>
              <input
                id="admin-settings-auto-delete"
                type="number"
                value={editingSettings.mediaAutoDeleteMinutes || 5}
                onChange={(e) => setEditingSettings({ ...editingSettings, mediaAutoDeleteMinutes: parseInt(e.target.value) || 5 })}
                className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-xs text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  3 Dedicated Telegram Logger Groups (Group / Supergroup IDs):
                </strong>
                <span className="text-[10px] text-cyan-400 font-mono">Real-time Group Logging</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-emerald-400">
                    1. Activity Log Group ID:
                  </label>
                  <input
                    id="admin-settings-logger-channel"
                    type="text"
                    value={editingSettings.logGroupId || editingSettings.logChannelId || ''}
                    placeholder="-1001928374651"
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingSettings({ ...editingSettings, logGroupId: val, logChannelId: val });
                    }}
                    className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">Group ID for User Starts & Stats</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-amber-400">
                    2. Payment Log Group ID:
                  </label>
                  <input
                    id="admin-settings-payment-logger-channel"
                    type="text"
                    value={editingSettings.paymentLogGroupId || editingSettings.paymentLogChannelId || ''}
                    placeholder="-1002019283741"
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingSettings({ ...editingSettings, paymentLogGroupId: val, paymentLogChannelId: val });
                    }}
                    className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500">Group ID for UTR, QR & Plans</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-cyan-400">
                    3. Data Log Group ID (DL & UL):
                  </label>
                  <input
                    id="admin-settings-error-logger-channel"
                    type="text"
                    value={editingSettings.dataLogGroupId || editingSettings.dataLogChannelId || editingSettings.errorLogChannelId || ''}
                    placeholder="-1002198374102"
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingSettings({
                        ...editingSettings,
                        dataLogGroupId: val,
                        dataLogChannelId: val,
                        errorLogChannelId: val,
                      });
                    }}
                    className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-400">Download & Upload media data</p>
                </div>
              </div>
            </div>
          </div>

          {/* TeraBox Cookie String */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>TeraBox Cookie (ndus header):</span>
              <span className="text-[10px] text-cyan-400 font-normal">Used by bot to bypass limits & extract direct stream links</span>
            </label>
            <textarea
              id="admin-settings-cookie"
              rows={3}
              value={editingSettings.teraboxCookie}
              onChange={(e) => setEditingSettings({ ...editingSettings, teraboxCookie: e.target.value })}
              className="w-full bg-slate-900 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-300 focus:outline-none focus:border-rose-500"
            />
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          <button
            id="admin-save-settings-btn"
            type="submit"
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 transition-colors active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </form>
      )}

      {/* Tab 4: Broadcast & Premium Expiry Alerts */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Owner & Admin Broadcast & Expiry Alert Center
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                    ADMINS ONLY
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Broadcast instant announcements to all registered Telegram bot users, and simulate automated expiry alerts with interactive <b>"Renew Now"</b> buttons.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                Registered Bot Users: <strong className="text-cyan-400">1,280</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Broadcast Dispatcher */}
            <div className="lg:col-span-7 bg-[#0b1322] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <span>Send Broadcast Announcement</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Owner & Admin Privilege
                </span>
              </div>

              {/* Target Audience Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Recipient Segment:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: 'All Users', count: '1,280' },
                    { id: 'free', label: 'Free Tier', count: '940' },
                    { id: 'pro', label: 'Pro Plan', count: '210' },
                    { id: 'beta', label: 'Beta VIP', count: '130' },
                  ].map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setBroadcastTarget(seg.id as any)}
                      className={`px-3 py-2 rounded-xl text-left border transition-all ${
                        broadcastTarget === seg.id
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{seg.label}</div>
                      <div className="text-[10px] text-slate-400">{seg.count} Users</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Broadcast Headline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Announcement Headline:
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Flash Upgrade Sale — 50% Off Pro Plan"
                  className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              {/* Broadcast Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Body (HTML formatting supported):
                </label>
                <textarea
                  rows={4}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Write your announcement here..."
                  className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 font-normal leading-relaxed"
                />
              </div>

              {/* Format / Call to Action */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Included Action:</span>
                <span className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                  💎 [View Plans & Pricing] + 💬 [Support Group]
                </span>
              </div>

              {/* Dispatch Progress / Simulation */}
              {isBroadcasting && (
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-cyan-300">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Broadcasting in progress with anti-floodwait throttling...
                    </span>
                    <strong className="font-mono">{broadcastProgress}%</strong>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${broadcastProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Target: {broadcastTarget.toUpperCase()}</span>
                    <span>Delivered: {Math.round((broadcastProgress / 100) * 1280)} / 1,280</span>
                  </div>
                </div>
              )}

              {/* Result Summary */}
              {broadcastResult && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Broadcast Successfully Dispatched to Registered Users!</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-slate-300 font-mono text-[11px]">
                    <div>Delivered: <strong className="text-emerald-400">{broadcastResult.delivered}</strong></div>
                    <div>Blocked: <strong className="text-rose-400">{broadcastResult.blocked}</strong></div>
                    <div>Duration: <strong className="text-cyan-400">{broadcastResult.duration}</strong></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  id="admin-btn-dispatch-broadcast"
                  type="button"
                  disabled={isBroadcasting || !broadcastBody.trim()}
                  onClick={() => {
                    setIsBroadcasting(true);
                    setBroadcastResult(null);
                    setBroadcastProgress(0);

                    let prog = 0;
                    const interval = setInterval(() => {
                      prog += 20;
                      if (prog <= 100) {
                        setBroadcastProgress(prog);
                      }
                      if (prog >= 100) {
                        clearInterval(interval);
                        setIsBroadcasting(false);
                        const result = {
                          total: 1280,
                          delivered: 1268,
                          blocked: 12,
                          duration: '2.8s',
                        };
                        setBroadcastResult(result);

                        if (onRecordLog) {
                          onRecordLog({
                            type: 'broadcast',
                            userId: user.id,
                            username: user.username,
                            status: 'success',
                            details: `Admin broadcast dispatched to ${broadcastTarget.toUpperCase()} users (${result.delivered} delivered, ${result.blocked} blocked)`,
                          });
                        }
                      }
                    }, 400);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 transition-all shadow-md shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isBroadcasting ? 'Broadcasting...' : '📢 Dispatch Broadcast Now'}</span>
                </button>
              </div>

              {/* Telegram Bot Command Cheat Sheet */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>How to Broadcast directly inside Telegram:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`/broadcast ${broadcastTitle} - ${broadcastBody}`);
                      setCopiedCode('cmd');
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedCode === 'cmd' ? 'Copied!' : 'Copy /broadcast'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                  <p className="text-cyan-300"># Method 1: Text command (Strictly Owner/Admin IDs only)</p>
                  <p className="text-amber-300">/broadcast &lt;your message here&gt;</p>
                  <p className="text-cyan-300 pt-1"># Method 2: Reply to any photo, video, or post</p>
                  <p className="text-slate-400">Reply to any media message with: <span className="text-amber-300">/broadcast</span></p>
                  <p className="text-slate-500 text-[10px] italic">Non-admin users will immediately receive an Access Denied rejection.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Automated Subscription Expiry Watcher & "Renew Now" Engine */}
            <div className="lg:col-span-5 space-y-5">
              {/* Expiry Engine Info Card */}
              <div className="bg-[#0b1322] border border-amber-500/30 rounded-2xl p-5 space-y-3.5 shadow-md">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-amber-400" />
                    <span>Auto Expiry Alert & Renew Now Engine</span>
                  </h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The Python bot's background loop (<code>schedule_subscription_expiry_watcher</code>) monitors users 24/7. When a premium subscription is expiring within 24 hours or has expired, it automatically sends this exact notification with a <b>"Renew Now"</b> button!
                </p>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Requested Workflow Guaranteed:</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    1. Bot sends alert: <i>"Aapka premium expire hone wala hai, renew now karein!"</i><br />
                    2. User clicks <b>"🔄 Renew Now (रिन्यू करें)"</b>.<br />
                    3. Bot immediately displays the <b>Plan selection menu</b> (₹15 / ₹27 / ₹69).<br />
                    4. User selects plan ➔ Generates 10-min UPI QR (<code>shivashish0@fam</code>) ➔ Standard verification!
                  </p>
                </div>
              </div>

              {/* Live Interactive Notification Card (What the user receives) */}
              <div className="bg-[#0f172a] border-2 border-amber-500/50 rounded-2xl p-4 space-y-3 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>TELEGRAM BOT INCOMING MESSAGE PREVIEW</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">12:30 PM</span>
                </div>

                <div className="space-y-2 text-xs text-slate-200">
                  <p className="font-bold text-amber-300 text-sm">
                    ⚠️ Subscription Expiry Alert / रिन्यूअल सूचना
                  </p>
                  <p className="leading-relaxed text-slate-300 text-[11px]">
                    Hello <b>@{user.username}</b>, aapka <b>{user.currentPlan.toUpperCase()}</b> subscription agle <b>24 ghante ke andar expire</b> hone wala hai!
                  </p>
                  <p className="leading-relaxed text-slate-300 text-[11px]">
                    High-speed unlimited downloads aur turbo link creation continue rakhne ke liye abhi apna plan renew karein:
                  </p>
                </div>

                {/* Interactive Inline Buttons */}
                <div className="space-y-1.5 pt-1">
                  <button
                    id="admin-btn-test-renew-now"
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) {
                        onNavigateTab('plans');
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                    title="Clicking this opens the Plan Selection and UPI QR Flow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>🔄 Renew Now (रिन्यू करें) — Click to Test Plan Flow</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onNavigateTab && onNavigateTab('plans')}
                      className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>💎 View All Plans</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTab && onNavigateTab('bot')}
                      className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      <span>🤖 Bot Simulator</span>
                    </button>
                  </div>
                </div>

                {/* Dispatch Test Alert to User */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    id="admin-btn-dispatch-test-expiry-alert"
                    type="button"
                    onClick={() => {
                      if (onUpdateUser) {
                        const testNotif: AppNotification = {
                          id: 'expiry_alert_' + Date.now(),
                          title: '⚠️ Subscription Expiry Alert',
                          message: `Your ${user.currentPlan.toUpperCase()} plan is expiring soon. Click to renew your subscription!`,
                          timestamp: Date.now(),
                          read: false,
                          type: 'warning',
                        };
                        onUpdateUser({
                          ...user,
                          notifications: [testNotif, ...user.notifications],
                        });
                        setTestAlertSent(true);
                        setTimeout(() => setTestAlertSent(false), 3000);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-400" />
                    <span>{testAlertSent ? '✅ Alert Sent to Account!' : '📲 Send Test Expiry Warning to My Account'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
