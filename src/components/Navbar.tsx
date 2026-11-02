import React, { useState } from 'react';
import { NavTab } from '../types';
import {
  ShieldAlert,
  Home,
  SearchCode,
  History,
  BarChart3,
  Info,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'analyze', label: 'Phân tích', icon: SearchCode },
    { id: 'history', label: 'Lịch sử', icon: History },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'about', label: 'Giới thiệu', icon: Info },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xs border-b border-slate-200 text-slate-900 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Name (Streamlined, no clutter) */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer group min-h-[44px]"
            id="nav-logo-button"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNavClick('home')}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-xs group-hover:bg-indigo-950 transition-colors">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border border-white">
                <ShieldCheck className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                ScamShield AI
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                An toàn số
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1" id="desktop-nav-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  id={`nav-item-${item.id}`}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] cursor-pointer focus-ring ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick CTA button for Analyze on desktop */}
          <div className="hidden lg:flex items-center">
            <button
              onClick={() => handleNavClick('analyze')}
              id="nav-quick-check-btn"
              className="px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer focus-ring min-h-[44px]"
            >
              <SearchCode className="w-4 h-4" />
              <span>Kiểm tra ngay</span>
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              id="mobile-menu-toggle"
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Mở menu điều hướng"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1.5 animate-fade-in">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                id={`mobile-nav-item-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors min-h-[44px] cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2">
            <button
              onClick={() => handleNavClick('analyze')}
              id="mobile-nav-quick-btn"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs min-h-[44px] cursor-pointer"
            >
              <SearchCode className="w-4 h-4" />
              <span>Kiểm tra ngay</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
