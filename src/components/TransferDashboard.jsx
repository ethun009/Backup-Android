import React, { useEffect, useState } from 'react';
import { HardDrive, AlertTriangle, CheckCircle, FolderOpen, Loader, XCircle, RefreshCcw } from 'lucide-react';
import { formatBytes } from '../context/SelectionContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const TransferDashboard = ({ device, mediaType, selectedFiles, destinationDir, onFinish }) => {
  const { t } = useLanguage();
  const [progressState, setProgressState] = useState({
    status: 'starting', // starting, transferring, complete, aborted
    fileIndex: 0,
    fileName: '',
    fileBytesTransferred: 0,
    fileSize: 0,
    completedFiles: 0,
    totalFiles: Object.keys(selectedFiles).length,
    completedBytes: 0,
    totalBytes: Object.values(selectedFiles).reduce((acc, f) => acc + (f.size || 0), 0),
    speed: 0,
    eta: 0,
    failedFiles: []
  });

  const [backupPath, setBackupPath] = useState(null);

  useEffect(() => {
    let unmounted = false;

    // Start transfer request
    const filesArray = Object.values(selectedFiles);
    window.adbAPI.startTransfer({
      serial: device.serial,
      phoneName: device.model,
      mediaType,
      destinationDir,
      files: filesArray,
    }).then((res) => {
      if (!unmounted && res.aborted) {
        setProgressState(prev => ({ ...prev, status: 'aborted' }));
      }
    });

    // Listeners
    window.adbAPI.onTransferFileStart((data) => {
      if (unmounted) return;
      setProgressState(prev => ({
        ...prev,
        status: 'transferring',
        fileIndex: data.index,
        fileName: data.name,
        fileSize: data.size,
        fileBytesTransferred: 0
      }));
    });

    window.adbAPI.onTransferProgress((data) => {
      if (unmounted) return;
      setProgressState(prev => ({
        ...prev,
        fileIndex: data.fileIndex,
        fileName: data.fileName,
        fileBytesTransferred: data.fileBytesTransferred,
        fileSize: data.fileSize,
        completedFiles: data.completedFiles,
        completedBytes: data.completedBytes,
        speed: data.speed,
        eta: data.eta
      }));
    });

    window.adbAPI.onTransferFileError((data) => {
      if (unmounted) return;
      setProgressState(prev => ({
        ...prev,
        failedFiles: [...prev.failedFiles, { name: data.name, path: data.path, size: data.size, error: data.error }]
      }));
    });

    window.adbAPI.onTransferComplete((data) => {
      if (unmounted) return;
      setBackupPath(data.backupDir);
      setProgressState(prev => ({
        ...prev,
        status: 'complete',
        completedFiles: data.completedFiles,
        failedFiles: data.failedFiles && data.failedFiles.length > 0 ? data.failedFiles : prev.failedFiles,
      }));
    });

    return () => {
      unmounted = true;
      window.adbAPI.removeTransferListeners();
    };
  }, [device, mediaType, selectedFiles, destinationDir]);

  const handleAbort = () => {
    window.adbAPI.abortTransfer();
  };

  const handleOpenFolder = () => {
    if (backupPath) {
      window.adbAPI.openFolder(backupPath);
    }
  };

  const percentComplete = progressState.totalBytes
    ? Math.min(100, Math.round((progressState.completedBytes / progressState.totalBytes) * 100))
    : 0;

  const currentFilePercent = progressState.fileSize
    ? Math.min(100, Math.round((progressState.fileBytesTransferred / progressState.fileSize) * 100))
    : 0;

  function formatTime(seconds) {
    if (seconds === null || seconds === undefined || seconds < 0 || !isFinite(seconds)) return t('Calculating...');
    if (seconds === 0 && progressState.completedBytes > 0) return '0s';
    if (seconds === 0) return t('Calculating...');
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }

  const handleRetry = () => {
    const filesToRetry = progressState.failedFiles.map(f => ({
      name: f.name,
      path: f.path,
      size: f.size || 0
    }));

    const newTotalBytes = filesToRetry.reduce((acc, f) => acc + f.size, 0);

    setProgressState(prev => ({
      ...prev,
      status: 'starting',
      fileIndex: 0,
      fileName: '',
      fileBytesTransferred: 0,
      fileSize: 0,
      completedFiles: 0,
      totalFiles: filesToRetry.length,
      completedBytes: 0,
      totalBytes: newTotalBytes,
      speed: 0,
      eta: 0,
      failedFiles: [] // Reset failed files for this new run
    }));

    window.adbAPI.startTransfer({
      serial: device.serial,
      phoneName: device.model,
      mediaType,
      destinationDir,
      files: filesToRetry,
    }).then((res) => {
      if (res.aborted) {
        setProgressState(prev => ({ ...prev, status: 'aborted' }));
      }
    });
  };

  // Layout rendering
  if (progressState.status === 'complete') {
    return (
      <div className="transfer-dashboard complete-state">
        <div className="status-icon-large success-glow">
          <CheckCircle size={80} color="var(--success)" />
        </div>
        <h1>{t('Backup Complete!')}</h1>
        <p className="text-muted" style={{ marginBottom: '30px' }}>
          {t('Successfully backed up')} {progressState.completedFiles} {t('files')} ({formatBytes(progressState.completedBytes)}).
        </p>

        {progressState.failedFiles.length > 0 && (
          <div className="failed-files-alert" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#fbbf24" />
              <span>{progressState.failedFiles.length} {t('files failed to transfer.')}</span>
            </div>
            <div style={{ marginTop: '10px', maxHeight: '110px', overflowY: 'auto', width: '100%', fontSize: '0.82rem', textAlign: 'left', opacity: 0.9 }}>
              {progressState.failedFiles.map((f, i) => (
                <div key={i} style={{ marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.name} - {f.error}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="complete-actions">
          {progressState.failedFiles.length > 0 && (
            <button className="btn-secondary" style={{ borderColor: 'rgba(251, 191, 36, 0.4)', color: '#fbbf24' }} onClick={handleRetry}>
              <RefreshCcw size={18} /> {t('Retry Failed')}
            </button>
          )}
          <button className="btn-secondary" onClick={handleOpenFolder}>
            <FolderOpen size={18} /> {t('Open Backup Folder')}
          </button>
          <button className="btn-primary" onClick={onFinish}>
            {t('Done')}
          </button>
        </div>
      </div>
    );
  }

  if (progressState.status === 'aborted') {
    return (
      <div className="transfer-dashboard complete-state">
        <div className="status-icon-large danger-glow">
          <XCircle size={80} color="var(--danger)" />
        </div>
        <h1>{t('Backup Cancelled')}</h1>
        <p className="text-muted" style={{ marginBottom: '30px' }}>
          {t('The transfer was stopped. Partial files may remain in the destination folder.')}
        </p>
        <button className="btn-primary" onClick={onFinish}>
          {t('Return to Dashboard')}
        </button>
      </div>
    );
  }

  // Transferring State
  return (
    <div className="transfer-dashboard">
      <div className="transfer-header">
        <h1>{t('Backing up device...')}</h1>
        <p className="text-muted">{t('Do not disconnect your phone during this process.')}</p>
      </div>

      <div className="progress-card glass-panel">
        <div className="progress-info-top">
          <div className="progress-stat">
            <span className="stat-label">{t('Progress')}</span>
            <span className="stat-value">{percentComplete}%</span>
          </div>
          <div className="progress-stat">
            <span className="stat-label">{t('Speed')}</span>
            <span className="stat-value">{formatBytes(progressState.speed)}/s</span>
          </div>
          <div className="progress-stat">
            <span className="stat-label">{t('ETA')}</span>
            <span className="stat-value">{formatTime(progressState.eta)}</span>
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${percentComplete}%` }}></div>
        </div>
        
        <div className="progress-info-bottom">
          <span>{formatBytes(progressState.completedBytes)} / {formatBytes(progressState.totalBytes)}</span>
          <span>{progressState.completedFiles} / {progressState.totalFiles} {t('files')}</span>
        </div>
      </div>

      <div className="current-file-card glass-panel">
        <div className="current-file-header">
          <Loader size={16} className="spin" color="var(--primary-blue)" />
          <span className="current-file-label">{t('Currently transferring:')}</span>
        </div>
        <div className="current-file-name" title={progressState.fileName}>
          {progressState.fileName || 'Initializing...'}
        </div>
        <div className="micro-progress">
          <div className="micro-progress-fill" style={{ width: `${currentFilePercent}%` }}></div>
        </div>
      </div>

      <div className="transfer-actions">
        <button className="btn-cancel" onClick={handleAbort}>
          <XCircle size={18} /> {t('Cancel Transfer')}
        </button>
      </div>
    </div>
  );
};

export default TransferDashboard;
