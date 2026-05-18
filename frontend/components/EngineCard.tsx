'use client';

interface EngineCardProps {
  name: string;
  status: 'ready' | 'error' | 'unknown';
  description: string;
  icon?: string;
}

export default function EngineCard({ name, status, description, icon }: EngineCardProps) {
  return (
    <div className="card fade-in" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '20px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: status === 'ready' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
          }}>
            {icon || '⬡'}
          </span>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, textTransform: 'capitalize' }}>{name}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{description}</p>
          </div>
        </div>
        <span className={`status-badge status-${status}`}>
          <span className="status-dot" />
          {status}
        </span>
      </div>
    </div>
  );
}
