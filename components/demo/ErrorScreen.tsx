/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import React, { useEffect, useState } from 'react';
import cn from 'classnames';

export interface ExtendedErrorType {
  code?: number;
  message?: string;
  status?: string;
}

export default function ErrorScreen() {
  const { client } = useLiveAPIContext();
  const [error, setError] = useState<{ message?: string } | null>(null);

  useEffect(() => {
    function onError(error: ErrorEvent) {
      console.error(error);
      setError(error);
    }

    client.on('error', onError);

    return () => {
      client.off('error', onError);
    };
  }, [client]);

  const quotaErrorMessage =
    'Daily free quota for the Gemini Live API has been reached. Please come back tomorrow to continue.';

  if (!error) {
    return <div style={{ display: 'none' }} />;
  }

  const isQuotaError = !!error?.message?.includes('RESOURCE_EXHAUSTED');
  const errorMessage = isQuotaError
    ? quotaErrorMessage
    : 'An unexpected error occurred. Please try again.';
  const rawMessage: string | null = isQuotaError ? null : error?.message || null;

  return (
    <div className="error-screen">
      <div
        style={{
          fontSize: 48,
        }}
      >
        💔
      </div>
      <div
        className={cn('error-message-container', { 'quota-error': isQuotaError })}
      >
        {errorMessage}
      </div>
      {!isQuotaError && (
        <button
          className="close-button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Try Again
        </button>
      )}
      {rawMessage ? (
        <div
          className="error-raw-message-container"
        >
          {rawMessage}
        </div>
      ) : null}
    </div>
  );
}