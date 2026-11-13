import React, { useState } from 'react';
import { X, Cookie, Check, Key, RefreshCw, Zap } from 'lucide-react';
import { BotSettings } from '../types';

interface CookieSettingsModalProps {
  settings: BotSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: BotSettings) => void;
}

export const CookieSettingsModal: React.FC<CookieSettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [cookieVal, setCookieVal] = useState(settings.teraboxCookie);
  const [watermarkVal, setWatermarkVal] = useState(settings.watermarkText);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...settings,
      teraboxCookie: cookieVal.trim(),
      watermarkText: watermarkVal.trim(),
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] rounded-3xl border border-slate-700 max-w-xl w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Cookie className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">TeraBox API & Cookies</h3>
              <p className="text-xs text-slate-400">TeraBox cookie session & watermark</p>
            </div>
          </div>
          <button
            id="close-cookie-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fallback Architecture Badge */}
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-cyan-300">TeraBox Engine:</p>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              When a user sends a <b>TeraBox</b> link, the bot uses your TeraBox <b>ndus</b> cookie to extract the direct stream.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* TeraBox Cookies */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <label className="block text-xs font-bold text-cyan-300">
              TeraBox Cookies (ndus value):
            </label>
            <textarea
              rows={2}
              value={cookieVal}
              onChange={(e) => setCookieVal(e.target.value)}
              placeholder="ndus=Y0V4..."
              className="w-full bg-slate-950 font-mono text-xs px-3.5 py-2 rounded-xl border border-slate-700 text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-400">
              Authentication cookie header for TeraBox cloud stream extraction.
            </p>
          </div>

          {/* Watermark */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Video Thumbnail Watermark:
            </label>
            <input
              type="text"
              value={watermarkVal}
              onChange={(e) => setWatermarkVal(e.target.value)}
              className="w-full bg-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 text-white font-bold focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-400">
              Stamped automatically on every video thumbnail processed by the bot.
            </p>
          </div>

          {saved && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Cookies & Watermark saved!</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              id="save-cookie-modal-btn"
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Save Credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
