# 创建目标链路说明

> 路由：`#/goals/new` · 页面：`src/views/GoalCreateView.vue` · **规则与组装单测**：`src/composables/goalCreateFlow.ts` + `goalCreateFlow.test.ts`

## 三步向导（产品链路）

| 步 | 标题 | 必填与规则 |
|----|------|------------|
| 1 | 基础信息 | 目标名称、最终目标、截止时间（≥ 今日）；分类 / 图标 / 配色可选；核心诉求在折叠区可选 |
| 2 | 计划周期 | 完成天数 ≥ 1；每天投入（小时 + 分钟）合计 ≥ 1 分钟；展示「天数 × 每日」总分钟与折合小时；总事项描述可选 |
| 3 | 每日习惯 | 每日具体事项必填；每日计时目标默认同步第二步，可展开「更改」微调；每周打卡天数 1–7；底部预览 |

底部 **「下一步」** / **「完成创建」**：当前步校验通过才可点；最后一步提交后 **`store.addGoal`** → 成功跳转 **`#/goals/:id`**（remote 时走后端 `POST /api/v1/goals`）。

## 自动化测试（已实现）

```bash
npm run test:goal-create   # 仅跑创建目标相关单测
npm run test               # 全部 Vitest
npm run test:all           # 类型检查 + 单测 + 生产构建
```

覆盖点摘要：

- `perDayMinutesFromForm`、`completionDaysRoundedFromForm`、`plannedTotalMinutesFromForm`
- `validateGoalCreateStep` 对第 1 / 2 / 3 步的正反例
- `buildGoalFromCreateForm`：阶段 `totalMinutes`、描述回退、`custom` 分类、`daysPerWeek` 钳制 1–7

## 手工冒烟（浏览器）

1. `npm run dev`，打开 `#/goals/new`（mock / remote 均可先能进创建页）。
2. 第 1 步：只填必填，点「下一步」应可过；故意清空名称应不可过。
3. 第 2 步：把每日分钟改为 0，应不可「下一步」；恢复为 ≥1 分钟再过。
4. 第 3 步：填每日事项，点「完成创建」；mock 下应立刻进详情；remote 下应请求创建接口成功后跳转。

## 与 PRD / API 文档

- 产品汇总见 PRD **§7.5**（若已收录目标创建改版）。
- 接口契约见 `docs/API.md` **§5 目标模块**（`POST /goals` 请求体字段与前端 `goalToCreateApiBody` 映射一致）。
