import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations.js';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children, initialLanguage = 'ENG' }) => {
  const [language, setLanguage] = useState(initialLanguage);

  const t = (key) => {
    const langKey = language === 'ENG' ? 'en' : 'bn';
    return translations[langKey][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
