import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileVideo, 
  FileAudio, 
  Image as ImageIcon, 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  AlertCircle,
  Sparkles,
  Share2
} from 'lucide-react';
import { UserProfile, BotSettings } from '../types';
import { PLANS_CONFIG } from '../services/state';

interface UploadSectionProps {
  user: UserProfile;
  settings: BotSettings;
  onUpdateUser: (user: UserProfile) => void;
  onNavigatePlans: () => void;
  onRecordLog?: (log: any) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  user,
  settings,
  onUpdateUser,
  onNavigatePlans,
  onRecordLog,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const plan = PLANS_CONFIG[user.currentPlan];
  const isUnlimited = plan.uploadsPerDay === 'unlimited';
  const remaining = isUnlimited ? 9999 : (plan.uploadsPerDay as number) - user.uploadsToday;
  const isExhausted = !isUnlimited && remaining <= 0;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setGeneratedLink(null);
    const validTypes = ['video/', 'audio/', 'image/'];
    if (!validTypes.some((t) => file.type.startsWith(t))) {
      setError('Please upload a valid Video, Audio, or Photo file.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    if (isExhausted) {
      setError(`Daily upload limit reached (${plan.uploadsPerDay} uploads/day on ${plan.name}). Please upgrade your plan!`);
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 250);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setUploading(false);

      // Generate realistic TeraBox share link
      const randomCode = Math.random().toString(36).substring(2, 10);
      const link = `https://teraboxapp.com/s/1tb_${randomCode}_${selectedFile.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15)}`;
      setGeneratedLink(link);

      // Update user count
      onUpdateUser({
        ...user,
        uploadsToday: user.uploadsToday + 1,
        totalUploads: user.totalUploads + 1,
      });

      if (onRecordLog) {
        onRecordLog({
          type: 'upload',
          userId: user.id,
          username: user.username,
          telegramHandle: user.telegramHandle,
          uploadedFileName: selectedFile.name,
          uploadedFileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
          generatedLink: link,
          status: 'success',
          details: `Uploaded via Upload GUI tab; TeraBox link generated`,
        });
      }
    }, 1400);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-[#0e211b] via-[#122e26] to-[#0e211b] rounded-2xl border border-emerald-500/30 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Create TeraBox Share Link from Media
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Bot Generator
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Send any video, audio, or photo file to generate high-speed TeraBox share links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400">Uploads Left Today: </span>
            <strong className="text-emerald-400 font-bold ml-1">
              {isUnlimited ? 'Unlimited (Beta VIP)' : `${remaining} of ${plan.uploadsPerDay}`}
            </strong>
          </div>
          {isExhausted && (
            <button
              id="upload-upgrade-btn"
              onClick={onNavigatePlans}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md active:scale-95"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          onChange={handleChange}
          className="hidden"
        />

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-emerald-400 bg-emerald-500/10'
              : 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/50 hover:bg-slate-900/80'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Upload className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            Click to Browse or Drag & Drop Media Here
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Supports Video (MP4, MKV), Audio (MP3, WAV), and Photos (JPG, PNG). Automatically watermarked with <strong>BETA BOT HUB</strong>.
          </p>

          <div className="inline-flex items-center gap-3 text-xs text-slate-400 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60">
            <span className="flex items-center gap-1"><FileVideo className="w-3.5 h-3.5 text-cyan-400" /> Video</span>
            <span>•</span>
            <span className="flex items-center gap-1"><FileAudio className="w-3.5 h-3.5 text-amber-400" /> Audio</span>
            <span>•</span>
            <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Photo</span>
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                {selectedFile.type.startsWith('video') ? (
                  <FileVideo className="w-5 h-5 text-cyan-400" />
                ) : selectedFile.type.startsWith('audio') ? (
                  <FileAudio className="w-5 h-5 text-amber-400" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>

            <button
              id="upload-file-action-btn"
              onClick={handleUpload}
              disabled={uploading}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 transition-all disabled:opacity-40 flex items-center gap-2 active:scale-95 shrink-0"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate TeraBox Link</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Generated Share Link Card */}
        {generatedLink && (
          <div className="p-5 rounded-2xl bg-[#0a1813] border border-emerald-500/40 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  TeraBox Link Created Successfully!
                </span>
              </div>
              <span className="text-[10px] text-slate-400">1 upload counted</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 bg-slate-900 px-3.5 py-2 rounded-xl text-xs font-mono text-cyan-300 border border-slate-700 select-all"
              />
              <button
                id="copy-generated-link-btn"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(generatedLink)}&text=Download%20media%20via%20Beta%20Bot%20Hub`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
