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
