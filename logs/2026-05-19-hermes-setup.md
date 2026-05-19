# Agent 协助学习日志

## 2026-05-19：初始化学习工作区

### 场景
使用 Hermes Agent 作为 Learning Agent，完成 AI × Web3 School 的入学配置。

### 协助内容

| 步骤 | Agent 角色 | 耗时 |
|------|-----------|------|
| 1. 读取启动 Prompt + Handbook | 自动拉取文档，理解初始化流程 | <1min |
| 2. 收集学员画像 | 分轮提问，确认 AI/Web3 基础、编程能力、目标 | 2 轮对话 |
| 3. 安装 GitHub CLI | 检测未安装 → 指导安装 → 验证登录 | 3min |
| 4. 创建 GitHub 学习仓库 | 按学员确认的 repo 名/路径创建 + push 初始结构 | 2min |
| 5. 初始化仓库结构 | 生成 README、profile、learning-plan、templates、daily 等 12 个文件 | 1min |
| 6. 配置 WCB Agent API | 安全存储 API Key → 测试连通 → 读取用户资料和课程日程 | 2min |
| 7. 生成今日打卡草稿 | 自动写入 daily/2026-05-19.md | <1min |
| 8. 补齐任务 2 所需结构 | 创建 notes/ prompts/ demos/ logs/ + resources.md 和本日志 | 进行中 |

### 关键发现

1. **GitHub CLI 自动安装**：Linux 下通过 tar.gz 直接安装需要 sudo，推荐用户走 apt 官方仓库安装更稳定
2. **WCB API 认证**：`Authorization: Bearer` 和 `X-Secret-Api-Key` 两种方式都可用，catalog 有 281 个接口
3. **公开仓库安全**：所有配置文件确保不包含密钥和隐私信息

### 执行命令统计

- `file write`: 12 次（README, profile, learning-plan, templates, daily note 等）
- `terminal`: ~15 次（curl, gh, git, mkdir 等）
- `memory`: 1 次（保存学员画像）

### 日志

由 Hermes Agent 自动记录，本文件即为 Agent 协助整理的日志输出。
