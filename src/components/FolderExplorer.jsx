import React, { useEffect, useState } from 'react';
import { Folder, FolderCheck, Loader, ArrowLeft, ChevronRight, Image, Film } from 'lucide-react';
import { useSelection, formatBytes } from '../context/SelectionContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const FolderExplorer = ({ device, mediaType, skipAndroid, onOpenFolder, onBack }) => {
  const { t } = useLanguage();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folderFiles, setFolderFiles] = useState({}); // folderPath → file[]
  const fileCacheRef = React.useRef({}); // Synchronous cache for loops
  const { selectFolder, deselectFolder, isFolderSelected, selectedFiles } = useSelection();

  useEffect(() => {
    let cancelled = false;

    const scan = async () => {
      setLoading(true);
      try {
        const result = await window.adbAPI.scanMediaFolders(device.serial, mediaType, skipAndroid);
        if (!cancelled) setFolders(result);
      } catch (err) {
        console.error('Scan failed:', err);
      }
      if (!cancelled) setLoading(false);
    };

    scan();
    return () => { cancelled = true; };
  }, [device.serial, mediaType, skipAndroid]);

  /**
   * Load the files for a folder (needed to pass into select/deselect).
   * We cache results so repeated toggles don't re-fetch.
   */
  const loadFolderFiles = async (folderPath) => {
    if (fileCacheRef.current[folderPath]) return fileCacheRef.current[folderPath];
    const files = await window.adbAPI.listFolderContents(device.serial, folderPath, mediaType);
    fileCacheRef.current[folderPath] = files;
    setFolderFiles(prev => ({ ...prev, [folderPath]: files }));
    return files;
  };

  const handleToggleFolder = async (folder) => {
    const files = await loadFolderFiles(folder.path);
    if (isFolderSelected(folder.path)) {
      deselectFolder(folder.path, files);
    } else {
      selectFolder(folder.path, files);
    }
  };

  /**
   * Count how many files from a specific folder are currently selected.
   */
  const getSelectedCountForFolder = (folderPath) => {
    return Object.values(selectedFiles).filter(f => {
      // Check if the file's path starts with the folder path
      const dir = f.path.substring(0, f.path.lastIndexOf('/'));
      return dir === folderPath;
    }).length;
  };

  if (loading) {
    return (
      <div className="scanning-container">
        <div className="cyber-loader">
          <div className="cyber-ring"></div>
          <div className="cyber-ring"></div>
          <div className="cyber-ring"></div>
        </div>
        <h2>{t('Scanning your device...')}</h2>
        <p className="text-muted">{mediaType === 'image' ? t('Looking for images in common directories') : t('Looking for videos in common directories')}</p>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="scanning-container">
        <h2>{mediaType === 'image' ? t('No images found') : t('No videos found')}</h2>
        <p className="text-muted">{t("We couldn't find any media of this type on your device.")}</p>
        <button className="btn-secondary" onClick={onBack} style={{ marginTop: '20px' }}>
          <ArrowLeft size={18} /> {t('Go Back')}
        </button>
      </div>
    );
  }

  const icon = mediaType === 'image' ? <Image size={16} /> : <Film size={16} />;

  return (
    <div className="folder-explorer">
      <div className="folder-explorer-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={18} /> {t('Back')}
        </button>
        <div>
          <h1>{mediaType === 'image' ? t('Image Folders') : t('Video Folders')}</h1>
          <p className="text-muted">{folders.length} {t('folders found • Click a folder to see files inside, or toggle the checkbox to select all')}</p>
        </div>
        
        <div style={{ marginLeft: 'auto' }}>
           <button 
             className={`btn-select-all ${folders.every(f => isFolderSelected(f.path)) ? 'btn-select-all--active' : ''}`}
             onClick={async () => {
               const allSelected = folders.every(f => isFolderSelected(f.path));
               setLoading(true);
               for (const folder of folders) {
                 const files = await loadFolderFiles(folder.path);
                 if (allSelected) {
                   deselectFolder(folder.path, files);
                 } else {
                   selectFolder(folder.path, files);
                 }
               }
               setLoading(false);
             }}
           >
             {folders.every(f => isFolderSelected(f.path)) ? t('Deselect All') : t('Select All Folders')}
           </button>
        </div>
      </div>

      <div className="folder-grid">
        {folders.map(folder => {
          const selected = isFolderSelected(folder.path);
          const partialCount = getSelectedCountForFolder(folder.path);
          const isPartial = !selected && partialCount > 0;

          return (
            <div
              key={folder.path}
              className={`folder-card glass-panel ${selected ? 'folder-card--selected' : ''} ${isPartial ? 'folder-card--partial' : ''}`}
            >
              {/* Checkbox area */}
              <button
                className={`folder-checkbox ${selected ? 'folder-checkbox--checked' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleToggleFolder(folder); }}
                title={selected ? t('Deselect entire folder') : t('Select entire folder')}
              >
                {selected ? <FolderCheck size={20} /> : <Folder size={20} />}
              </button>

              {/* Clickable body — navigates inside */}
              <div className="folder-card-body" onClick={() => onOpenFolder(folder)}>
                <div className="folder-card-info">
                  <h3>{folder.name}</h3>
                  <span className="folder-card-path">{folder.path}</span>
                </div>
                <div className="folder-card-meta">
                  <span className="folder-card-count">{icon} {folder.fileCount} {t('files')}</span>
                  <span className="folder-card-size">{formatBytes(folder.totalSize)}</span>
                  {isPartial && <span className="folder-card-partial">{partialCount} {t('selected')}</span>}
                </div>
                <ChevronRight size={20} className="folder-card-arrow" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FolderExplorer;
