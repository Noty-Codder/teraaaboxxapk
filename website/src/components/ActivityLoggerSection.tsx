import React, { useState, useMemo } from 'react';
import { 
  Terminal, 
  Search, 
  Download, 
  Upload, 
  Zap, 
  Bot, 
  Filter, 
  FileText, 
  Clock, 
  User, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Eye, 
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
  XCircle,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { ActivityLog, ActivityLogType, BotSettings } from '../types';

interface ActivityLoggerSectionProps {
  logs: ActivityLog[];
  settings: BotSettings;
  onClearLogs: () => void;
  onResetDemoLogs: () => void;
  onAddSimulatedLog: (type: ActivityLogType) => void;
  onApprovePaymentLog?: (logId: string) => void;
  onDeclinePaymentLog?: (logId: string) => void;
}

export const ActivityLoggerSection: React.FC<ActivityLoggerSectionProps> = ({
  logs,
  settings,
  onClearLogs,
  onResetDemoLogs,
  onAddSimulatedLog,
  onApprovePaymentLog,
  onDeclinePaymentLog,
}) => {
  const [filterType, setFilterType] = useState<ActivityLogType | 'all'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Type match
      if (filterType !== 'all') {
        if (filterType === 'plan_purchase') {
          if (log.type !== 'plan_purchase' && log.type !== 'plan_grant') return false;
          // Subfilter for payment status
          if (paymentStatusFilter !== 'all') {
            const status = log.paymentStatus || 'pending';
            if (status !== paymentStatusFilter) return false;
          }
        } else if (log.type !== filterType) {
          return false;
        }
      }

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesUser = 
          log.userId.toLowerCase().includes(query) ||
          log.username.toLowerCase().includes(query) ||
          (log.userDisplayName && log.userDisplayName.toLowerCase().includes(query)) ||
          (log.telegramHandle && log.telegramHandle.toLowerCase().includes(query));

        const matchesFile = 
          (log.fileTitle && log.fileTitle.toLowerCase().includes(query)) ||
          (log.uploadedFileName && log.uploadedFileName.toLowerCase().includes(query)) ||
          (log.sourceUrl && log.sourceUrl.toLowerCase().includes(query)) ||
          (log.generatedLink && log.generatedLink.toLowerCase().includes(query));

        const matchesPlan = 
          (log.planName && log.planName.toLowerCase().includes(query)) ||
          (log.utrNumber && log.utrNumber.toLowerCase().includes(query)) ||
          (log.paymentMethod && log.paymentMethod.toLowerCase().includes(query));

        const matchesDetails = log.details && log.details.toLowerCase().includes(query);

        return matchesUser || matchesFile || matchesPlan || matchesDetails;
      }

      return true;
    });
  }, [logs, filterType, paymentStatusFilter, searchQuery]);

  // Statistics counters
  const stats = useMemo(() => {
    let botStarts = 0;
    let planPurchases = 0;
    let downloads = 0;
    let uploads = 0;
    let pendingPayments = 0;
    let approvedPayments = 0;
    let declinedPayments = 0;

    logs.forEach((log) => {
      if (log.type === 'bot_start') botStarts++;
      else if (log.type === 'plan_purchase' || log.type === 'plan_grant') {
        planPurchases++;
        if (log.paymentStatus === 'approved') approvedPayments++;
        else if (log.paymentStatus === 'rejected') declinedPayments++;
        else pendingPayments++;
      } else if (log.type === 'download') downloads++;
      else if (log.type === 'upload') uploads++;
    });

    return {
      total: logs.length,
      botStarts,
      planPurchases,
      downloads,
      uploads,
      pendingPayments,
      approvedPayments,
      declinedPayments,
    };
  }, [logs]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `BetaBotHub_Activity_Logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportAsCSV = () => {
    const headers = ['Timestamp', 'Type', 'User ID', 'Username', 'Plan/File', 'Size/Amount', 'Source/UTR', 'Details'];
    const rows = logs.map((l) => [
      new Date(l.timestamp).toLocaleString(),
      l.type,
      l.userId,
      l.username,
      l.fileTitle || l.uploadedFileName || l.planName || '-',
      l.fileSize || l.uploadedFileSize || (l.amountPaid !== undefined ? `₹${l.amountPaid}` : '-'),
      l.sourcePlatform || l.utrNumber || l.referralCodeUsed || '-',
      (l.details || '').replace(/,/g, ';'),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const a = document.createElement('a');
    a.setAttribute('href', encodeURI(csvContent));
    a.setAttribute('download', `BetaBotHub_Activity_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0c1c2e] via-[#0e2740] to-[#0c1c2e] rounded-2xl border border-cyan-500/30 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Centralized Activity Logger & Downloader Tracker
              </h2>
              <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Consolidated real-time audit logger tracking <strong>which user started the bot</strong>, <strong>which user activated which plan</strong>, and the <strong>downloader logger</strong> capturing exactly <strong>what media each user downloaded or uploaded</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="logger-btn-export-json"
              onClick={exportAsJSON}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-all"
              title="Download Logs as JSON"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>
            <button
              id="logger-btn-export-csv"
              onClick={exportAsCSV}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 flex items-center gap-1.5 transition-all"
              title="Download Logs as CSV"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help & Support Official Channels Banner */}
      <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Official Help & Support Hub</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20">Verified Channels</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Join official community channels for payment support, updates, and bot alerts:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <a
            id="logger-help-link-hub"
            href="https://t.me/betabot_hub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors"
          >
            <span>📢 @betabot_hub</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
          <a
            id="logger-help-link-support"
            href="https://t.me/betabot_support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
          >
            <span>🛠️ @betabot_support</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
          <a
            id="logger-help-link-sukoon"
            href="https://t.me/sukoon_s"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
          >
            <span>✨ @sukoon_s</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Bot Starts */}
        <div 
          onClick={() => setFilterType('bot_start')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            filterType === 'bot_start'
              ? 'bg-blue-500/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
              : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <Bot className="w-4 h-4" />
              Bot Starts
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
              Users
            </span>
          </div>
          <div className="text-2xl font-black text-white">{stats.botStarts}</div>
          <p className="text-[11px] text-slate-400 mt-1">Users who initiated /start</p>
        </div>

        {/* Plan Purchases & Grants */}
        <div 
          onClick={() => setFilterType('plan_purchase')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            filterType === 'plan_purchase'
              ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Plans Taken
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Pro & VIP
            </span>
          </div>
          <div className="text-2xl font-black text-white">{stats.planPurchases}</div>
          <p className="text-[11px] text-slate-400 mt-1">UPI QR & Admin grants</p>
        </div>

        {/* Downloader Tracker */}
        <div 
          onClick={() => setFilterType('download')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            filterType === 'download'
              ? 'bg-cyan-500/15 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              Downloads Logged
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              Files
            </span>
          </div>
          <div className="text-2xl font-black text-white">{stats.downloads}</div>
          <p className="text-[11px] text-slate-400 mt-1">TeraBox media</p>
        </div>

        {/* Uploader Tracker */}
        <div 
          onClick={() => setFilterType('upload')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            filterType === 'upload'
              ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              Uploads Logged
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              Links
            </span>
          </div>
          <div className="text-2xl font-black text-white">{stats.uploads}</div>
          <p className="text-[11px] text-slate-400 mt-1">Files uploaded to TeraBox</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Test Buttons */}
      <div className="bg-[#0e1626] rounded-xl border border-slate-800 p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="logger-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by User ID, @username, File name, URL, or UTR..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'all'
                ? 'bg-cyan-500 text-white font-semibold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            All Logs ({stats.total})
          </button>
          <button
            onClick={() => setFilterType('bot_start')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'bot_start'
                ? 'bg-blue-500 text-white font-semibold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            🤖 Starts ({stats.botStarts})
          </button>
          <button
            onClick={() => setFilterType('plan_purchase')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'plan_purchase'
                ? 'bg-amber-500 text-white font-semibold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            💎 Plans ({stats.planPurchases})
          </button>
          <button
            onClick={() => setFilterType('download')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'download'
                ? 'bg-cyan-500 text-white font-semibold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            📥 Downloads ({stats.downloads})
          </button>
          <button
            onClick={() => setFilterType('upload')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === 'upload'
                ? 'bg-emerald-500 text-white font-semibold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            📤 Uploads ({stats.uploads})
          </button>
        </div>

        {/* Quick Simulator and Reset actions */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end">
          <div className="relative group">
            <button
              id="logger-btn-simulate-event"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Simulate Event</span>
            </button>
            <div className="absolute right-0 mt-1 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-30">
              <p className="text-[10px] text-slate-400 px-2 py-1 uppercase font-bold tracking-wider">
                Trigger Live Event
              </p>
              <button
                onClick={() => onAddSimulatedLog('bot_start')}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>🤖</span>
                <span>User /start Bot</span>
              </button>
              <button
                onClick={() => onAddSimulatedLog('plan_purchase')}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>💎</span>
                <span>User Buys Plan (₹15/₹27/₹69)</span>
              </button>
              <button
                onClick={() => onAddSimulatedLog('download')}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>📥</span>
                <span>User Downloads Video</span>
              </button>
              <button
                onClick={() => onAddSimulatedLog('upload')}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>📤</span>
                <span>User Uploads File</span>
              </button>
            </div>
          </div>

          <button
            onClick={onResetDemoLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60"
            title="Reload Demo Log Entries"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30"
            title="Clear all logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Payment Approval Sub-Filter Bar (Shown when viewing Plans/Payments) */}
      {filterType === 'plan_purchase' && (
        <div className="bg-[#0f172a] px-4 py-2.5 rounded-xl border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap shadow-inner">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>💳 Payment Logger Filter:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setPaymentStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  paymentStatusFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Payments ({stats.planPurchases})
              </button>
              <button
                onClick={() => setPaymentStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  paymentStatusFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ⏳ Pending ({stats.pendingPayments})
              </button>
              <button
                onClick={() => setPaymentStatusFilter('approved')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  paymentStatusFilter === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ✅ Approved ({stats.approvedPayments})
              </button>
              <button
                onClick={() => setPaymentStatusFilter('rejected')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  paymentStatusFilter === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ❌ Declined ({stats.declinedPayments})
              </button>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            Click <b>Approved</b> or <b>Declined</b> on any payment log to verify immediately.
          </span>
        </div>
      )}

      {/* Logger Records Table */}
      <div className="bg-[#0b1320] rounded-xl border border-slate-800/90 overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Activity & Downloader Feed
            </span>
            <span className="text-[11px] text-slate-400">
              ({filteredLogs.length} events found)
            </span>
          </div>
          {settings.logChannelId && (
            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
              <span className="text-slate-500">Telegram Forwarder:</span>
              <code className="text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                {settings.logChannelId}
              </code>
            </div>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No activity logs matching your filter</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try searching a different keyword or click "+ Simulate Event" to generate real-time log records.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 overflow-x-auto">
            {filteredLogs.map((log) => {
              const date = new Date(log.timestamp);
              const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const dateFormatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-850/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Type Badge & Event Summary */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Event Type Icon */}
                    <div className="shrink-0 pt-0.5">
                      {log.type === 'bot_start' && (
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      {(log.type === 'plan_purchase' || log.type === 'plan_grant') && (
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                          <Zap className="w-4 h-4" />
                        </div>
                      )}
                      {log.type === 'download' && (
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                          <ArrowDownToLine className="w-4 h-4" />
                        </div>
                      )}
                      {log.type === 'upload' && (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                          <ArrowUpFromLine className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Top line: Action Headline */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {/* Event Category Tag */}
                        {log.type === 'bot_start' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            BOT STARTED
                          </span>
                        )}
                        {log.type === 'plan_purchase' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            PLAN PURCHASED
                          </span>
                        )}
                        {log.type === 'plan_grant' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            PREMIUM GRANTED
                          </span>
                        )}
                        {log.type === 'download' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            DOWNLOAD LOG
                          </span>
                        )}
                        {log.type === 'upload' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            UPLOAD LOG
                          </span>
                        )}

                        {/* User Identity Pill */}
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-white">{log.userDisplayName || log.username}</span>
                          <span className="text-slate-400">({log.telegramHandle || `@${log.username}`})</span>
                          <span className="text-[10px] text-cyan-400 font-mono">ID: {log.userId}</span>
                        </div>

                        {/* Timestamp */}
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto sm:ml-0">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{dateFormatted}, {timeFormatted}</span>
                        </div>
                      </div>

                      {/* Detail Body based on log type */}
                      {/* 1. DOWNLOADING DETAIL */}
                      {log.type === 'download' && (
                        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1.5 mt-1">
                          <div className="flex items-center gap-2 flex-wrap justify-between">
                            <div className="flex items-center gap-1.5 text-slate-100 font-medium truncate max-w-lg">
                              <span className="text-cyan-400 font-bold">🎬 File:</span>
                              <span className="truncate">{log.fileTitle}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {log.fileSize && (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                                  {log.fileSize}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase font-bold text-[10px]">
                                {log.sourcePlatform || 'TeraBox'}
                              </span>
                            </div>
                          </div>

                          {log.sourceUrl && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                              <span className="text-slate-500">Source:</span>
                              <a
                                href={log.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:underline truncate max-w-sm flex items-center gap-1"
                              >
                                {log.sourceUrl}
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-amber-400/90 pt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>5-Minute Auto-Deletion scheduled for media privacy.</span>
                          </div>
                        </div>
                      )}

                      {/* 2. UPLOADING DETAIL */}
                      {log.type === 'upload' && (
                        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1.5 mt-1">
                          <div className="flex items-center gap-2 flex-wrap justify-between">
                            <div className="flex items-center gap-1.5 text-slate-100 font-medium truncate max-w-lg">
                              <span className="text-emerald-400 font-bold">📤 Uploaded:</span>
                              <span className="truncate">{log.uploadedFileName}</span>
                            </div>
                            {log.uploadedFileSize && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                                {log.uploadedFileSize}
                              </span>
                            )}
                          </div>

                          {log.generatedLink && (
                            <div className="flex items-center gap-2 text-[11px] bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20 text-emerald-300">
                              <span className="font-semibold text-emerald-400">Generated Share Link:</span>
                              <code className="text-emerald-200 truncate max-w-sm font-mono">{log.generatedLink}</code>
                              <button
                                onClick={() => handleCopy(log.generatedLink!, log.id)}
                                className="ml-auto p-1 rounded hover:bg-emerald-500/20 text-emerald-400"
                                title="Copy Link"
                              >
                                {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. PLAN PURCHASE / GRANT DETAIL */}
                      {(log.type === 'plan_purchase' || log.type === 'plan_grant') && (
                        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-2 mt-1">
                          <div className="flex items-center gap-2 flex-wrap justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold">💎 Activated Plan:</span>
                              <span className="font-semibold text-white">{log.planName}</span>
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                {log.planDuration}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {log.amountPaid !== undefined && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                  {log.amountPaid === 0 ? 'FREE REWARD' : `₹${log.amountPaid}`}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                {log.paymentMethod === 'UPI_QR' ? '10m UPI QR' : log.paymentMethod === 'ADMIN_GRANT' ? 'Manual Admin' : '3-Ref Pass'}
                              </span>
                            </div>
                          </div>

                          {log.utrNumber && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span className="text-slate-500">UTR / Ref:</span>
                              <code className="text-cyan-400 font-mono font-semibold">{log.utrNumber}</code>
                            </div>
                          )}

                          {/* PAYMENT LOGGER: APPROVED & DECLINED BUTTONS */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                              {log.paymentStatus === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  Approved
                                </span>
                              ) : log.paymentStatus === 'rejected' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                  Declined
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                  Pending Verification
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                id={`btn-approve-payment-${log.id}`}
                                onClick={() => onApprovePaymentLog && onApprovePaymentLog(log.id)}
                                disabled={log.paymentStatus === 'approved'}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                  log.paymentStatus === 'approved'
                                    ? 'opacity-40 cursor-not-allowed bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                }`}
                                title="Approve payment & activate subscriber"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </button>

                              <button
                                id={`btn-decline-payment-${log.id}`}
                                onClick={() => onDeclinePaymentLog && onDeclinePaymentLog(log.id)}
                                disabled={log.paymentStatus === 'rejected'}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                  log.paymentStatus === 'rejected'
                                    ? 'opacity-40 cursor-not-allowed bg-rose-950/60 text-rose-400 border border-rose-800/50'
                                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                                }`}
                                title="Decline payment"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Declined</span>
                              </button>
                            </div>
                          </div>

                          {log.details && (
                            <p className="text-[11px] text-slate-400 leading-normal pt-0.5">{log.details}</p>
                          )}
                        </div>
                      )}

                      {/* 4. BOT START DETAIL */}
                      {log.type === 'bot_start' && (
                        <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1 mt-1">
                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-300">
                            {log.referralCodeUsed ? (
                              <div className="flex items-center gap-1 text-pink-400">
                                <span>Referred by:</span>
                                <code className="bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20 font-bold">
                                  {log.referralCodeUsed}
                                </code>
                              </div>
                            ) : (
                              <span className="text-slate-400">Direct Organic Join (/start)</span>
                            )}
                            {log.sourceClient && (
                              <span className="text-slate-500">• {log.sourceClient}</span>
                            )}
                          </div>
                          {log.details && (
                            <p className="text-[11px] text-slate-400">{log.details}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action: Inspect JSON & payload */}
                  <div className="flex sm:flex-col items-end gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      id={`log-inspect-${log.id}`}
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 text-[11px] transition-all"
                      title="Inspect complete payload"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal / Raw Payload Viewer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Log Event Inspection</h3>
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                  {selectedLog.type}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400">Log ID:</span>
                  <p className="text-white font-mono">{selectedLog.id}</p>
                </div>
                <div>
                  <span className="text-slate-400">Timestamp:</span>
                  <p className="text-white font-mono">{new Date(selectedLog.timestamp).toISOString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">User ID:</span>
                  <p className="text-cyan-400 font-mono font-bold">{selectedLog.userId}</p>
                </div>
                <div>
                  <span className="text-slate-400">Username:</span>
                  <p className="text-white font-mono">@{selectedLog.username}</p>
                </div>
              </div>

              {/* Formatted Telegram Forwarding Preview */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Telegram Logger Channel Preview (HTML Message)
                </label>
                <div className="bg-[#121c2e] p-3 rounded-xl border border-cyan-500/30 font-mono text-[11px] text-slate-200 leading-relaxed">
                  {selectedLog.type === 'bot_start' && (
                    <div>
                      <p className="text-blue-400 font-bold">👤 [BOT START]</p>
                      <p>• User: <b>{selectedLog.userDisplayName || selectedLog.username}</b> (<code>{selectedLog.userId}</code>)</p>
                      <p>• Username: @{selectedLog.username}</p>
                      <p>• Referral: {selectedLog.referralCodeUsed || 'None (Direct Organic)'}</p>
                      <p>• Time: {new Date(selectedLog.timestamp).toLocaleString()}</p>
                    </div>
                  )}

                  {selectedLog.type === 'plan_purchase' && (
                    <div>
                      <p className="text-amber-400 font-bold">💎 [PLAN ACTIVATED - UPI QR]</p>
                      <p>• User: <b>{selectedLog.userDisplayName || selectedLog.username}</b> (<code>{selectedLog.userId}</code>)</p>
                      <p>• Plan: <b>{selectedLog.planName}</b> ({selectedLog.planDuration})</p>
                      <p>• Amount: <b>₹{selectedLog.amountPaid}</b></p>
                      <p>• UTR: <code>{selectedLog.utrNumber}</code></p>
                      <p>• Status: Active & Synced to Database</p>
                    </div>
                  )}

                  {selectedLog.type === 'plan_grant' && (
                    <div>
                      <p className="text-purple-400 font-bold">👑 [PLAN MANUAL GRANT]</p>
                      <p>• User: <b>{selectedLog.userDisplayName || selectedLog.username}</b> (<code>{selectedLog.userId}</code>)</p>
                      <p>• Plan: <b>{selectedLog.planName}</b></p>
                      <p>• Authorized By: <b>{selectedLog.grantedBy}</b></p>
                      <p>• Note: {selectedLog.details}</p>
                    </div>
                  )}

                  {selectedLog.type === 'download' && (
                    <div>
                      <p className="text-cyan-400 font-bold">📥 [DOWNLOADER ACTIVITY]</p>
                      <p>• User: <b>{selectedLog.userDisplayName || selectedLog.username}</b> (<code>{selectedLog.userId}</code>)</p>
                      <p>• File Title: <code>{selectedLog.fileTitle}</code></p>
                      <p>• Size: <code>{selectedLog.fileSize}</code></p>
                      <p>• Platform: <b>{selectedLog.sourcePlatform?.toUpperCase()}</b></p>
                      <p>• Auto-Delete: 5 Minutes (Countdown Purge Active)</p>
                    </div>
                  )}

                  {selectedLog.type === 'upload' && (
                    <div>
                      <p className="text-emerald-400 font-bold">📤 [UPLOADER ACTIVITY]</p>
                      <p>• User: <b>{selectedLog.userDisplayName || selectedLog.username}</b> (<code>{selectedLog.userId}</code>)</p>
                      <p>• Uploaded File: <code>{selectedLog.uploadedFileName}</code></p>
                      <p>• File Size: <code>{selectedLog.uploadedFileSize}</code></p>
                      <p>• Generated Link: <code>{selectedLog.generatedLink}</code></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Full JSON Object */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Raw JSON Object
                  </label>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedLog, null, 2), 'json_copy')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedId === 'json_copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="bg-black/70 p-3 rounded-xl border border-slate-800 text-[11px] text-cyan-300/90 font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2 flex-wrap">
              {(selectedLog.type === 'plan_purchase' || selectedLog.type === 'plan_grant') && (
                <div className="flex items-center gap-2">
                  <button
                    id={`modal-btn-approve-${selectedLog.id}`}
                    onClick={() => {
                      if (onApprovePaymentLog) onApprovePaymentLog(selectedLog.id);
                      setSelectedLog((prev) => prev ? { ...prev, paymentStatus: 'approved', status: 'success' } : null);
                    }}
                    disabled={selectedLog.paymentStatus === 'approved'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      selectedLog.paymentStatus === 'approved'
                        ? 'opacity-40 cursor-not-allowed bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Payment</span>
                  </button>

                  <button
                    id={`modal-btn-decline-${selectedLog.id}`}
                    onClick={() => {
                      if (onDeclinePaymentLog) onDeclinePaymentLog(selectedLog.id);
                      setSelectedLog((prev) => prev ? { ...prev, paymentStatus: 'rejected', status: 'failed' } : null);
                    }}
                    disabled={selectedLog.paymentStatus === 'rejected'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      selectedLog.paymentStatus === 'rejected'
                        ? 'opacity-40 cursor-not-allowed bg-rose-950/60 text-rose-400 border border-rose-800/50'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Decline Payment</span>
                  </button>
                </div>
              )}

              <div className="ml-auto">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
