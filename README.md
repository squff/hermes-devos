# Hermes-DevOS

> AI-native Autonomous Software Engineering Platform

## 项目定位

Hermes-DevOS 是一个 **Autonomous AI Development Infrastructure**，面向长上下文、多 Agent、自主工作流的软件工程系统。

不是 AI Chat Bot，不是 Prompt Tool，不是 IDE Wrapper。

而是具备**长期演进能力**的 Autonomous AI Software Engineering Infrastructure。

## 核心能力

| 模块 | 说明 |
|------|------|
| Repository Intelligence | 仓库级代码理解、AST 分析、依赖图、架构摘要 |
| Persistent Memory | 语义检索、任务状态持久化、Session 恢复 |
| Multi-Agent Coordination | 5 角色协作、动态调度、上下文共享 |
| Autonomous Planning | 递归任务分解、反思循环、动态重试 |
| Tool Runtime | 统一工具管理、组合调用、决策矩阵 |
| Auto Debugging | 错误模式识别、日志分析、自动修复 |
| Provider Routing | 多模型能力路由、Failover、预算分级 |
| Long Context Engineering | 语义分块、滑动窗口、检索优化 |

## 技术栈

- **Backend**: Python 3.12+ / FastAPI / Uvicorn
- **Frontend**: Next.js / TypeScript / TailwindCSS
- **Memory**: SQLite + ChromaDB (Optional) + FAISS (Optional)
- **Providers**: Xiaomi MiMo / DeepSeek / OpenAI

## 快速开始

```bash
# 后端
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8080

# 前端
cd frontend
npm install
npm run dev
```

## 系统架构

```
┌─────────────────────────────────────────┐
│            Frontend (Next.js)           │
├─────────────────────────────────────────┤
│            API Layer (FastAPI)          │
├──────┬──────┬──────┬──────┬─────────────┤
│ Repo │Memory│Plan  │Agent │  Debug      │
│Engine│Engine│Engine│Runtime│  Engine    │
├──────┴──────┴──────┴──────┴─────────────┤
│         Provider Router                 │
├─────────────────────────────────────────┤
│         Tool Runtime                    │
├─────────────────────────────────────────┤
│         Long Context Engine             │
└─────────────────────────────────────────┘
```

## 开发阶段

- Phase 1: Foundation Runtime + Repo Understanding + Memory Engine
- Phase 2: Multi-Agent + Autonomous Planning + Tool Runtime
- Phase 3: Provider Routing + Long Context + Workflow Recovery
- Phase 4: Auto Debugging + Monitoring + Open Source

## License

MIT
