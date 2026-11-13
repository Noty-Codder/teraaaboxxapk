import React, { useState } from 'react';
import { 
  Download, 
  Sparkles, 
  Film, 
  Music, 
  Image as ImageIcon, 
  Check, 
  ExternalLink, 
  HardDrive, 
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { UserProfile, BotSettings, MediaItem } from '../types';
import { extractMediaFromUrl, detectSource } from '../services/extractor';
import { PLANS_CONFIG } from '../services/state';

interface DownloaderSectionProps {
  user: UserProfile;
  settings: BotSettings;
  onUpdateUser: (user: UserProfile) => void;
  onSaveOffline: (item: MediaItem) => void;
  onNavigatePlans: () => void;
  onRecordLog?: (log: any) => void;
}

export const DownloaderSection: React.FC<DownloaderSectionProps> = ({
  user,
  settings,
  onUpdateUser,
  onSaveOffline,
  onNavigatePlans,
  onRecordLog,
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MediaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);

  const plan = PLANS_CONFIG[user.currentPlan];
  const isUnlimited = plan.downloadsPerDay === 'unlimited';
  const remaining = isUnlimited ? 9999 : (plan.downloadsPerDay as number) - user.downloadsToday;
  const isExhausted = !isUnlimited && remaining <= 0;

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSavedOffline(false);

    if (!url.trim()) return;

    if (isExhausted) {
      setError(`You have used all ${plan.downloadsPerDay} downloads for today on your ${plan.name}. Please upgrade to Pro or Beta!`);
      return;
    }

    const detected = detectSource(url);
    if (detected === 'unknown') {
      setError('Invalid URL. Supported: terabox.com, 1024tera.com, teraboxapp.com, freeterabox.com');
      return;
    }

    setLoading(true);
    const res = await extractMediaFromUrl(url, settings.teraboxCookie);
    setLoading(false);

    if (res.success && res.item) {
      setResult(res.item);
      // increment downloads
      onUpdateUser({
        ...user,
        downloadsToday: user.downloadsToday + 1,
        totalDownloads: user.totalDownloads + 1,
      });

      if (onRecordLog) {
        onRecordLog({
          type: 'download',
          userId: user.id,
          username: user.username,
          telegramHandle: user.telegramHandle,
          fileTitle: res.item.title,
          fileSize: res.item.size,
          sourcePlatform: res.item.source as any,
          sourceUrl: url,
          downloadUrl: res.item.downloadUrl,
          mediaType: res.item.type,
          autoDeleteAt: res.item.autoDeleteAt,
          status: 'success',
          details: `Direct extraction via Downloader GUI tab (${res.item.source.toUpperCase()})`,
        });
      }
    } else {
      setError(res.error || 'Failed to extract media details.');
    }
  };

  const handleSaveToDevice = (item: MediaItem) => {
    const a = document.createElement('a');
    a.href = item.downloadUrl;
    a.download = item.title;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner with Quota Info */}
      <div className="bg-gradient-to-r from-[#0d1b2a] via-[#10243e] to-[#0d1b2a] rounded-2xl border border-cyan-500/20 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="text-base font-bold text-white tracking-tight">
              TeraBox Direct Downloader
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Cookie Fast Engine
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Paste link to extract streamable direct video, audio, or photo files with Beta Bot Hub watermark.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400">Today's Remaining: </span>
            <strong className="text-cyan-400 font-bold ml-1">
              {isUnlimited ? 'Unlimited (Beta VIP)' : `${remaining} of ${plan.downloadsPerDay}`}
            </strong>
          </div>
          {isExhausted && (
            <button
              id="exhausted-upgrade-btn"
              onClick={onNavigatePlans}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md active:scale-95"
            >
              Upgrade Tier
            </button>
          )}
        </div>
      </div>

      {/* Input Box */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 shadow-xl">
        <form onSubmit={handleExtract} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Enter TeraBox Link:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="downloader-input-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://teraboxapp.com/s/1xyz..."
              required
              className="flex-1 bg-slate-900/90 text-slate-100 placeholder-slate-500 text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <button
              id="downloader-submit-btn"
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Link...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Media</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Supported:</span>
              <span className="font-mono text-cyan-400">teraboxapp.com</span>
              <span>•</span>
              <span className="font-mono text-cyan-400">1024tera.com</span>
              <span>•</span>
              <span className="font-mono text-cyan-400">terabox.com</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Watermarked with "Beta Bot Hub"</span>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-[#0f172a] rounded-2xl border border-cyan-500/40 p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {result.source.toUpperCase()} EXTRACTED
              </span>
              <span className="text-xs text-slate-400">Direct Media Stream</span>
            </div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Ready for Offline / Device Save
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Watermarked Thumbnail */}
            <div className="md:col-span-5 relative rounded-xl overflow-hidden border border-slate-700/80 bg-black/60 shadow-lg group">
              <img
                src={result.watermarkedThumbUrl || result.thumbnailUrl}
                alt={result.title}
                className="w-full aspect-video object-cover"
              />
              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-extrabold text-cyan-300 border border-cyan-500/40 shadow">
                BETA BOT HUB
              </div>
              <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300">
                {result.type === 'video' ? '🎬 Video' : result.type === 'audio' ? '🎵 Audio' : '🖼️ Photo'}
              </div>
            </div>

            {/* Metadata and Actions */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white leading-snug">
                  {result.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>Size: <strong className="text-slate-200">{result.size}</strong></span>
                  {result.resolution && <span>Quality: <strong className="text-cyan-400">{result.resolution}</strong></span>}
                  {result.duration && <span>Duration: <strong className="text-slate-200">{result.duration}</strong></span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  id="result-btn-save-device"
                  onClick={() => handleSaveToDevice(result)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save to Device</span>
                </button>

                <button
                  id="result-btn-save-offline"
                  onClick={() => {
                    onSaveOffline(result);
                    setSavedOffline(true);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                    savedOffline
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  <span>{savedOffline ? '✓ In Offline Vault' : 'Save Offline Vault'}</span>
                </button>
              </div>

              {/* Stream Preview Link */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[240px]">
                  Direct Link: {result.downloadUrl}
                </span>
                <a
                  href={result.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 shrink-0"
                >
                  <span>Direct Stream</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
