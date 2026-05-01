---
name: devbox-release-plan
description: 规划并执行 Devbox 上线流程，包含构建、端口暴露、环境变量、联调与冒烟验证。用于用户提到“Devbox上线/部署/发布/发版/冒烟”或需要一键上线清单时。
---

# Devbox 上线计划

## 适用场景

- 用户要求在 Devbox 上上线前端应用
- 用户要求发布版本、部署、发版或做上线前检查
- 用户反馈“本地可用但公网不稳定”，需要标准化上线链路

## 默认项目约定（本仓库）

- 前端目录：`atomic/`
- 开发启动：`npm run dev -- --host 0.0.0.0 --port 3000 --strictPort`
- 生产构建：`npm run build`
- 生产启动：`PORT=3000 bash entrypoint.sh`
- Devbox 暴露端口：`3000`

## 上线执行流程

复制此清单并执行：

```md
Devbox 发布进度
- [ ] 1. 同步主分支并确认代码状态
- [ ] 2. 校验环境变量（development/production）
- [ ] 3. 生产构建通过
- [ ] 4. 以生产方式启动并确认端口 3000
- [ ] 5. Devbox 公网地址冒烟验证
- [ ] 6. 记录版本与回滚点
```

### 1) 同步代码

```bash
git checkout main
git pull --ff-only origin main
git status -sb
```

### 2) 环境变量核对

- `atomic/.env.development`：联调用内网后端地址
- `atomic/.env.production`：生产用后端公网地址
- `VITE_DATA_SOURCE=remote`

### 3) 构建

```bash
cd atomic
npm install
npm run build
```

若出现 Node 版本提示（20.19+），记录为风险并建议升级运行时。

### 4) 生产启动

```bash
cd atomic
PORT=3000 bash entrypoint.sh
```

确认日志包含：
- `Local:   http://localhost:3000/`
- `Network: http://<container-ip>:3000/`

### 5) 冒烟验证（必须）

- 打开 Devbox `3000` 端口公网地址
- 访问核心页面：`/dashboard`、`/goals`、`/review`
- 执行关键链路：新建目标 -> 打卡 -> 复盘
- Network 过滤 `api`，核心请求应稳定 `200`

### 6) 回滚信息

- 记录当前提交号：`git rev-parse --short HEAD`
- 记录前一稳定版本提交号（用于快速回滚）

## 故障排查速查

- **症状：页面空白/ERR_EMPTY_RESPONSE**
  - 检查是否访问了错误端口（必须是 Devbox 暴露端口）
  - 检查服务是否监听 `0.0.0.0:3000`
- **症状：接口时好时坏**
  - 开发联调优先后端内网地址，不走公网网关
  - 确认当前是 `npm run dev`（联调）或 `entrypoint.sh`（生产），不要混用
- **症状：接口 401**
  - 先确认是否完成游客/登录鉴权
  - 清理本地过期 token 后重试

## 输出模板

对用户汇报时按以下格式输出：

```md
上线结果：成功/失败

- 分支与提交：`<branch>` / `<sha>`
- 构建结果：通过/失败（关键信息）
- 启动方式：dev/prod + 端口
- 公网地址：`https://...`
- 冒烟结果：通过项 / 失败项
- 风险与建议：1-2 条
```
