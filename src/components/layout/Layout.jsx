import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ currentTab, onSelectTab, children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [isMobileOpen]);

  const handleSelectTab = (tab) => {
    setIsMobileOpen(false);
    onSelectTab(tab);
  };

  return (
    <div className={`app-shell ${isMobileOpen ? 'mobile-nav-open' : ''}`}>
      {/* Dark backdrop overlay for mobile drawer only */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
          onTouchMove={(e) => e.preventDefault()}
          aria-hidden="true"
        />
      )}

      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="main-panel">
        <Header
          currentTab={currentTab}
          onToggleMobileNav={() => setIsMobileOpen(prev => !prev)}
        />
        <main className={currentTab === 'sales-documents' || currentTab === 'stock-in-transit' ? 'page-section documents-screen' : 'page-section'}>
          {children}
        </main>
      </div>
    </div>
  );
}
