import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader, CheckSquare, Square, Image, Film, FileVideo, FileImage } from 'lucide-react';
import { useSelection, formatBytes } from '../context/SelectionContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const FolderDetail = ({ device, folder, mediaType, onBack }) => {
  const { t } = useLanguage();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toggleFile, isFileSelected, selectFolder, deselectFolder, isFolderSelected } = useSelection();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await window.adbAPI.listFolderContents(device.serial, folder.path, mediaType);
        if (!cancelled) setFiles(result);
      } catch (err) {
        console.error('Failed to list:', err);
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [device.serial, folder.path, mediaType]);

  const allSelected = isFolderSelected(folder.path);
  const selectedCount = files.filter(f => isFileSelected(f.path)).length;
  const isPartial = !allSelected && selectedCount > 0;

  const handleSelectAll = () => {
    if (allSelected || selectedCount === files.length) {
      deselectFolder(folder.path, files);
    } else {
      selectFolder(folder.path, files);
    }
  };

  const FileIcon = mediaType === 'image' ? FileImage : FileVideo;

  if (loading) {
    return (
      <div className="scanning-container">
        <div className="cyber-loader">
          <div className="cyber-ring"></div>
          <div className="cyber-ring"></div>
          <div className="cyber-ring"></div>
        </div>
        <h2>{t('Loading files...')}</h2>
      </div>
    );
  }

  return (
    <div className="folder-detail">
      {/* Header */}
      <div className="folder-detail-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={18} /> {t('Back to Folders')}
        </button>
        <div className="folder-detail-title">
          <h1>{folder.name}</h1>
          <p className="text-muted">{folder.path}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="folder-detail-toolbar glass-panel">
        <button
          className={`btn-select-all ${allSelected || selectedCount === files.length ? 'btn-select-all--active' : ''}`}
          onClick={handleSelectAll}
        >
          {allSelected || selectedCount === files.length ? <CheckSquare size={18} /> : <Square size={18} />}
          {allSelected || selectedCount === files.length ? t('Deselect All') : t('Select All')}
        </button>
        <span className="text-muted">
          {selectedCount} / {files.length} {t('selected')}
        </span>
      </div>

      {/* File List */}
      <div className="file-list">
        {files.map(file => {
          const selected = isFileSelected(file.path);
          return (
            <div
              key={file.path}
              className={`file-row ${selected ? 'file-row--selected' : ''}`}
              onClick={() => toggleFile(file)}
            >
              <div className={`file-checkbox ${selected ? 'file-checkbox--checked' : ''}`}>
                {selected ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>
              <FileIcon size={20} className="file-icon" />
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-meta">{formatBytes(file.size)} {file.modified ? `• ${file.modified}` : ''}</span>
              </div>
              <span className="file-size-badge">{formatBytes(file.size)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FolderDetail;
