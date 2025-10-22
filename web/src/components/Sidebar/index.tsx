import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="hidden md:block fixed left-0 top-0 h-screen w-60 border-r bg-stone-100/70">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🗂️</span>
          <span className="font-semibold">Cantonese Voice Chat</span>
        </div>
        <nav className="space-y-1">
          <NavItem to="/" icon="💬" label="對話" />
          <NavItem to="/settings" icon="⚙️" label="設定" />
        </nav>
      </div>
    </aside>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
          isActive ? 'bg-white border border-gray-200 shadow-sm' : 'hover:bg-white/60'
        }`
      }
    >
      <span className="text-lg leading-none">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}