'use client';

import { useState, useEffect } from 'react';
import { createPlan, getPlans, decomposeTask, reflectPlan, retryTask } from '@/lib/api';

export default function PlannerPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    getPlans().then(data => setPlans(Array.isArray(data) ? data : data.plans || [])).catch(() => {});
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const plan = await createPlan(title, description);
      setPlans(prev => [plan, ...prev]);
      setTitle('');
      setDescription('');
      showToast('success', '计划创建成功');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecompose = async (planId: string) => {
    try {
      // 获取计划的第一个任务进行分解
      const plan = plans.find(p => p.id === planId);
      if (!plan || !plan.tasks || plan.tasks.length === 0) {
        showToast('error', 'No tasks found in plan');
        return;
      }
      await decomposeTask(plan.tasks[0].id);
      showToast('success', '计划已分解为任务');
      // 刷新计划列表
      const data = await getPlans();
      setPlans(Array.isArray(data) ? data : data.plans || []);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleReflect = async (planId: string) => {
    try {
      const result = await reflectPlan(planId);
      showToast('success', `成功率: ${(result.success_rate * 100).toFixed(1)}%`);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      await retryTask(taskId);
      showToast('success', '任务已重试');
      // 刷新计划列表
      const data = await getPlans();
      setPlans(Array.isArray(data) ? data : data.plans || []);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>▦ <span className="gradient-text">规划引擎</span></h1>
        <p>任务分解、规划和执行编排</p>
      </div>

      {/* Create Plan Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-title">创建新计划</div>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="计划标题..."
          />
          <textarea
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述计划目标和范围..."
            style={{ minHeight: '80px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading || !title.trim() || !description.trim()}>
              {loading ? <><div className="spinner" /> Creating...</> : '▦ Create Plan'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: 'var(--error)',
          marginBottom: '24px',
          fontSize: '14px',
        }}>⚠ {error}</div>
      )}

      {/* Plans List */}
      <div className="section">
        <div className="section-title">计划列表 ({plans.length})</div>
        {plans.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            暂无计划，请在上方创建。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {plans.map((plan: any, i: number) => (
              <div key={plan.id || i} className="card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                      {plan.title || plan.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {plan.description || plan.summary || '—'}
                    </p>
                    {plan.tasks && plan.tasks.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          任务 ({plan.tasks.length})
                        </div>
                        {plan.tasks.map((task: any, j: number) => (
                          <div key={j} style={{
                            padding: '8px 12px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            marginBottom: '6px',
                            fontSize: '13px',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                          }}>
                            <span style={{ color: 'var(--accent)' }}>▸</span>
                            {task.title || task.name || task.description || JSON.stringify(task)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button className="btn btn-secondary" onClick={() => handleDecompose(plan.id)} title="分解为任务">
                      ⟐
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleReflect(plan.id)} title="反思计划">◎</button>
                    <button className="btn btn-secondary" onClick={() => plan.tasks && plan.tasks.length > 0 && handleRetry(plan.tasks[0].id)} title="重试计划">↻</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
