import React, { useState } from 'react';
import { 
  Zap, 
  Check, 
  QrCode, 
  Copy, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Sparkles,
  X
} from 'lucide-react';
import { UserProfile, BotSettings, PaymentRequest, PlanType } from '../types';
import { PLANS_CONFIG } from '../services/state';

interface PlansSectionProps {
  user: UserProfile;
  settings: BotSettings;
  onAddPayment: (pay: PaymentRequest) => void;
  onUpdateUser: (user: UserProfile) => void;
  onRecordLog?: (log: any) => void;
}

export const PlansSection: React.FC<PlansSectionProps> = ({
  user,
  settings,
  onAddPayment,
  onUpdateUser,
  onRecordLog,
}) => {
  const [selectedPlanOption, setSelectedPlanOption] = useState<{
    id: 'pro_7d' | 'pro_30d' | 'beta_30d';
    name: string;
    amount: number;
    days: number;
  } | null>(null);

  const [proDuration, setProDuration] = useState<'7d' | '30d'>('7d');
  const [utr, setUtr] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic UPI and 10-minute validity state
  const [activeUpiId, setActiveUpiId] = useState(settings.upiId || 'shivashish0@fam');
  const [isEditingCustomUpi, setIsEditingCustomUpi] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(600); // 10 minutes = 600s
  const [qrExpired, setQrExpired] = useState<boolean>(false);

  // Countdown timer for 10-minute validity
  React.useEffect(() => {
    if (!selectedPlanOption || qrExpired) return;

    const interval = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          setQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedPlanOption, qrExpired]);

  const handleGenerateFreshQr = () => {
    setQrSecondsLeft(600);
    setQrExpired(false);
  };

  const handleSimulateExpiry = () => {
    setQrSecondsLeft(0);
    setQrExpired(true);
  };

  const formatQrTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(activeUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleOpenPayment = (planId: 'pro_7d' | 'pro_30d' | 'beta_30d') => {
    setSubmitted(false);
    setUtr('');
    setProofImage(null);
    setQrSecondsLeft(600);
    setQrExpired(false);
    setActiveUpiId(settings.upiId || 'shivashish0@fam');

    if (planId === 'pro_7d') {
      setSelectedPlanOption({ id: 'pro_7d', name: 'Pro Plan (7 Days)', amount: 15, days: 7 });
    } else if (planId === 'pro_30d') {
      setSelectedPlanOption({ id: 'pro_30d', name: 'Pro Plan (30 Days)', amount: 27, days: 30 });
    } else {
      setSelectedPlanOption({ id: 'beta_30d', name: 'Beta VIP Plan (30 Days)', amount: 69, days: 30 });
    }
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanOption || !utr.trim()) return;

    if (qrExpired) {
      alert('⚠️ This QR code has expired after 10 minutes! Please generate a fresh QR code before submitting payment.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const payment: PaymentRequest = {
        id: 'pay_' + Date.now(),
        userId: user.id,
        userName: user.username,
        telegramHandle: user.telegramHandle,
        planId: selectedPlanOption.id,
        planName: selectedPlanOption.name,
        durationDays: selectedPlanOption.days,
        amount: selectedPlanOption.amount,
        upiIdUsed: activeUpiId,
        utrNumber: utr.trim(),
        proofImageUrl: proofImage || undefined,
        timestamp: Date.now(),
        status: 'pending',
      };

      onAddPayment(payment);

      if (onRecordLog) {
        onRecordLog({
          type: 'plan_purchase',
          userId: user.id,
          username: user.username,
          telegramHandle: user.telegramHandle,
          planId: payment.planId,
          planName: payment.planName,
          planDuration: `${payment.durationDays} Days`,
          amountPaid: payment.amount,
          paymentMethod: 'UPI_QR',
          utrNumber: payment.utrNumber,
          status: 'pending',
          details: `User submitted payment of ₹${payment.amount} (UTR: ${payment.utrNumber}). Awaiting admin verification.`,
        });
      }

      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // UPI payment URL for QR code with dynamic UPI ID
  const getUpiUrl = (amount: number) => {
    return `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(settings.upiName)}&am=${amount}&cu=INR&tn=BetaBotHub_${user.id}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Affordable Multi-Tier Subscriptions</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Choose Your Beta Bot Hub Plan
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Unlock high-speed direct downloads and unlimited link generation with manual UPI approval.
        </p>
      </div>

      {/* Plans Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Free Plan */}
        <div className="bg-[#0f172a] rounded-3xl border border-slate-800 p-6 flex flex-col justify-between shadow-xl relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                🥉 Free Tier
              </span>
              {user.currentPlan === 'free' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Current Plan
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">₹0</span>
                <span className="text-xs text-slate-400">/ forever</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Basic access for everyday casual downloading.
              </p>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-400 shrink-0" />
                <span><strong>3 Downloads</strong> per day (Audio, Video, Photo)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-400 shrink-0" />
                <span><strong>3 Uploads</strong> per day to create link</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Standard download speeds</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Integrated Offline Media Manager</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              disabled
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800/60 text-slate-400 border border-slate-700/60 cursor-default"
            >
              {user.currentPlan === 'free' ? 'Active Plan' : 'Free Default'}
            </button>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="bg-gradient-to-b from-[#111e38] to-[#0f172a] rounded-3xl border-2 border-cyan-500/60 p-6 flex flex-col justify-between shadow-2xl relative shadow-cyan-500/10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
            POPULAR PRO
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                🥈 Pro Tier
              </span>
              {user.currentPlan === 'pro' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Active
                </span>
              )}
            </div>

            {/* Pro Duration Switcher: 7 Days vs 30 Days */}
            <div>
              <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-3">
                <button
                  id="pro-toggle-7d"
                  type="button"
                  onClick={() => setProDuration('7d')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    proDuration === '7d'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  7 Days (₹15)
                </button>
                <button
                  id="pro-toggle-30d"
                  type="button"
                  onClick={() => setProDuration('30d')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    proDuration === '30d'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  30 Days (₹27)
                </button>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  {proDuration === '7d' ? '₹15' : '₹27'}
                </span>
                <span className="text-xs text-cyan-300">
                  / for {proDuration === '7d' ? '7 days' : '30 days'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                High-speed quota for frequent downloads & uploads.
              </p>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-800/80 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span><strong>17 Video Links</strong> to download daily</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span><strong>15 Video Links</strong> to upload daily</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Multi-threaded acceleration</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Watermarked "Beta Bot Hub" Thumbnails</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              id="buy-pro-plan-btn"
              onClick={() => handleOpenPayment(proDuration === '7d' ? 'pro_7d' : 'pro_30d')}
              className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Pay {proDuration === '7d' ? '₹15' : '₹27'} with UPI Scanner</span>
            </button>
          </div>
        </div>

        {/* Beta Plan */}
        <div className="bg-gradient-to-b from-[#261e10] to-[#0f172a] rounded-3xl border-2 border-amber-500/60 p-6 flex flex-col justify-between shadow-2xl relative shadow-amber-500/10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
            UNLIMITED VIP
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                🥇 Beta VIP Tier
              </span>
              {user.currentPlan === 'beta' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Active VIP
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">₹69</span>
                <span className="text-xs text-amber-300">/ per month (30 days)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Unlimited direct downloads and link generation.
              </p>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-800/80 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>♾️ <strong>Unlimited Downloads</strong> (No daily limits)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>♾️ <strong>Unlimited Uploads</strong> to create links</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Ultra-Turbo VIP direct servers</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Zero wait time & offline vault priority</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                ⭐ <strong>Referral Perk:</strong> If your friend buys this Beta plan, you get <strong>7 Days with 17 downloads/uploads free!</strong>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              id="buy-beta-plan-btn"
              onClick={() => handleOpenPayment('beta_30d')}
              className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Pay ₹69 with UPI Scanner</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment / Scanner Modal */}
      {selectedPlanOption && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] rounded-3xl border border-slate-700 max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Pay with UPI Scanner / QR Code
                </h3>
                <p className="text-xs text-cyan-400 font-semibold">
                  {selectedPlanOption.name} • Amount: ₹{selectedPlanOption.amount}
                </p>
              </div>
              <button
                id="close-payment-modal-btn"
                onClick={() => setSelectedPlanOption(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Payment Submitted to Admin!</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                    Your UTR <code className="text-cyan-400 font-mono font-bold">{utr}</code> has been received. Admin will verify and activate your <strong>{selectedPlanOption.name}</strong> within minutes!
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  You can also switch to the <strong>Admin Approval</strong> tab to approve this test payment instantly.
                </div>
                <button
                  onClick={() => setSelectedPlanOption(null)}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-4">
                {/* 10-Minute QR Validity Timer Bar */}
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                  qrExpired 
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' 
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${qrExpired ? 'text-rose-400' : 'text-amber-400'}`} />
                    <span className="font-semibold text-[11px]">
                      {qrExpired ? '⚠️ QR Code Expired (10 Min Ended)' : '⏳ Dynamic QR Valid for 10 Min:'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {formatQrTimer(qrSecondsLeft)}
                    </span>
                    {!qrExpired && (
                      <button
                        type="button"
                        onClick={handleSimulateExpiry}
                        className="text-[10px] text-slate-400 hover:text-white underline decoration-slate-600"
                        title="Simulate 10-minute expiry for testing"
                      >
                        Test Expiry
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Scanner Display with Expired Overlay */}
                <div className="relative bg-white p-4 rounded-2xl max-w-[220px] mx-auto text-center shadow-lg overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(
                      getUpiUrl(selectedPlanOption.amount)
                    )}`}
                    alt="UPI QR Scanner"
                    className={`w-full aspect-square object-contain mx-auto transition-all duration-300 ${
                      qrExpired ? 'blur-sm grayscale opacity-30' : ''
                    }`}
                  />
                  <p className="text-[10px] font-bold text-slate-900 mt-1 uppercase tracking-tight">
                    Scan with GPay / PhonePe / Paytm
                  </p>

                  {/* Expired Overlay */}
                  {qrExpired && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-rose-400 animate-pulse" />
                      <div className="text-[11px] font-bold text-white leading-tight">
                        QR Code Expired
                      </div>
                      <p className="text-[9px] text-slate-300 leading-tight">
                        Valid for 10 min only. Generate a fresh QR to continue.
                      </p>
                      <button
                        type="button"
                        id="regenerate-fresh-qr-btn"
                        onClick={handleGenerateFreshQr}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[10px] flex items-center gap-1 shadow-md active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Regenerate QR</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* UPI ID Field with Custom UPI Option */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Payment Receiver UPI ID:</span>
                      <strong className="text-amber-300 font-mono text-xs">{activeUpiId}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        id="copy-upi-id-btn"
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingCustomUpi(!isEditingCustomUpi)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium"
                      >
                        {isEditingCustomUpi ? 'Close' : 'Custom UPI'}
                      </button>
                    </div>
                  </div>

                  {/* Custom UPI input field */}
                  {isEditingCustomUpi && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5 animate-in fade-in">
                      <label className="block text-[10px] text-slate-400 font-medium">
                        Enter your own UPI ID to generate QR with:
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={activeUpiId}
                          onChange={(e) => {
                            setActiveUpiId(e.target.value);
                            handleGenerateFreshQr();
                          }}
                          placeholder="e.g. yourname@okaxis or 9876543210@paytm"
                          className="flex-1 bg-slate-950 text-amber-300 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs font-mono focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUpiId(settings.upiId || 'shivashish0@fam');
                            handleGenerateFreshQr();
                          }}
                          className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] rounded-lg border border-slate-700"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* UTR Reference Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Enter UTR / Transaction ID (12 Digits) *
                  </label>
                  <input
                    id="payment-utr-input"
                    type="text"
                    required
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 428910827391"
                    className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                {/* Screenshot Upload */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Attach Payment Screenshot (Optional)
                  </label>
                  <input
                    id="payment-proof-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                  />
                </div>

                {/* Submit button */}
                <button
                  id="submit-payment-proof-btn"
                  type="submit"
                  disabled={submitting || !utr.trim()}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 shadow-lg ${
                    qrExpired
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {qrExpired ? 'Regenerate QR Before Submitting' : 'Submit Payment for Admin Approval'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
