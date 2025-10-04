/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './WelcomeScreen.css';

const WelcomeScreen: React.FC = () => {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h2 className="welcome-title">What can I help with?</h2>
        <div className="suggestion-chips">
          <button className="chip chip-image">
            <span className="material-symbols-outlined">palette</span>
            Create image
          </button>
          <button className="chip chip-summarize">
            <span className="material-symbols-outlined">summarize</span>
            Summarize text
          </button>
          <button className="chip chip-write">
            <span className="material-symbols-outlined">edit_square</span>
            Help me write
          </button>
          <button className="chip chip-more">More</button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;