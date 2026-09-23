import React, { useState } from 'react';
import { ViewMode } from '../types';
import { BookOpen, User, ShieldCheck, Database, Maximize2, Minimize2, CheckCircle2 } from 'lucide-react';
import { StorageStatusButton } from './admin/StorageStatusModal';

interface NavbarProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  gasConnected: boolean;
  gasUrl: string;
  studentName?: string;
  mapelName?: string;
  onOpenStorageModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onModeChange,
  gasConnected,
  gasUrl,
  studentName,
  mapelName,
  onOpenStorageModal,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header id="cbt-navbar" className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">CBT Online</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Google Sheets & GAS
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Tanpa Firebase & Google Cloud • Berbasis Spreadsheet
            </p>
          </div>
        </div>

        {/* Center: Context info (during exam or result) */}
        {currentMode === 'ujian' && (
          <div className="hidden md:flex items-center space-x-3 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700">
            <div className="text-right">
              <p className="text-xs text-slate-400">{studentName || 'Peserta Ujian'}</p>
              <p className="text-xs font-semibold text-slate-200 truncate max-w-xs">{mapelName}</p>
            </div>
          </div>
        )}

        {/* Right: Actions & Mode Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Storage / Connection Indicator Button ("Data tersimpan di gdrive" / "Data tersimpan di lokal") */}
          <StorageStatusButton
            onClick={() => {
              if (onOpenStorageModal) {
                onOpenStorageModal();
              } else {
                onModeChange('admin');
              }
            }}
            className="hidden sm:flex"
          />

          {/* Fullscreen Toggle */}
          <button
            id="btn-toggle-fullscreen"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Full Screen)'}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              id="nav-btn-siswa"
              onClick={() => onModeChange('login')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                currentMode === 'login' || currentMode === 'ujian' || currentMode === 'hasil'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Siswa (CBT)</span>
            </button>
            <button
              id="nav-btn-admin"
              onClick={() => onModeChange('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                currentMode === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Guru / Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
