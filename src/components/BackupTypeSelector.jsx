import React from 'react';
import { Image, Film, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const BackupTypeSelector = ({ onSelect, onBack }) => {
  const { t } = useLanguage();
  return (
    <div className="type-selector-container">
      <button className="btn-back" onClick={onBack}>
        <ArrowLeft size={18} /> {t('Back to Device')}
      </button>

      <div className="type-selector-header">
        <h1>{t('What do you want to backup?')}</h1>
        <p className="text-muted">{t('Choose the type of media to scan from your device')}</p>
      </div>

      <div className="type-cards-grid">
        <button className="type-card" id="btn-backup-images" onClick={() => onSelect('image')}>
          <div className="type-card-icon type-card-icon--image">
            <Image size={48} />
          </div>
          <h2>{t('Images')}</h2>
          <p>{t('JPG, PNG, HEIC, WebP, GIF, BMP, SVG')}</p>
        </button>

        <button className="type-card" id="btn-backup-videos" onClick={() => onSelect('video')}>
          <div className="type-card-icon type-card-icon--video">
            <Film size={48} />
          </div>
          <h2>{t('Videos')}</h2>
          <p>{t('MP4, MKV, AVI, MOV, WebM, 3GP, FLV')}</p>
        </button>
      </div>
    </div>
  );
};

export default BackupTypeSelector;
