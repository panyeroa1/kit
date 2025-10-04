/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  FunctionCall,
  useSettings,
  useUI,
  useTools,
  useUserSettings,
  useGoogleIntegrationStore,
  useSupabaseIntegrationStore,
  useWhatsAppIntegrationStore,
} from '@/lib/state';
import c from 'classnames';
import { AVAILABLE_VOICES_MAP } from '@/lib/constants';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import { useState, useEffect } from 'react';
import ToolEditorModal from './ToolEditorModal';

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const { tools, toggleTool, addTool, removeTool, updateTool } = useTools();
  const { connected } = useLiveAPIContext();
  const {
    isGmailConnected,
    userEmail,
    connectGmail,
    disconnectGmail,
    personaName,
    rolesAndDescription,
    voice,
    setVoice,
    savePersona,
  } = useUserSettings();

  const googleIntegration = useGoogleIntegrationStore();
  const supabaseIntegration = useSupabaseIntegrationStore();
  const whatsAppIntegration = useWhatsAppIntegrationStore();

  const [editingTool, setEditingTool] = useState<FunctionCall | null>(null);
  const [activeTab, setActiveTab] = useState('server');

  // Local state for persona editing
  const [localPersonaName, setLocalPersonaName] = useState(personaName);
  const [localRolesAndDescription, setLocalRolesAndDescription] =
    useState(rolesAndDescription);

  useEffect(() => {
    setLocalPersonaName(personaName);
  }, [personaName]);

  useEffect(() => {
    setLocalRolesAndDescription(rolesAndDescription);
  }, [rolesAndDescription]);

  const handleSaveTool = (updatedTool: FunctionCall) => {
    if (editingTool) {
      updateTool(editingTool.name, updatedTool);
    }
    setEditingTool(null);
  };

  const handleSavePersona = async () => {
    await savePersona(localPersonaName, localRolesAndDescription);
  };

  const hasPersonaChanges =
    localPersonaName !== personaName ||
    localRolesAndDescription !== rolesAndDescription;

  return (
    <>
      <aside className={c('sidebar', { open: isSidebarOpen })}>
        <div className="sidebar-header">
          <h3>Settings</h3>
          <button onClick={toggleSidebar} className="close-button">
            <span className="icon">close</span>
          </button>
        </div>

        <div className="sidebar-tabs">
          <button
            className={c('sidebar-tab', { active: activeTab === 'server' })}
            onClick={() => setActiveTab('server')}
            aria-controls="server-settings-panel"
            aria-selected={activeTab === 'server'}
            role="tab"
          >
            Server Settings
          </button>
          <button
            className={c('sidebar-tab', { active: activeTab === 'user' })}
            onClick={() => setActiveTab('user')}
            aria-controls="user-settings-panel"
            aria-selected={activeTab === 'user'}
            role="tab"
          >
            User Settings
          </button>
        </div>

        <div className="sidebar-content">
          {activeTab === 'server' && (
            <div
              id="server-settings-panel"
              className="tab-panel"
              role="tabpanel"
              aria-labelledby="server-settings-tab"
            >
              <div className="sidebar-section settings-card">
                <h4 className="sidebar-section-title">Branding</h4>
                <p className="description-text">
                  Customize your agent's appearance. Find icons at{' '}
                  <a
                    href="https://fonts.google.com/icons"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Fonts
                  </a>
                  .
                </p>
              </div>

              <div className="sidebar-section settings-card">
                <h4 className="sidebar-section-title">
                  Google OAuth Credentials
                </h4>
                <p className="description-text">
                  Configure credentials from your{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Cloud Console
                  </a>
                  .
                </p>
                <fieldset disabled={connected || googleIntegration.isConfigured}>
                  <label>
                    Client ID
                    <input
                      type="text"
                      placeholder="e.g., your-id.apps.googleusercontent.com"
                      value={googleIntegration.clientId}
                      onChange={e =>
                        googleIntegration.setClientId(e.target.value)
                      }
                      aria-invalid={!!googleIntegration.errors.clientId}
                    />
                    {googleIntegration.errors.clientId && (
                      <p className="validation-error">
                        {googleIntegration.errors.clientId}
                      </p>
                    )}
                  </label>
                  <label>
                    Client Secret
                    <input
                      type="password"
                      placeholder="Enter your client secret"
                      value={googleIntegration.clientSecret}
                      onChange={e =>
                        googleIntegration.setClientSecret(e.target.value)
                      }
                      aria-invalid={!!googleIntegration.errors.clientSecret}
                    />
                    {googleIntegration.errors.clientSecret && (
                      <p className="validation-error">
                        {googleIntegration.errors.clientSecret}
                      </p>
                    )}
                  </label>
                </fieldset>
                <div className="credential-actions">
                  {googleIntegration.isConfigured ? (
                    <div className="status-indicator configured">
                      <span className="icon">check_circle</span> Correctly
                      Configured
                    </div>
                  ) : (
                    <>
                      {googleIntegration.isValidated &&
                        !Object.keys(googleIntegration.errors).length && (
                          <p className="validation-success">
                            <span className="icon">check</span> All good. You
                            can Save.
                          </p>
                        )}
                      <div className="action-buttons">
                        <button
                          className="secondary-button"
                          onClick={googleIntegration.validateCredentials}
                          disabled={connected}
                        >
                          Check
                        </button>
                        <button
                          className="gradient-button"
                          onClick={googleIntegration.saveCredentials}
                          disabled={!googleIntegration.isValidated || connected}
                        >
                          Save
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="sidebar-section settings-card">
                <h4 className="sidebar-section-title">WhatsApp Credentials</h4>
                <p className="description-text">
                  Configure your WhatsApp Business API credentials from your{' '}
                  <a
                    href="https://developers.facebook.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Meta for Developers
                  </a>
                  .
                </p>
                <fieldset
                  disabled={connected || whatsAppIntegration.isConfigured}
                >
                  <label>
                    Phone Number ID
                    <input
                      type="text"
                      placeholder="Enter your Phone Number ID"
                      value={whatsAppIntegration.phoneNumberId}
                      onChange={e =>
                        whatsAppIntegration.setPhoneNumberId(e.target.value)
                      }
                      aria-invalid={!!whatsAppIntegration.errors.phoneNumberId}
                    />
                    {whatsAppIntegration.errors.phoneNumberId && (
                      <p className="validation-error">
                        {whatsAppIntegration.errors.phoneNumberId}
                      </p>
                    )}
                  </label>
                  <label>
                    WhatsApp Business Account ID
                    <input
                      type="text"
                      placeholder="Enter your WABA ID"
                      value={whatsAppIntegration.wabaId}
                      onChange={e =>
                        whatsAppIntegration.setWabaId(e.target.value)
                      }
                      aria-invalid={!!whatsAppIntegration.errors.wabaId}
                    />
                    {whatsAppIntegration.errors.wabaId && (
                      <p className="validation-error">
                        {whatsAppIntegration.errors.wabaId}
                      </p>
                    )}
                  </label>
                  <label>
                    Access Token
                    <input
                      type="password"
                      placeholder="Enter your temporary or permanent token"
                      value={whatsAppIntegration.accessToken}
                      onChange={e =>
                        whatsAppIntegration.setAccessToken(e.target.value)
                      }
                      aria-invalid={!!whatsAppIntegration.errors.accessToken}
                    />
                    {whatsAppIntegration.errors.accessToken && (
                      <p className="validation-error">
                        {whatsAppIntegration.errors.accessToken}
                      </p>
                    )}
                  </label>
                </fieldset>
                <div className="credential-actions">
                  {whatsAppIntegration.isConfigured ? (
                    <div className="status-indicator configured">
                      <span className="icon">check_circle</span> Correctly
                      Configured
                    </div>
                  ) : (
                    <>
                      {whatsAppIntegration.isValidated &&
                        !Object.keys(whatsAppIntegration.errors).length && (
                          <p className="validation-success">
                            <span className="icon">check</span> All good. You
                            can Save.
                          </p>
                        )}
                      <div className="action-buttons">
                        <button
                          className="secondary-button"
                          onClick={whatsAppIntegration.validateCredentials}
                          disabled={connected}
                        >
                          Check
                        </button>
                        <button
                          className="gradient-button"
                          onClick={whatsAppIntegration.saveCredentials}
                          disabled={!whatsAppIntegration.isValidated || connected}
                        >
                          Save
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="sidebar-section settings-card">
                <h4 className="sidebar-section-title">Supabase Credentials</h4>
                <p className="description-text">
                  Supabase credentials have been pre-configured for this
                  application.
                </p>
                <div className="credential-actions">
                  <div className="status-indicator configured">
                    <span className="icon">check_circle</span> Correctly
                    Configured
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'user' && (
            <div
              id="user-settings-panel"
              className="tab-panel"
              role="tabpanel"
              aria-labelledby="user-settings-tab"
            >
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Persona</h4>
                <fieldset disabled={connected}>
                  <label>
                    Persona Name
                    <input
                      type="text"
                      value={localPersonaName}
                      onChange={e => setLocalPersonaName(e.target.value)}
                      placeholder="Give your assistant a name"
                    />
                  </label>
                  <label>
                    Roles and description
                    <textarea
                      value={localRolesAndDescription}
                      onChange={e =>
                        setLocalRolesAndDescription(e.target.value)
                      }
                      rows={6}
                      placeholder="Describe the role and personality of the AI..."
                    />
                  </label>
                  <label>
                    Voice
                    <select
                      value={voice}
                      onChange={e => setVoice(e.target.value)}
                    >
                      {AVAILABLE_VOICES_MAP.map(v => (
                        <option key={v.value} value={v.value}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                <div className="persona-actions">
                  <button
                    className="gradient-button"
                    onClick={handleSavePersona}
                    disabled={!hasPersonaChanges || connected}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Integration Tools</h4>
                {googleIntegration.isConfigured ? (
                  <div className="integration-item">
                    <div className="integration-info">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M17.64 9.20455C17.64 8.56682 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.6127V15.7132H14.8323C16.6432 14.0777 17.64 11.8545 17.64 9.20455Z"
                          fill="#4285F4"
                        ></path>
                        <path
                          d="M9 18C11.43 18 13.4673 17.1941 14.8323 15.7132L12.0477 13.6127C11.2418 14.1277 10.2109 14.4205 9 14.4205C6.96273 14.4205 5.23091 13.0127 4.60636 11.1818H1.79591V13.3541C3.24273 16.09 5.86636 18 9 18Z"
                          fill="#34A853"
                        ></path>
                        <path
                          d="M4.60636 11.1818C4.41818 10.6368 4.32273 10.0595 4.32273 9.47045C4.32273 8.88136 4.41818 8.30409 4.60636 7.75909V5.58682H1.79591C1.22182 6.71182 0.899999 7.99091 0.899999 9.47045C0.899999 10.95 1.22182 12.2291 1.79591 13.3541L4.60636 11.1818Z"
                          fill="#FBBC05"
                        ></path>
                        <path
                          d="M9 4.52045C10.3214 4.52045 11.5077 4.99136 12.4827 5.90818L14.8936 3.49727C13.4673 2.18955 11.43 1.36364 9 1.36364C5.86636 1.36364 3.24273 3.91 1.79591 6.64591L4.60636 8.81818C5.23091 6.98727 6.96273 5.57955 9 5.57955V4.52045Z"
                          fill="#EA4335"
                        ></path>
                      </svg>
                      <strong>Gmail</strong>
                    </div>
                    {isGmailConnected ? (
                      <div className="integration-connected">
                        <span>{userEmail}</span>
                        <button
                          onClick={disconnectGmail}
                          className="disconnect-button"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={connectGmail}
                        className="connect-button google-connect"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M17.64 9.20455C17.64 8.56682 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.6127V15.7132H14.8323C16.6432 14.0777 17.64 11.8545 17.64 9.20455Z"
                            fill="#4285F4"
                          ></path>
                          <path
                            d="M9 18C11.43 18 13.4673 17.1941 14.8323 15.7132L12.0477 13.6127C11.2418 14.1277 10.2109 14.4205 9 14.4205C6.96273 14.4205 5.23091 13.0127 4.60636 11.1818H1.79591V13.3541C3.24273 16.09 5.86636 18 9 18Z"
                            fill="#34A853"
                          ></path>
                          <path
                            d="M4.60636 11.1818C4.41818 10.6368 4.32273 10.0595 4.32273 9.47045C4.32273 8.88136 4.41818 8.30409 4.60636 7.75909V5.58682H1.79591C1.22182 6.71182 0.899999 7.99091 0.899999 9.47045C0.899999 10.95 1.22182 12.2291 1.79591 13.3541L4.60636 11.1818Z"
                            fill="#FBBC05"
                          ></path>
                          <path
                            d="M9 4.52045C10.3214 4.52045 11.5077 4.99136 12.4827 5.90818L14.8936 3.49727C13.4673 2.18955 11.43 1.36364 9 1.36364C5.86636 1.36364 3.24273 3.91 1.79591 6.64591L4.60636 8.81818C5.23091 6.98727 6.96273 5.57955 9 5.57955V4.52045Z"
                            fill="#EA4335"
                          ></path>
                        </svg>
                        Connect with Google
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="integration-not-configured">
                    <p>Google integration not yet configured by admin.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
      {editingTool && (
        <ToolEditorModal
          tool={editingTool}
          onClose={() => setEditingTool(null)}
          onSave={handleSaveTool}
        />
      )}
    </>
  );
}