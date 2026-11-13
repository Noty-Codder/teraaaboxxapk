import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Play, 
  Trash2, 
  Download, 
  Film, 
  Music, 
  Image as ImageIcon,
  Clock,
  X,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { MediaItem } from '../types';
import { getAllOfflineMedia, deleteOfflineMedia, clearAllOfflineMedia, OfflineStoredItem } from '../services/offlineStorage';

export const OfflineManager: React.FC = () => {
  const [items, setItems] = useState<OfflineStoredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<OfflineStoredItem | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getAllOfflineMedia();
      setItems(data.sort((a, b) => b.savedAt - a.savedAt));
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteOfflineMedia(id);
    if (activeMedia?.id === id) {
      setActiveMedia(null);
    }
    fetchItems();
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all offline stored media?')) {
      await clearAllOfflineMedia();
      setActiveMedia(null);
      fetchItems();
    }
  };

  const totalSizeMb = items.reduce((acc, curr) => acc + (curr.sizeBytes || 45 * 1024 * 1024), 0) / (1024 * 1024);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#171026] via-[#211737] to-[#171026] rounded-2xl border border-purple-500/30 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Integrated Offline Media Manager
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Local Vault
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Cached locally in your browser storage for smooth playback without internet or data usage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400">Vault Items: </span>
            <strong className="text-purple-400 font-bold ml-1">{items.length}</strong>
            <span className="text-slate-600 mx-1.5">|</span>
            <span className="text-slate-400">Approx: </span>
            <strong className="text-slate-200 font-bold ml-1">{totalSizeMb.toFixed(1)} MB</strong>
          </div>

          {items.length > 0 && (
            <button
              id="offline-clear-all-btn"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Active In-App Player Modal / Viewer */}
      {activeMedia && (
        <div className="bg-[#0f172a] rounded-2xl border border-purple-500/40 p-5 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white truncate max-w-md">
                Playing: {activeMedia.title}
              </h3>
            </div>
            <button
              id="close-player-btn"
              onClick={() => setActiveMedia(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative flex items-center justify-center">
            {activeMedia.type === 'video' ? (
              <video
                src={activeMedia.streamUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : activeMedia.type === 'audio' ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4 bg-slate-950">
                <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-xl">
                  <Music className="w-10 h-10" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">{activeMedia.title}</h4>
                <audio src={activeMedia.streamUrl} controls autoPlay className="w-full max-w-md" />
              </div>
            ) : (
              <img
                src={activeMedia.watermarkedThumbUrl || activeMedia.thumbnailUrl}
                alt={activeMedia.title}
                className="max-h-full object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* Item List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          <span>Loading Offline Media Vault...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-300">Your Offline Vault is Empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            When you extract TeraBox media, click <strong>"Save Offline Vault"</strong> to store media right here for offline viewing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[#0f172a] rounded-2xl border border-slate-800 hover:border-purple-500/40 overflow-hidden shadow-lg transition-all group flex flex-col"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full bg-black overflow-hidden">
                <img
                  src={item.watermarkedThumbUrl || item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-cyan-300 border border-cyan-500/40">
                  BETA BOT HUB
                </div>
                <button
                  id={`play-offline-${item.id}`}
                  onClick={() => setActiveMedia(item)}
                  className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white opacity-90 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg shadow-purple-600/40 transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-white" />
                  </div>
                </button>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1" title={item.title}>
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span>{item.size}</span>
                    <span>•</span>
                    <span className="uppercase text-purple-400 font-mono">{item.source}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <a
                    href={item.downloadUrl}
                    download={item.title}
                    className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save File</span>
                  </a>
                  <button
                    id={`delete-offline-${item.id}`}
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove from vault"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
