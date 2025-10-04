/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may
 * obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useEffect } from 'react';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';
import VoiceCall from './components/demo/VoiceCall';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { useUI, useUserSettings, useGoogleIntegrationStore } from './lib/state';

// Fix: Use process.env.API_KEY per coding guidelines.
const API_KEY = process.env.API_KEY as string;
if (typeof API_KEY !== 'string') {
  throw new Error(
    'Missing required environment variable: API_KEY'
  );
}

/**
 * Main application component that provides a streaming interface for Live API.
 * Manages video streaming state and provides controls for webcam/screen capture.
 */
function App() {
  const { isVoiceCallActive } = useUI();

  // Listener for the main window to receive auth confirmation from the popup.
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // Security: Check event origin in a production app
      if (event.origin !== window.location.origin) {
        return;
      }

      if (
        event.data?.type === 'google-auth-success' &&
        event.data?.payload?.userEmail &&
        event.data?.payload?.accessToken
      ) {
        useUserSettings
          .getState()
          .completeGmailConnection(event.data.payload.userEmail, event.data.payload.accessToken);
      } else if (event.data?.type === 'google-auth-error') {
        console.error('Google Auth Error:', event.data.error);
        alert(`Google Authentication Failed: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleAuthMessage);

    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  // Effect to handle the OAuth callback logic when the app is loaded in the popup.
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      // Only proceed if we're in a popup and have an authorization code.
      if (window.opener && code) {
        try {
          const { clientId, clientSecret, redirectUri } =
            useGoogleIntegrationStore.getState();

          // Exchange authorization code for access token.
          const tokenResponse = await fetch(
            'https://oauth2.googleapis.com/token',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
              }),
            },
          );

          const tokenData = await tokenResponse.json();
          if (!tokenResponse.ok) {
            throw new Error(
              tokenData.error_description || 'Failed to exchange token.',
            );
          }
          
          const accessToken = tokenData.access_token;

          // Use access token to get user info.
          const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );

          const userInfo = await userInfoResponse.json();
          if (!userInfoResponse.ok) {
            throw new Error(
              userInfo.error_description || 'Failed to fetch user info.',
            );
          }

          // Send success message with user email and token to the main window.
          window.opener.postMessage(
            {
              type: 'google-auth-success',
              payload: { userEmail: userInfo.email, accessToken },
            },
            window.location.origin,
          );
        } catch (error) {
          console.error('OAuth callback error:', error);
          // Send error message to the main window.
          window.opener.postMessage(
            { type: 'google-auth-error', error: (error as Error).message },
            window.location.origin,
          );
        } finally {
          // Close the popup window.
          window.close();
        }
      }
    };

    handleOAuthCallback();
  }, []);

  // If the app is loaded in the auth popup, render a loading message instead of the full UI.
  const params = new URLSearchParams(window.location.search);
  if (window.opener && params.has('code')) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#000',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <p>Authenticating, please wait...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <LiveAPIProvider apiKey={API_KEY}>
        <ErrorScreen />
        {isVoiceCallActive && <VoiceCall />}
        <Header />
        <Sidebar />
        <div className="main-container">
          <main>
            <StreamingConsole />
            <ControlTray />
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
