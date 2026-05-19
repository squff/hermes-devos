'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: '控制台', icon: 'M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm0 8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6zm10 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6z' },
  { href: '/chat', label: '对话', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { href: '/hermes', label: 'Hermes 配置', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.94-3a8.03 8.03 0 0 0-.54-1.8l2.02-1.57-2-3.46-2.44.88a8.04 8.04 0 0 0-1.56-.9l-.37-2.57h-4l-.37 2.57c-.56.24-1.07.55-1.56.9l-2.44-.88-2 3.46 2.02 1.57a8.03 8.03 0 0 0 0 3.6l-2.02 1.57 2 3.46 2.44-.88c.49.35 1 .66 1.56.9l.37 2.57h4l.37-2.57c.56-.24 1.07-.55 1.56-.9l2.44.88 2-3.46-2.02-1.57c.36-.59.63-1.23.8-1.8h.01z' },
  { href: '/openclaw', label: 'OpenClaw 配置', icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
  { href: '/runtime', label: '运行时', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { href: '/logs', label: '日志', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
];

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h1>Hermes-DevOS</h1>
        <span>v0.2.0 · Runtime Console</span>
      </div>
      <div className="sidebar-nav">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <Icon path={item.icon} />
            {item.label}
          </Link>
        ))}
      </div>
      <div className="sidebar-status">
        <div className="sidebar-status-item">
          <span className="status-dot online" />
          Hermes
        </div>
        <div className="sidebar-status-item">
          <span className="status-dot online" />
          OpenClaw
        </div>
      </div>
    </nav>
  );
}
