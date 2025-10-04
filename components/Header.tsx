/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI } from '@/lib/state';

export default function Header() {
  const { toggleSidebar } = useUI();

  return (
    <header className="app-header">
      <button
        className="icon-button"
        onClick={toggleSidebar}
        aria-label="Menu"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>
      <h1 className="app-title">Kithai AI</h1>
      <button className="icon-button" aria-label="Recent activity">
        <span className="material-symbols-outlined">history</span>
      </button>
    </header>
  );
}