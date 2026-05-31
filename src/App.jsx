import React, { useEffect, useState } from 'react';
import { Smartphone, Image, Film, FolderOpen, Settings, Send, Sun, Moon, User } from 'lucide-react';
import logoImg from './assets/logo.ico';
import { SelectionProvider, useSelection } from './context/SelectionContext.jsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.jsx';
import DeviceWelcome from './components/DeviceWelcome.jsx';
import BackupTypeSelector from './components/BackupTypeSelector.jsx';
import FolderExplorer from './components/FolderExplorer.jsx';
import FolderDetail from './components/FolderDetail.jsx';
import SelectionFooter from './components/SelectionFooter.jsx';
import TransferDashboard from './components/TransferDashboard.jsx';
import ScanFilterModal from './components/ScanFilterModal.jsx';
import './index.css';

// Navigation views
const VIEW = {
  DEVICE: 'device',
  TYPE_SELECT: 'type_select',
  FOLDERS: 'folders',
  FOLDER_DETAIL: 'detail',
  TRANSFER: 'transfer',
};

function AppContent() {
  const [device, setDevice] = useState(null);
  const [view, setView] = useState(VIEW.DEVICE);
  const [mediaType, setMediaType] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [destinationDir, setDestinationDir] = useState(null);
  const [skipAndroid, setSkipAndroid] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [theme, setTheme] = useState('dark');
  const { language, setLanguage, t } = useLanguage();
  
  const { summary, clearAll, selectedFiles } = useSelection();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (window.adbAPI) {
      window.adbAPI.getDevices().then(devices => {
        if (devices && devices.length > 0) {
          window.adbAPI.getDeviceInfo(devices[0].id).then(setDevice);
        }
      });

      window.adbAPI.onDeviceConnected(async (dev) => {
        const info = await window.adbAPI.getDeviceInfo(dev.id);
        setDevice(info);
      });

      window.adbAPI.onDeviceDisconnected(() => {
        setDevice(null);
        setView(VIEW.DEVICE);
        setMediaType(null);
        setActiveFolder(null);
        setDestinationDir(null);
      });

      return () => {
        window.adbAPI.removeDeviceListeners();
      };
    }
  }, []);

  const handleProceed = () => {
    setView(VIEW.TYPE_SELECT);
  };

  const handleTypeSelect = (type) => {
    setPendingType(type);
    setShowFilterModal(true);
  };

  const handleScanChoice = (shouldSkip) => {
    setSkipAndroid(shouldSkip);
    setShowFilterModal(false);

    if (pendingType) {
      clearAll();
      setMediaType(pendingType);
      setView(VIEW.FOLDERS);
      setPendingType(null);
    }
  };

  const handleOpenFolder = (folder) => {
    setActiveFolder(folder);
    setView(VIEW.FOLDER_DETAIL);
  };

  const handleBackToFolders = () => {
    setActiveFolder(null);
    setView(VIEW.FOLDERS);
  };

  const handleBackToType = () => {
    setView(VIEW.TYPE_SELECT);
  };

  const handleBackToDevice = () => {
    setView(VIEW.DEVICE);
  };

  const handleNext = async () => {
    // Phase 8: Select Destination
    const result = await window.adbAPI.selectDestination();
    if (result && result.path) {
      // Disk space check
      if (result.freeSpace !== null && result.freeSpace < summary.totalSize) {
        alert('Warning: Not enough free disk space on the selected drive!');
        return;
      }
      setDestinationDir(result.path);
      setView(VIEW.TRANSFER);
    }
  };

  const handleTransferFinish = () => {
    clearAll();
    setView(VIEW.TYPE_SELECT);
    setDestinationDir(null);
  };

  // Label for title bar
  const viewLabel = (() => {
    switch (view) {
      case VIEW.TYPE_SELECT: return t('Select Backup Type');
      case VIEW.FOLDERS: return mediaType === 'image' ? t('Image Folders') : t('Video Folders');
      case VIEW.FOLDER_DETAIL: return activeFolder?.name || t('Folder');
      case VIEW.TRANSFER: return t('Backing Up');
      default: return device ? device.model : 'Disconnected';
    }
  })();

  // Sidebar nav items
  const navItems = [
    { id: VIEW.DEVICE, label: t('Device'), icon: <Smartphone size={18} />, enabled: true },
    { id: VIEW.TYPE_SELECT, label: t('Backup Type'), icon: <Image size={18} />, enabled: !!device && view !== VIEW.TRANSFER },
    { id: VIEW.FOLDERS, label: t('Folders'), icon: <FolderOpen size={18} />, enabled: !!mediaType && view !== VIEW.TRANSFER },
  ];
  if (view === VIEW.TRANSFER || destinationDir) {
    navItems.push({ id: VIEW.TRANSFER, label: t('Transfer'), icon: <Send size={18} />, enabled: true });
  }

  return (
    <div className="app-container">
      <div className="title-bar">
        Link Backup — {viewLabel}
      </div>

      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar glass-panel">
          <div className="sidebar-logo">
            <img src={logoImg} alt="Link Backup Logo" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 0 6px var(--primary-glow))' }} />
            <span>Link Backup</span>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`sidebar-nav-btn ${view === item.id ? 'sidebar-nav-btn--active' : ''}`}
                disabled={!item.enabled}
                onClick={() => {
                  if (item.id === VIEW.DEVICE) handleBackToDevice();
                  else if (item.id === VIEW.TYPE_SELECT) handleBackToType();
                  else if (item.id === VIEW.FOLDERS) handleBackToFolders();
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          {device && (
            <div className="sidebar-device-card">
              <div className="sidebar-device-status">
                <span className="status-indicator"></span>
                <span>{device.model}</span>
              </div>
              <span className="sidebar-device-battery">{device.battery}</span>
            </div>
          )}

          <div className="sidebar-footer" style={{ justifyContent: 'center', gap: '15px' }}>
            <button className="action-btn" onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} title={t('Toggle Theme')}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="action-btn text-btn" onClick={() => setLanguage(prev => prev === 'ENG' ? 'BN' : 'ENG')} title={t('Change Language')}>
              {language}
            </button>
            <button className="action-btn" onClick={() => window.adbAPI?.openUrl('https://ethun009.vercel.app')} title={t('Contact Developer')}>
              <User size={16} />
            </button>
          </div>
        </aside>

        {/* Main View Area */}
        <main className="view-container glass-panel">
          {view === VIEW.DEVICE && (
            <DeviceWelcome device={device} onProceed={handleProceed} />
          )}
          {view === VIEW.TYPE_SELECT && (
            <BackupTypeSelector onSelect={handleTypeSelect} onBack={handleBackToDevice} />
          )}
          {view === VIEW.FOLDERS && (
            <FolderExplorer
              device={device}
              mediaType={mediaType}
              skipAndroid={skipAndroid}
              onOpenFolder={handleOpenFolder}
              onBack={handleBackToType}
            />
          )}
          {view === VIEW.FOLDER_DETAIL && (
            <FolderDetail
              device={device}
              folder={activeFolder}
              mediaType={mediaType}
              onBack={handleBackToFolders}
            />
          )}
          {destinationDir && (
            <div style={{ display: view === VIEW.TRANSFER ? 'block' : 'none', height: '100%' }}>
              <TransferDashboard
                device={device}
                mediaType={mediaType}
                selectedFiles={selectedFiles}
                destinationDir={destinationDir}
                onFinish={handleTransferFinish}
              />
            </div>
          )}
        </main>
      </div>

      {/* Selection Footer */}
      {view !== VIEW.TRANSFER && !destinationDir && <SelectionFooter onNext={handleNext} />}

      {/* Scan Filter Modal */}
      <ScanFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSelect={handleScanChoice}
      />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <SelectionProvider>
        <AppContent />
      </SelectionProvider>
    </LanguageProvider>
  );
}

export default App;
