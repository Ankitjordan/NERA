import React from 'react';
import { Navigation, Moon, Sun, Key } from 'lucide-react';
import { LANGUAGES, useI18n } from '../i18n';

interface HeaderProps {
  token: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenTokenModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  token, theme, onToggleTheme, onOpenTokenModal,
}) => (
  <HeaderContent token={token} theme={theme} onToggleTheme={onToggleTheme} onOpenTokenModal={onOpenTokenModal} />
);

const HeaderContent: React.FC<HeaderProps> = ({
  token, theme, onToggleTheme, onOpenTokenModal,
}) => {
  const { language, setLanguage, t } = useI18n();

  return <header className="nav-header">
    <div className="header-brand">
      <div className="brand-logo">
        <Navigation size={16} />
      </div>
      <div>
        <div className="brand-title-line">
          <span className="brand-name">NERA</span>
          <span className="brand-badge">{t('navigator')}</span>
        </div>
        <p className="brand-sub">{t('northEastRouteAnalytics')}</p>
      </div>
    </div>

    <div className="header-right-tools">
      <label className="language-selector">
        <span className="sr-only">{t('language')}</span>
        <select aria-label={t('language')} value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
          {LANGUAGES.map((option) => (
            <option key={option.code} value={option.code}>{option.nativeName}</option>
          ))}
        </select>
      </label>
      <button className="theme-toggle-pill" onClick={onToggleTheme}
        title={`${t('switchTo')} ${theme === 'dark' ? t('light') : t('dark')} ${t('mode')}`}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        <span>{theme === 'dark' ? t('light') : t('dark')}</span>
      </button>
      <button className={`token-badge-btn ${token ? 'valid' : ''}`}
        onClick={onOpenTokenModal} title={t('configureMapplsKey')}>
        <Key size={13} />
        <span>{token ? t('active') : t('setKey')}</span>
        <span className={`status-indicator ${token ? 'online' : 'offline'}`} />
      </button>
    </div>
  </header>
};
