import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Search, Check, AlertCircle, Youtube, Music, Video } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Platform detection
const getPlatform = (url: string) => {
  if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('spotify')) return 'spotify';
  if (url.includes('soundcloud')) return 'soundcloud';
  return 'generic';
};

const themes = {
  youtube: 'from-red-600 to-red-900',
  spotify: 'from-green-500 to-green-900',
  soundcloud: 'from-orange-500 to-orange-900',
  generic: 'from-blue-600 to-purple-900'
};

const API_URL = 'http://127.0.0.1:5000';

function App() {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('generic');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPlatform(getPlatform(url));
  }, [url]);

  const fetchInfo = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setInfo(null);
    try {
      const res = await axios.post(`${API_URL}/info`, { url });
      setInfo(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch info');
    } finally {
      setLoading(false);
    }
  };

  const startDownload = async (options: any) => {
    try {
      setDownloading(true);
      const res = await axios.post(`${API_URL}/download`, { url, options });
      const downloadId = res.data.download_id;

      // Poll for progress
      const interval = setInterval(async () => {
        try {
          const progressRes = await axios.get(`${API_URL}/progress`);
          const status = progressRes.data[downloadId];
          if (status) {
            if (status.status === 'downloading') {
              setProgress(status.progress);
            } else if (status.status === 'completed') {
              setProgress(100);
              clearInterval(interval);
              setDownloading(false);
              alert('Download Complete!');
            } else if (status.status === 'error') {
              clearInterval(interval);
              setDownloading(false);
              setError(status.error);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Download failed');
      setDownloading(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-gray-900 text-white transition-colors duration-500 flex flex-col items-center justify-center p-8",
      // Background gradient overlay
      // We'll use a pseudo-element or just inner div for gradient
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20 pointer-events-none transition-all duration-700", themes[platform as keyof typeof themes])} />

      <div className="z-10 w-full max-w-2xl bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl border border-gray-700 shadow-2xl">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Convertly
        </h1>

        {/* Input Section */}
        <div className="relative mb-6">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
            placeholder="Paste a link (YouTube, Spotify, etc.)"
            className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500"
          />
          <button
            onClick={fetchInfo}
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <Search size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 flex items-center gap-3"
            >
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}

          {info && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/60 rounded-2xl p-6 flex flex-col gap-6"
            >
              <div className="flex gap-4">
                <img src={info.thumbnail} alt={info.title} className="w-32 h-24 object-cover rounded-lg bg-gray-800" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold truncate" title={info.title}>{info.title}</h2>
                  <p className="text-gray-400">{info.uploader} • {info.platform}</p>
                </div>
              </div>

              {/* Format Selection & Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => startDownload({ type: 'audio' })}
                  disabled={downloading}
                  className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl flex items-center justify-center gap-3 transition-colors border border-gray-700"
                >
                  <Music size={20} className="text-green-400" />
                  <span>Download MP3</span>
                </button>
                <button
                  onClick={() => startDownload({ type: 'video', format_id: 'best' })}
                  disabled={downloading}
                  className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl flex items-center justify-center gap-3 transition-colors border border-gray-700"
                >
                  <Video size={20} className="text-red-400" />
                  <span>Download MP4</span>
                </button>
              </div>

              {/* Progress Bar */}
              {downloading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Downloading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
