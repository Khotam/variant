import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { LanguageToggle } from './LanguageToggle';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function useNavItems(): NavItem[] {
  const { t } = useTranslation();
  return [
    { to: '/dashboard', label: t('nav.dashboard'), icon: <HomeIcon className="h-5 w-5" /> },
    { to: '/deals', label: t('nav.deals'), icon: <DocumentTextIcon className="h-5 w-5" /> },
    { to: '/customers', label: t('nav.customers'), icon: <UsersIcon className="h-5 w-5" /> },
    { to: '/settlements', label: t('nav.settlements'), icon: <ArrowsRightLeftIcon className="h-5 w-5" /> },
    { to: '/reports', label: t('nav.reports'), icon: <ChartBarIcon className="h-5 w-5" /> },
  ];
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = useNavItems();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : ''}`}>
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
          <CurrencyDollarIcon className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">Variant</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">
            {user?.displayName?.[0] || '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.displayName}</p>
            <p className="text-xs text-slate-400">@{user?.username}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-slate-900 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 h-full bg-slate-900">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6 flex-shrink-0">
          <button
            className="md:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <LanguageToggle />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
