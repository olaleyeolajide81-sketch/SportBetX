import React from 'react';
import { useI18n } from '../i18n/I18nProvider';

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, availableLocales } = useI18n();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
      className="px-3 py-1 rounded border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Select language"
    >
      {availableLocales.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );
};
