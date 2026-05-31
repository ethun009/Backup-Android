import React from 'react';
import { Globe, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const ScanFilterModal = ({ isOpen, onClose, onSelect }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <h2>{t('Choose Scan Mode')}</h2>
        <p className="text-muted">{t('Exclude system and app data folders for a cleaner backup')}</p>

        <div className="modal-options">
          <button className="modal-option-btn" onClick={() => onSelect(false)}>
            <div className="modal-option-icon full">
              <Globe size={24} />
            </div>
            <div className="modal-option-text">
              <h3>{t('Full Scan')}</h3>
              <p>{t('Scan every folder including /Android/data and /Android/obb')}</p>
            </div>
          </button>

          <button className="modal-option-btn" onClick={() => onSelect(true)}>
            <div className="modal-option-icon except">
              <ShieldCheck size={24} />
            </div>
            <div className="modal-option-text">
              <h3>{t('Scan Except Android')}</h3>
              <p>{t('Recommended. Skips system/app folders for faster discovery')}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanFilterModal;
