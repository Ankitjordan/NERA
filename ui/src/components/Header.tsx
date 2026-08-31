import React from 'react';
import { Navigation, Moon, Sun, Key } from 'lucide-react';

interface HeaderProps {
  token: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenTokenModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  token, theme, onToggleTheme, onOpenTokenModal,
}) => (
  <header className="nav-header">
    <div className="header-brand">
      <div className="brand-logo">
        <Navigation size={16} />
      </div>
      <div>
        <div className="brand-title-line">
          <span className="brand-name">NERA</span>
          <span className="brand-badge">Navigator</span>
        </div>
        <p className="brand-sub">North East Route Analytics</p>
      </div>
    </div>

    <div className="header-right-tools">
      <button className="theme-toggle-pill" onClick={onToggleTheme}
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
      <button className={`token-badge-btn ${token ? 'valid' : ''}`}
        onClick={onOpenTokenModal} title="Configure Mappls Key">
        <Key size={13} />
        <span>{token ? 'Active' : 'Set Key'}</span>
        <span className={`status-indicator ${token ? 'online' : 'offline'}`} />
      </button>
    </div>
  </header>
);
