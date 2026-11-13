import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Share2, 
  Gift, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { UserProfile, BotSettings, ReferralRecord } from '../types';

interface ReferralSectionProps {
  user: UserProfile;
  settings: BotSettings;
  onUpdateUser: (user: UserProfile) => void;
}

export const ReferralSection: React.FC<ReferralSectionProps> = ({
  user,
  settings,
  onUpdateUser,
}) => {
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([
    {
      id: 'ref_1',
      username: 'Pooja_Sharma',
      joinedAt: Date.now() - 3600000 * 24,
      verified: true,
      boughtBeta: false,
      rewardGranted: true,
    },
    {
      id: 'ref_2',
      username: 'Vikram_Rajput',
      joinedAt: Date.now() - 3600000 * 5,
      verified: true,
      boughtBeta: false,
      rewardGranted: true,
    },
  ]);

  const referralLink = `https://t.me/BetaBotHub?start=${user.referralCode}`;
  const verifiedCount = referrals.filter((r) => r.verified).length;
  const progressToThree = verifiedCount % 3;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simulate a new friend joining via referral and joining the group & channel
  const handleSimulateReferralJoin = () => {
    const friendNumber = referrals.length + 1;
    const newFriend: ReferralRecord = {
      id: 'ref_' + Date.now(),
      username: `Friend_${friendNumber}`,
      joinedAt: Date.now(),
      verified: true,
      boughtBeta: false,
      rewardGranted: false,
    };

    const updatedList = [...referrals, newFriend];
    setReferrals(updatedList);

    const newVerifiedCount = updatedList.filter((r) => r.verified).length;

    // Check if reached 3 referrals
    if (newVerifiedCount % 3 === 0) {
      // 1 day pro pass unlocked
      const newExpiry = Date.now() + 24 * 3600 * 1000;
      const updatedUser: UserProfile = {
        ...user,
        currentPlan: 'pro',
        planDuration: 'daily_pass',
        planExpiresAt: newExpiry,
        rewardPassExpiresAt: newExpiry,
        notifications: [
          {
            id: 'notif_' + Date.now(),
            title: '🎉 1-Day Premium Pass Unlocked!',
            message: `You have successfully unlocked your one-day premium access pass because your friend ${newFriend.username} joined by your referral link and verified their account!`,
            timestamp: Date.now(),
            read: false,
            type: 'success',
          },
          ...user.notifications,
        ],
      };
      onUpdateUser(updatedUser);
    }
  };

  // Simulate friend buying beta plan
  const handleSimulateFriendBuyingBeta = () => {
    // Referrer gets 7 days pro access with 17 downloads/uploads
    const newExpiry = Date.now() + 7 * 24 * 3600 * 1000;
    const updatedUser: UserProfile = {
      ...user,
      currentPlan: 'pro',
      planDuration: '7d',
      planExpiresAt: newExpiry,
      betaReferralBonusGranted: true,
      notifications: [
        {
          id: 'notif_beta_bonus_' + Date.now(),
          title: '🌟 Mega Referral Reward: 7 Days Free Access!',
          message: 'One of your referred users just purchased the Beta VIP plan! You have unlocked 7-Day access with 17 free daily downloads & 15 uploads!',
          timestamp: Date.now(),
          read: false,
          type: 'promo',
        },
        ...user.notifications,
      ],
    };
    onUpdateUser(updatedUser);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#240e1d] via-[#331329] to-[#240e1d] rounded-2xl border border-pink-500/30 p-6 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Refer & Earn Free Access Passes
            </h2>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-wider">
            Verified Program
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Invite new users to Beta Bot Hub. For every <strong>3 friends</strong> who join via your link and verify by joining our official group and support link, you automatically receive a <strong>1-Day Premium Access Pass</strong>!
        </p>

        {/* Mega Referral Perk Box */}
        <div className="p-3.5 rounded-xl bg-pink-950/60 border border-pink-500/40 text-xs text-pink-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block font-bold mb-0.5">🌟 Special Beta VIP Referral Perk:</strong>
            If any user who joined through your referral link buys the <strong>Beta Premium Plan (₹69)</strong>, you instantly receive <strong>7-Day access with 17 downloads and 15 uploads free!</strong>
          </div>
        </div>
      </div>

      {/* Your Referral Link Card */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Your Unique Telegram Referral Link:
        </h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            id="user-referral-link-input"
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 bg-slate-900/90 text-cyan-300 font-mono text-xs px-4 py-3 rounded-xl border border-slate-700 select-all"
          />
          <button
            id="copy-referral-link-btn"
            onClick={handleCopy}
            className="px-4 py-3 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <a
            id="share-referral-telegram-btn"
            href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join%20Beta%20Bot%20Hub%20for%20Fast%20TeraBox%20Downloads!`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center gap-1.5 transition-all shadow active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share on Telegram</span>
          </a>
        </div>

        {/* Verification Conditions */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5 text-xs">
          <span className="font-bold text-slate-300 block">Strict Referral Conditions:</span>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Referred friend must join our <strong>Community Group</strong> & <strong>Support Channel</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Only <strong>NEW users</strong> are valid for referral tracking</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Referrer is immediately notified in Telegram when friend verifies account</span>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Progress to Next 1-Day Pass:</span>
            <strong className="text-pink-400 font-bold">{progressToThree} / 3 Referrals</strong>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-3 transition-all duration-300"
              style={{ width: `${(progressToThree / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Simulator Actions for Testing & Demonstration */}
      <div className="bg-[#111a2e] rounded-2xl border border-cyan-500/30 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            🧪 Interactive Referral Testing Simulator
          </h4>
          <span className="text-[10px] text-slate-400">Test the referral & notification flow</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            id="test-sim-referral-join"
            onClick={handleSimulateReferralJoin}
            className="px-4 py-2 text-xs font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-xl transition-all active:scale-95"
          >
            + Simulate 1 Friend Join & Verify
          </button>
          <button
            id="test-sim-friend-beta"
            onClick={handleSimulateFriendBuyingBeta}
            className="px-4 py-2 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl transition-all active:scale-95"
          >
            ⭐ Simulate Friend Buying Beta (Unlock 7 Days)
          </button>
        </div>
      </div>

      {/* Referral History List */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Your Verified Referrals ({referrals.length})
        </h4>

        <div className="divide-y divide-slate-800">
          {referrals.map((r) => (
            <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-cyan-400">
                  {r.username.charAt(0)}
                </div>
                <div>
                  <strong className="text-slate-200">@{r.username}</strong>
                  <span className="text-[10px] text-slate-500 block">
                    Joined {new Date(r.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  ✓ Joined & Verified
                </span>
                {r.boughtBeta && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    ⭐ Bought Beta
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
