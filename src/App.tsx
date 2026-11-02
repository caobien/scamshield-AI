import React, { useState } from 'react';
import { NavTab } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { AnalyzeView } from './views/AnalyzeView';
import { HistoryView } from './views/HistoryView';
import { DashboardView } from './views/DashboardView';
import { AboutView } from './views/AboutView';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Content View Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} />}
        {activeTab === 'analyze' && <AnalyzeView />}
        {activeTab === 'history' && <HistoryView setActiveTab={setActiveTab} />}
        {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
        {activeTab === 'about' && <AboutView setActiveTab={setActiveTab} />}
      </main>

      {/* Bottom Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
