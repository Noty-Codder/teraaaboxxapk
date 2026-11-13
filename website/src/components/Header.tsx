import React from 'react';
import { Bot, Download, Upload, Zap, HardDrive, ShieldCheck, Code, FolderArchive, Terminal } from 'lucide-react';
import { UserProfile, BotSettings } from '../types';
import { PLANS_CONFIG } from '../services/state';

interface HeaderProps {
  user: UserProfile;
  settings: BotSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenZipModal: () => void;
  onOpenCookieModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenZipModal,
  onOpenCookieModal,
}) => {
  const planConfig = PLANS_CONFIG[user.currentPlan];
  const dlLimit = planConfig.downloadsPerDay === 'unlimited' ? '∞' : planConfig.downloadsPerDay;
  const upLimit = planConfig.uploadsPerDay === 'unlimited' ? '∞' : planConfig.uploadsPerDay;

  const dlRemaining = planConfig.downloadsPerDay === 'unlimited' 
    ? 'Unlimited' 
    : Math.max(0, (planConfig.downloadsPerDay as number) - user.downloadsToday);

  const upRemaining = planConfig.uploadsPerDay === 'unlimited' 
    ? 'Unlimited' 
    : Math.max(0, (planConfig.uploadsPerDay as number) - user.uploadsToday);

  return (
    <header className="sticky top-0 z-40 bg-[#0c1222]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl tracking-wider">
            β
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Beta Bot Hub
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TeraBox
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Downloader, Offline Manager & Telegram Engine
            </p>
          </div>
        </div>

        {/* Plan Quota & Status Pill */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[11px] ${
              user.currentPlan === 'beta' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                : user.currentPlan === 'pro' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'bg-slate-700 text-slate-300'
            }`}>
              {planConfig.name}
            </span>
            <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />
            <div className="text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-400">DL:</span>
              <strong className="text-cyan-400 font-semibold">{user.downloadsToday}/{dlLimit}</strong>
            </div>
            <div className="text-slate-300 flex items-center gap-1.5">
              <span className="text-slate-400">UL:</span>
              <strong className="text-emerald-400 font-semibold">{user.uploadsToday}/{upLimit}</strong>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <button
            id="header-btn-export-zip"
            onClick={onOpenZipModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 transition-all active:scale-95"
            title="Download Complete Telegram Bot Code ZIP"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Download Bot ZIP</span>
          </button>

          <button
            id="header-btn-cookie-settings"
            onClick={onOpenCookieModal}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors border border-slate-700/60"
            title="Configure TeraBox Cookie & API"
          >
            🍪 Cookies
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto no-scrollbar gap-1 border-t border-slate-800/60 py-1.5 text-xs font-medium">
        <button
          id="nav-tab-bot-simulator"
          onClick={() => setActiveTab('bot')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'bot'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>Telegram Bot Sim</span>
        </button>

        <button
          id="nav-tab-downloader"
          onClick={() => setActiveTab('downloader')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'downloader'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>TeraBox Downloader</span>
        </button>

        <button
          id="nav-tab-upload"
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'upload'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span>Create Link / Upload</span>
        </button>

        <button
          id="nav-tab-offline"
          onClick={() => setActiveTab('offline')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'offline'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-purple-400" />
          <span>Offline Vault</span>
        </button>

        <button
          id="nav-tab-plans"
          onClick={() => setActiveTab('plans')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'plans'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Plans & UPI Scanner</span>
        </button>

        <button
          id="nav-tab-referral"
          onClick={() => setActiveTab('referral')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'referral'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span className="text-pink-400 font-bold">👥</span>
          <span>Refer & Earn</span>
        </button>

        <button
          id="nav-tab-admin"
          onClick={() => setActiveTab('admin')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'admin'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          <span>Admin Approval</span>
        </button>

        <button
          id="nav-tab-logger"
          onClick={() => setActiveTab('logger')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'logger'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Activity & Downloader Logger</span>
        </button>

        <button
          id="nav-tab-code"
          onClick={() => setActiveTab('code')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'code'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Code className="w-3.5 h-3.5 text-cyan-400" />
          <span>Bot Python Files</span>
        </button>
      </div>
    </header>
  );
};
