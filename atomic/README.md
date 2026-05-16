# Atomic — 自控力与目标管理 APP

> 微小坚持，复利改变。基于《原子习惯》核心逻辑实现的目标管理与习惯养成 APP 前端原型。

## 设计风格

- **清新、简约、干净** — 大留白、轻分隔、无冗余
- **高级科技感** — 柔和渐变 + 玻璃拟态顶栏
- **低饱和度配色** — 青蓝、薄荷、柔紫、蜜桃四色调系
- **轻量化 UI** — 12 / 16 / 20 / 28 圆角，柔和阴影，全局 tabular 数字

## 已实现模块（对照 PRD）

| 模块 | 路径 | 主要能力 |
|------|------|---------|
| 今日 Dashboard | `/` | 问候 + 进度环、今日待打卡、本周节奏图、可领取奖励、目标概览 |
| 目标管理 | `/goals` `/goals/new` `/goals/:id` | 列表/搜索/分类、3 步创建向导、三级拆解树、阶段奖励、删除确认 |
| 每日打卡 | `/checkin` `/checkin/:id` | 计时器、进度环、延迟打卡、未打卡确认（可选扣除）、最近记录 |
| 进度跟踪 | `/goals/:id` 内嵌 | 进度条 + 月历轨迹、状态色块、阶段达成提示 |
| 奖励中心 | `/rewards` | 可领取/解锁中/已领取分类、自定义触发条件 |
| 复盘中心 | `/review` | 趋势 SVG 折线、周/月/手动报告、引导问题、收藏/删除 |
| 个人中心 | `/profile` | 身份徽章、统计卡、历史目标 |
| 设置 | `/settings` | 提醒、复盘、扣除规则、特殊场景、个性化鼓励语、主题、数据管理 |

所有数据通过 Pinia + `localStorage` 本地持久化，可在「设置」中重置示例数据。

## 技术栈

- Vue 3 + Vite + TypeScript
- Vue Router 4 + Pinia 3
- Lucide 图标
- 自研设计令牌（CSS 变量），无 UI 组件库依赖

## 运行

```bash
npm install
npm run dev      # 开发：http://localhost:5173
npm run build    # 生产构建
npm run preview  # 预览生产包
```

## 与后端联调

后端本地联调默认监听 **`http://127.0.0.1:8080`**（与 `.env.development` 中 `VITE_API_TARGET` 一致）。Vite dev server 已配置代理，浏览器访问的 `/api/*` 请求会自动转发到该目标，无需处理跨域。

环境变量（位于 `.env.development`）：

```bash
VITE_API_BASE_URL=/api/v1            # 浏览器侧使用的相对前缀（走代理）
VITE_API_TARGET=http://127.0.0.1:8080 # 代理转发目标（按需改端口）
VITE_DATA_SOURCE=remote               # mock = 本地 seed；remote = 走后端（联调时请用 remote）
```

切换数据源：把 `VITE_DATA_SOURCE` 改为 `remote` 后**重启** `npm run dev`，store 才会调用 `src/api` 中的封装。

API 调用示例：

```ts
import { goalApi, isRemote } from '@/api';

if (isRemote) {
  const { items } = await goalApi.list({ status: 'active' });
}
```

完整接口契约见 [`docs/API.md`](./docs/API.md)。

## 测试

```bash
npm run test          # Vitest 单测
npm run test:all      # vue-tsc + vitest + build（推荐 CI）
```

- **创建目标链路（规则与组装）**：[`docs/goal-create-flow.md`](./docs/goal-create-flow.md) · 实现见 `src/composables/goalCreateFlow.ts`，单测 `src/composables/goalCreateFlow.test.ts`。

## 目录结构

```
src/
├─ components/     共享组件（AppShell、ProgressRing、GoalCard、Modal 等）
├─ views/          页面（Dashboard / Goals / Checkin / Rewards / Review / Profile / Settings）
├─ stores/         Pinia store（持久化 + 业务动作）
├─ router/         路由
├─ types/          TypeScript 类型
├─ data/           Mock 种子数据
├─ composables/    工具函数（日期、本地存储、鼓励语库等）
├─ styles/         设计令牌 + 全局样式
├─ App.vue
└─ main.ts
```
