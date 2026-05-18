'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '控制面板', icon: '◈' },
  { href: '/repo', label: '仓库分析', icon: '⟐' },
  { href: '/memory', label: '记忆引擎', icon: '◉' },
  { href: '/planner', label: '规划引擎', icon: '▦' },
  { href: '/agents', label: '代理运行时', icon: '◆' },
  { href: '/debug', label: '调试引擎', icon: '⟟' },
  { href: '/providers', label: '提供商', icon: '◎' },
  { href: '/context', label: '长上下文', icon: '⊞' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 'var(--sidebar-width)',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '32px', padding: '0 8px' }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '24px' }}>⬡</span>
          <span className="gradient-text">Hermes-DevOS</span>
        </h2>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          AI 原生开发操作系统
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 8px',
        borderTop: '1px solid var(--border)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
      }}>
        v0.1.0 · 8 大引擎
      </div>
    </aside>
  );
}
