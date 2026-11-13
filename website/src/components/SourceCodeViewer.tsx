import React, { useState } from 'react';
import { Code, Download, Copy, Check, FileText, Terminal, FolderArchive } from 'lucide-react';
import { BOT_FILES } from '../services/botCodeTemplates';
import { generateBotZip, triggerBlobDownload } from '../services/zipExporter';
import { BotSettings } from '../types';

interface SourceCodeViewerProps {
  settings: BotSettings;
  onOpenZipModal: () => void;
}

export const SourceCodeViewer: React.FC<SourceCodeViewerProps> = ({
  settings,
  onOpenZipModal,
}) => {
  const fileNames = Object.keys(BOT_FILES) as Array<keyof typeof BOT_FILES>;
  const [selectedFile, setSelectedFile] = useState<keyof typeof BOT_FILES>('bot.py');
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(BOT_FILES[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const blob = await generateBotZip({
        UPI_ID: settings.upiId,
        UPI_NAME: settings.upiName,
        TERABOX_COOKIE: settings.teraboxCookie,
        WATERMARK_TEXT: settings.watermarkText,
      });
      triggerBlobDownload(blob, 'BetaBotHub_Telegram_Bot.zip');
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0d1e2d] via-[#10293f] to-[#0d1e2d] rounded-2xl border border-cyan-500/30 p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Production Python Telegram Bot Source Code
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Pyrogram Async 2.0
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Complete, runnable Python code with TeraBox cookie API, auto-verified payment gateway, Pillow watermark engine, referral database, UPI QR scanner, and admin approval workflows.
          </p>
        </div>

        <button
          id="btn-download-full-zip"
          onClick={handleQuickDownloadZip}
          disabled={downloadingZip}
          className="px-5 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {downloadingZip ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating ZIP...</span>
            </>
          ) : (
            <>
              <FolderArchive className="w-4 h-4" />
              <span>Download Complete Bot ZIP</span>
            </>
          )}
        </button>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* File Navigator */}
        <div className="md:col-span-3 bg-[#0f172a] rounded-2xl border border-slate-800 p-3 space-y-1 shadow-lg">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Bot Files
          </div>
          {fileNames.map((fn) => (
            <button
              key={fn}
              id={`file-nav-${fn.replace('.', '-')}`}
              onClick={() => setSelectedFile(fn)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 transition-colors ${
                selectedFile === fn
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 opacity-70 shrink-0" />
              <span className="truncate">{fn}</span>
            </button>
          ))}
        </div>

        {/* Code Viewer */}
        <div className="md:col-span-9 bg-[#0b0f19] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-[#111726] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/40" />
              <span className="text-xs font-mono font-bold text-slate-200">{selectedFile}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="copy-code-file-btn"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[620px] scrollbar-thin leading-relaxed">
            <code>{BOT_FILES[selectedFile]}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
