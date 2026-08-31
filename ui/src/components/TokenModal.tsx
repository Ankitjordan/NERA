import React, { useState } from 'react';
import { Key, Shield, ExternalLink, X, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { requestMapplsOAuthToken } from '../services/mapplsAuth';

interface TokenModalProps {
  isOpen: boolean;
  currentToken: string;
  onClose: () => void;
  onSaveToken: (token: string) => void;
}

export const TokenModal: React.FC<TokenModalProps> = ({
  isOpen,
  currentToken,
  onClose,
  onSaveToken,
}) => {
  const [authMode, setAuthMode] = useState<'static' | 'oauth'>('static');
  const [staticKey, setStaticKey] = useState(currentToken);
  const [clientId, setClientId] = useState(import.meta.env.VITE_MAPPLS_CLIENT_ID || '');
  const [clientSecret, setClientSecret] = useState(import.meta.env.VITE_MAPPLS_CLIENT_SECRET || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStaticSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(staticKey.trim());
    onClose();
  };

  const handleOAuthGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setOauthError('Please enter both Client ID and Client Secret.');
      return;
    }

    setIsGenerating(true);
    setOauthError(null);
    setOauthSuccess(null);

    try {
      const response = await requestMapplsOAuthToken(clientId, clientSecret);
      if (response.access_token) {
        setOauthSuccess(`Access token generated successfully! (Expires in ${response.expires_in}s)`);
        onSaveToken(response.access_token);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setOauthError('No access token received in response.');
      }
    } catch (err: any) {
      setOauthError(err?.message || 'Failed to generate OAuth token. Check your credentials.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <Key size={20} />
            </div>
            <div>
              <h3 className="modal-title">Mappls Authentication Setup</h3>
              <p className="modal-subtitle">Web Maps JavaScript SDK & OAuth 2.0</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-row">
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'static' ? 'active' : ''}`}
            onClick={() => setAuthMode('static')}
          >
            <Zap size={14} />
            Static Key / Web Token
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authMode === 'oauth' ? 'active' : ''}`}
            onClick={() => setAuthMode('oauth')}
          >
            <RefreshCw size={14} />
            OAuth 2.0 (Client ID & Secret)
          </button>
        </div>

        {authMode === 'static' ? (
          <form onSubmit={handleStaticSubmit} className="modal-form">
            <div className="form-group">
              <label className="form-label">Static Key / Web SDK Token</label>
              <input
                type="text"
                className="token-input-field"
                placeholder="Paste static key from Mappls Console..."
                value={staticKey}
                onChange={(e) => setStaticKey(e.target.value)}
                autoFocus
              />
            </div>

            <div className="token-instructions">
              <div className="instruction-item">
                <CheckCircle2 size={15} className="inst-icon success" />
                <span>
                  Get your static key from{' '}
                  <a
                    href="https://auth.mappls.com/console"
                    target="_blank"
                    rel="noreferrer"
                    className="link-highlight"
                  >
                    auth.mappls.com/console <ExternalLink size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </a>
                </span>
              </div>
              <div className="instruction-item">
                <Shield size={15} className="inst-icon primary" />
                <span>
                  Save in <code>ui/.env.local</code>:
                </span>
              </div>
              <pre className="env-code-block">
                VITE_MAPPLS_ACCESS_TOKEN={staticKey || 'your_static_key_here'}
              </pre>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save & Apply Key
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOAuthGenerate} className="modal-form">
            <div className="form-group">
              <label className="form-label">Client ID</label>
              <input
                type="text"
                className="token-input-field"
                placeholder="e.g. 960xxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Client Secret</label>
              <input
                type="password"
                className="token-input-field"
                placeholder="e.g. lrFxJa5xxxxxxxxxxxxxxxxxxxx"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            {oauthError && (
              <div className="auth-alert error">
                <AlertCircle size={15} className="shrink-0" />
                <span>{oauthError}</span>
              </div>
            )}

            {oauthSuccess && (
              <div className="auth-alert success">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{oauthSuccess}</span>
              </div>
            )}

            <div className="token-instructions">
              <div className="instruction-item">
                <Shield size={15} className="inst-icon primary" />
                <span>
                  Calls <code>https://outpost.mappls.com/api/security/oauth/token</code> via client_credentials grant.
                </span>
              </div>
              <div className="instruction-item">
                <span>Or save in <code>ui/.env.local</code>:</span>
              </div>
              <pre className="env-code-block">
                VITE_MAPPLS_CLIENT_ID={clientId || 'your_client_id'}{'\n'}
                VITE_MAPPLS_CLIENT_SECRET={clientSecret || 'your_client_secret'}
              </pre>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="btn-primary flex items-center gap-2"
              >
                {isGenerating && <RefreshCw size={14} className="animate-spin" />}
                {isGenerating ? 'Generating Token...' : 'Generate & Load Map'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
