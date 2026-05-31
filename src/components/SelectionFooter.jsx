import React from 'react';
import { CheckCircle, Trash2, ArrowRight } from 'lucide-react';
import { useSelection } from '../context/SelectionContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const SelectionFooter = ({ onNext }) => {
  const { t } = useLanguage();
  const { summary, clearAll } = useSelection();

  if (summary.totalFiles === 0) return null;

  return (
    <div className="selection-footer glass-panel">
      <div className="selection-footer-info">
        <CheckCircle size={20} color="var(--success)" />
        <span className="selection-footer-count">
          <strong>{summary.totalFiles}</strong> {t('files selected')}
        </span>
        <span className="selection-footer-divider">•</span>
        <span className="selection-footer-size">{summary.totalSizeFormatted}</span>
      </div>

      <div className="selection-footer-actions">
        <button className="btn-secondary btn-sm" onClick={clearAll}>
          <Trash2 size={16} /> {t('Clear')}
        </button>
        <button className="btn-primary btn-sm" onClick={onNext}>
          {t('Next')} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default SelectionFooter;
