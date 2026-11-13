import React, { useState } from 'react';
import { X, FolderArchive, Download, Check, Sparkles, Terminal } from 'lucide-react';
import { generateBotZip, triggerBlobDownload } from '../services/zipExporter';
import { BotSettings } from '../types';

interface ZipExportModalProps {
  settings: BotSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ZipExportModal: React.FC<ZipExportModalProps> = ({
  settings,
  isOpen,
  onClose,
}) => {
  const [botToken, setBotToken] = useState('7182910294:AAHv8_YOUR_BOT_TOKEN');
  const [apiId, setApiId] = useState('24910283');
  const [apiHash, setApiHash] = useState('9f81a7b82c19e34810a9c8e19');
  const [adminIds, setAdminIds] = useState('123456789');
  const [channelUsername, setChannelUsername] = useState('@BetaBotHubSupport');
  const [groupUsername, setGroupUsername] = useState('@BetaBotHubCommunity');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const blob = await generateBotZip({
        API_ID: apiId,
        API_HASH: apiHash,
        BOT_TOKEN: botToken,
        ADMIN_IDS: adminIds,
        CHANNEL_USERNAME: channelUsername,
        GROUP_USERNAME: groupUsername,
        UPI_ID: settings.upiId || 'shivashish0@fam',
        UPI_NAME: settings.upiName || 'Shivashish Official',
        TERABOX_COOKIE: settings.teraboxCookie,
        WATERMARK_TEXT: settings.watermarkText,
        LOG_GROUP_ID: settings.logGroupId || settings.logChannelId || '-1001928374651',
        PAYMENT_LOG_GROUP_ID: settings.paymentLogGroupId || settings.paymentLogChannelId || '-1002019283741',
        DATA_LOG_GROUP_ID: settings.dataLogGroupId || settings.dataLogChannelId || settings.errorLogChannelId || '-1002198374102',
        LOG_CHANNEL_ID: settings.logGroupId || settings.logChannelId || '-1001928374651',
        PAYMENT_LOG_CHANNEL: settings.paymentLogGroupId || settings.paymentLogChannelId || '-1002019283741',
        DATA_LOG_CHANNEL: settings.dataLogGroupId || settings.dataLogChannelId || '-1002198374102',
        ERROR_LOG_CHANNEL: settings.dataLogGroupId || settings.dataLogChannelId || settings.errorLogChannelId || '-1002198374102',
      });

      triggerBlobDownload(blob, 'BetaBotHub_Telegram_Bot.zip');
      setDownloaded(true);
      setTimeout(() => {
        setIsGenerating(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] rounded-3xl border border-cyan-500/40 max-w-xl w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Download Telegram Bot ZIP Archive
              </h3>
              <p className="text-xs text-cyan-400 font-semibold">
                Production Pyrogram Bot Package (.zip)
              </p>
            </div>
          </div>
          <button
            id="close-zip-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          This ZIP contains the complete asynchronous Python Telegram Bot with all requested features:
          TeraBox downloaders, file-to-link generator, watermarked video thumbnails ("BETA BOT HUB"),
          Free/Pro/Beta daily limits, referral engine with force-join checks, UPI scanner payment approval,
          and Docker setup.
        </p>

        <form onSubmit={handleDownload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Telegram BOT_TOKEN:
              </label>
              <input
                type="text"
                required
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Telegram API_ID:
              </label>
              <input
                type="text"
                required
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
                className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Telegram API_HASH:
              </label>
              <input
                type="text"
                required
                value={apiHash}
                onChange={(e) => setApiHash(e.target.value)}
                className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Admin User ID(s):
              </label>
              <input
                type="text"
                required
                value={adminIds}
                onChange={(e) => setAdminIds(e.target.value)}
                placeholder="123456789, 987654321"
                className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Channel Username (Force Join):
              </label>
              <input
                type="text"
                value={channelUsername}
                onChange={(e) => setChannelUsername(e.target.value)}
                className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Group Username (Force Join):
              </label>
              <input
                type="text"
                value={groupUsername}
                onChange={(e) => setGroupUsername(e.target.value)}
                className="w-full bg-slate-900 font-mono text-xs px-3 py-2 rounded-xl border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Files inside ZIP: <code>bot.py</code>, <code>config.py</code>, <code>database.py</code>, <code>terabox_downloader.py</code>, <code>watermark_engine.py</code>, <code>requirements.txt</code>, <code>run.sh</code>, <code>Dockerfile</code></span>
          </div>

          <button
            id="download-bot-zip-submit-btn"
            type="submit"
            disabled={isGenerating}
            className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Bundling Bot ZIP...</span>
              </>
            ) : downloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Downloaded! Download Again?</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download BetaBotHub_Telegram_Bot.zip</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
