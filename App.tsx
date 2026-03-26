import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ControlPanel from './components/ControlPanel';
import { TerminalSettings } from './types';
import ContactModal from './components/ContactModal';
import BootSequence from './components/BootSequence';
import TradersLite from './components/TradersLite';
import TradersLiteCopy from './components/TradersLiteCopy';
import { fetchFinancialNews, NewsItem } from './services/newsService';
import { DEFAULT_SETTINGS } from './constants';
import AddNewsModal from './components/AddNewsModal';

const MainApp: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAddNews, setShowAddNews] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isBooting, setIsBooting] = useState(true);

  const [settings, setSettings] = useState<TerminalSettings>(() => {
    const saved = localStorage.getItem('wrc_terminal_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...(parsed.notifications || {})
          }
        };
      } catch (e) {}
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('wrc_terminal_settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings]);

  const updateSettings = (updates: Partial<TerminalSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const updateNews = async () => {
    try {
      const newsItems = await fetchFinancialNews();
      setNews(newsItems.slice(0, 15));
    } catch (e) {
      console.error("Failed to update global news stream");
    }
  };

  useEffect(() => {
    updateNews();
    const interval = setInterval(updateNews, 300000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      <div className={`h-screen overflow-hidden font-sans transition-all duration-500 ${settings.theme === 'dark' ? 'bg-background-dark' : 'bg-background-light'}`}>
        <Layout 
          openSettings={() => setShowSettings(true)}
          openContact={() => setShowContact(true)}
          priceTickerSpeed={settings.priceTickerSpeed}
          newsTickerSpeed={settings.intelligenceStreamSpeed}
          news={news}
          theme={settings.theme}
          onAddNewsClick={() => {
            setEditingNewsItem(null);
            setShowAddNews(true);
          }}
          onEditNewsClick={(item) => {
            setEditingNewsItem(item);
            setShowAddNews(true);
          }}
        >
          <Dashboard 
            news={news} 
            onRefreshNews={updateNews} 
            density={settings.layoutDensity}
            theme={settings.theme}
          />
        </Layout>

        {showSettings && (
          <ControlPanel 
            onClose={() => setShowSettings(false)} 
            settings={settings}
            updateSettings={updateSettings}
          />
        )}

        {showContact && (
          <ContactModal onClose={() => setShowContact(false)} />
        )}

        {showAddNews && (
          <AddNewsModal 
            onClose={() => {
              setShowAddNews(false);
              setEditingNewsItem(null);
            }} 
            onAdd={(newItem) => setNews(prev => [newItem, ...prev])} 
            onEdit={(updatedItem) => setNews(prev => prev.map(n => n.id === updatedItem.id ? updatedItem : n))}
            initialData={editingNewsItem}
          />
        )}
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TradersLite theme="light" />} />
        <Route path="/lite-copy" element={<TradersLiteCopy theme="light" />} />
        <Route path="/dashboard" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;