# Learning Agent 配置说明

> 最后更新：2026-05-19

## 概述

本 repo 使用 **Hermes Agent** 作为个人 Learning Agent，配合 **AI × Web3 School** 的启动 Prompt，实现学习计划管理、每日打卡、GitHub 仓库维护和 WCB 平台任务提交的自动化辅助。

## Agent 配置

### 1. 启动方式

将启动 Prompt URL 发送给 Hermes Agent：

```
https://aiweb3.school/learning-agent.zh.txt
```

### 2. 固定入口

- **Handbook**: https://aiweb3.school/zh/handbook/
- **WCB 课程**: https://web3career.build/zh/programs/AI-Web3-School
- **WCB Learning**: https://web3career.build/zh/programs/AI-Web3-School#tab=learning
- **WCB API 文档**: https://web3career.build/llms.txt

### 3. WCB Agent API

已配置 Secret API Key（本地存储），可用接口：

| 接口 | 说明 |
|------|------|
| `users.getProfile` | 读取个人资料 |
| `tasks.listForLearner` | 查看学习任务 |
| `tasks.submitEvidence` | 提交任务证明 |
| `events.listForLearner` | 查看课程日程 |
| `program.getById` | 查看项目信息 |
| `opportunities.list` | 查看机会列表 |

API Key 存储在 `~/.hermes/secrets.env`，**不在任何公开位置或聊天记录中暴露**。

### 4. 仓库结构

```
ai-web3-school-cohort/
├── README.md              # 仓库说明
├── profile.md             # 学员画像
├── learning-plan.md       # 学习计划
├── resources.md           # 资源汇总
├── notes/                 # 学习笔记
├── daily/                 # 每日打卡记录
├── prompts/               # Prompt 收藏
├── demos/                 # Demo 代码
├── logs/                  # Agent 日志
├── experiments/           # 实验代码
├── tasks/                 # 课程任务
├── handbook-feedback/     # Handbook 反馈
├── hackathon/             # Hackathon 项目
├── submissions/           # WCB 提交记录
└── templates/             # 模板
```

### 5. 每日工作流

1. Agent 读取 WCB Learning 页面和 Handbook
2. 生成今日 daily note + 打卡草稿
3. 学员学习 + 动手实践
4. Agent 协助整理笔记、提交证据
5. 学员手动完成 WCB 打卡提交

### 6. 安全边界

- Public repo 不存放任何密钥、私钥、助记词
- WCB API Key 仅存本地环境变量
- 所有写入型操作（repo 修改、WCB 提交）先展示再确认
