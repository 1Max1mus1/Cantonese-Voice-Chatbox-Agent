import React from 'react';
import Sidebar from '../Sidebar';
import { NavLink } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-10 border-b bg-stone-100/80 backdrop-blur">
        <div className="h-full flex items-center gap-2 px-3">
          <NavLink to="/" className="px-2 py-1 rounded text-sm flex items-center gap-1 hover:bg-white/60">💬 對話</NavLink>
          <NavLink to="/settings" className="px-2 py-1 rounded text-sm flex items-center gap-1 hover:bg-white/60">⚙️ 設定</NavLink>
        </div>
      </div>
      <Sidebar />
      <div className="md:ml-60 pt-10 md:pt-0 px-3 md:px-0">
        {children}
      </div>
    </div>
  );
}