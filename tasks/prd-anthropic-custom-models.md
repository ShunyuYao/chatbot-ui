# PRD: Anthropic 格式自定义模型支持

## 1. Introduction / Overview

目前"自定义模型"功能仅支持 OpenAI 兼容格式（通过 OpenAI SDK + 自定义 `base_url`）。本功能扩展自定义模型，使用户能够添加使用 **Anthropic 原生 API 格式**的模型（包括官方 API 和第三方 Anthropic 格式代理），并支持 Anthropic 特有功能：**图片输入（vision）** 和 **extended thinking（推理模式）**。

## 2. Goals

- 支持在自定义模型配置中选择提供商格式（OpenAI 或 Anthropic）
- 新增 Anthropic 格式的 API 路由，使用 `@anthropic-ai/sdk` 调用
- 支持 Anthropic vision（图片输入）
- 支持 Anthropic extended thinking（通过 `thinking` 参数开启）
- 数据库新增 `provider_type` 字段区分模型格式，便于未来扩展更多格式

## 3. User Stories

### US-001: 数据库新增 provider_type 字段
**Description:** As a developer, I need to store the provider format of a custom model so the system knows which SDK to use when calling it.

**Acceptance Criteria:**
- [ ] 在 `models` 表新增字段 `provider_type TEXT NOT NULL DEFAULT 'openai'`，允许值为 `'openai'` 或 `'anthropic'`
- [ ] 编写 SQL migration 文件至 `supabase/migrations/`
- [ ] 通过 Supabase API 推送 migration 至云端数据库（参见 CLAUDE.md 中 Without local Docker 章节）
- [ ] 更新 `supabase/types.ts`，在 `models` 的 Row/Insert/Update 类型中加入 `provider_type` 字段
- [ ] Typecheck 通过（`npm run type-check`）

---

### US-002: 创建/编辑模型 UI 新增提供商格式选择
**Description:** As a user, I want to select whether my custom model uses OpenAI or Anthropic format when adding or editing it, so the system can call it correctly.

**Acceptance Criteria:**
- [ ] `create-model.tsx` 新增"提供商格式"下拉选择，选项为：`OpenAI 兼容` / `Anthropic 原生`
- [ ] `model-item.tsx`（编辑界面）同样新增该选择，并回显已保存的值
- [ ] 默认值为 `OpenAI 兼容`（保持对现有用户的向下兼容）
- [ ] 选择 Anthropic 时，Base URL placeholder 提示改为 `https://api.anthropic.com`（或代理地址）
- [ ] 表单提交时将 `provider_type` 字段传入 `createModel` / `updateModel`
- [ ] Typecheck 通过
- [ ] 在浏览器中验证（使用 dev-browser skill）

---

### US-003: 新增 Anthropic 格式 API 路由
**Description:** As a developer, I need an API route that calls Anthropic-format endpoints using the Anthropic SDK, so custom Anthropic models can generate responses.

**Acceptance Criteria:**
- [ ] 新建 `app/api/chat/custom-anthropic/route.ts`，使用 Vercel Edge Runtime
- [ ] 路由接收 `chatSettings`、`messages`、`customModelId` 参数
- [ ] 从数据库读取对应 `customModel` 的 `api_key`、`base_url`、`model_id`
- [ ] 使用 `@anthropic-ai/sdk` 初始化客户端（`baseURL` 和 `apiKey`）
- [ ] 将消息转换为 Anthropic messages 格式（system prompt 分离为独立 `system` 参数）
- [ ] 调用 `client.messages.create()`，包含 `max_tokens`（从 `chatSettings` 或默认 4096）
- [ ] 返回流式响应（使用 Anthropic SDK 的 streaming 方式）
- [ ] Typecheck 通过

---

### US-004: 支持 Anthropic vision（图片输入）
**Description:** As a user, I want to send images to my custom Anthropic model so I can ask questions about visual content.

**Acceptance Criteria:**
- [ ] `custom-anthropic` 路由能正确处理包含图片的消息（将 base64 图片或 URL 转换为 Anthropic `image` content block 格式）
- [ ] 图片消息不会导致路由报错
- [ ] Typecheck 通过
- [ ] 在浏览器中发送一张图片并验证响应正常（使用 dev-browser skill）

---

### US-005: 支持 Anthropic extended thinking
**Description:** As a user, I want to enable extended thinking on my custom Anthropic model so I can get more thorough reasoning responses.

**Acceptance Criteria:**
- [ ] `custom-anthropic` 路由在 `chatSettings` 中存在 `enableThinking: true` 时，向 API 传递 `thinking: { type: "enabled", budget_tokens: N }` 参数
- [ ] `budget_tokens` 默认值为 `10000`，或从 `chatSettings` 读取
- [ ] Extended thinking 响应中的 `thinking` block 内容被正确过滤或展示（不破坏 UI）
- [ ] Typecheck 通过

---

### US-006: 聊天流程路由到正确的 API
**Description:** As a user, when I use a custom Anthropic model in chat, the request should automatically be sent to the Anthropic API route, not the OpenAI one.

**Acceptance Criteria:**
- [ ] 在 `components/chat/chat-helpers/index.ts` 中，当 `provider === "custom"` 时，读取模型的 `provider_type`
- [ ] `provider_type === 'openai'` → 路由到 `/api/chat/custom`（现有路由，不变）
- [ ] `provider_type === 'anthropic'` → 路由到 `/api/chat/custom-anthropic`（新路由）
- [ ] `model-select.tsx` 在将自定义模型转换为 LLM 对象时，将 `provider_type` 一并传入（可存在 `hostedId` 或新增字段）
- [ ] Typecheck 通过
- [ ] 在浏览器中使用 Anthropic 格式模型发送消息，验证路由正确（使用 dev-browser skill）

---

## 4. Functional Requirements

- **FR-1:** `models` 表新增 `provider_type TEXT NOT NULL DEFAULT 'openai'`，有效值为 `'openai'` | `'anthropic'`
- **FR-2:** 创建/编辑自定义模型的 UI 必须包含提供商格式选择，默认 `openai`
- **FR-3:** 新建 `app/api/chat/custom-anthropic/route.ts`，使用 `@anthropic-ai/sdk` 处理 Anthropic 原生格式请求
- **FR-4:** system prompt 必须从 messages 数组中分离，作为独立的 `system` 参数传给 Anthropic API
- **FR-5:** `max_tokens` 必须在请求中显式传递（Anthropic API 要求，OpenAI API 可选）
- **FR-6:** 支持图片 content block（base64 或 URL），转换为 Anthropic 的 `image` 格式
- **FR-7:** 当 extended thinking 开启时，传递 `thinking` 参数；需过滤响应中的 thinking block，避免破坏消息存储
- **FR-8:** 聊天路由逻辑根据模型的 `provider_type` 动态选择 `/api/chat/custom` 或 `/api/chat/custom-anthropic`
- **FR-9:** 现有 OpenAI 格式自定义模型行为不受任何影响（向下兼容）

## 5. Non-Goals（超出范围）

- 不支持 Anthropic 原生 tool use（工具调用），本期只做文本 + 图片 + thinking
- 不重构现有 Anthropic hosted 模型（`app/api/chat/anthropic/route.ts`）
- 不在 UI 上新增 extended thinking 的专用开关，复用现有 `chatSettings`
- 不支持 Anthropic Files API 或文档上传
- 不支持除 OpenAI / Anthropic 以外的其他自定义格式（如 Gemini native）

## 6. Design Considerations

- 提供商格式选择建议使用 `Select` 下拉组件（复用现有 Radix UI Select）
- 现有自定义模型 UI 只需在表单中增加一个字段，整体布局不需要大改
- Anthropic SDK 的 streaming 与 OpenAI SDK 略有不同，需注意使用 `stream.text_stream` 或手动处理 `MessageStreamEvent`

## 7. Technical Considerations

- **依赖检查：** `@anthropic-ai/sdk` 已在 `app/api/chat/anthropic/route.ts` 中使用，无需新增依赖
- **消息格式转换：** Anthropic messages 中 `role` 只支持 `user` | `assistant`（无 `system`）；system 消息必须提取为顶层 `system` 参数
- **Streaming 格式：** Anthropic SDK streaming 返回的是 `MessageStreamEvent`，需转换为前端 `ReadableStream` / `StreamingTextResponse` 格式（参考现有 `app/api/chat/anthropic/route.ts` 的实现）
- **数据库迁移：** 无本地 Docker，需通过 Supabase Management API 或 `supabase db push` 推送 migration（参见 CLAUDE.md）
- **类型安全：** `LLM` 接口（`types/llms.ts`）可能需要新增字段以传递 `provider_type` 到聊天路由

## 8. Success Metrics

- 用户能够成功添加一个 Anthropic 格式的自定义模型并收到流式回复
- 现有 OpenAI 格式自定义模型功能无回归
- 能够发送图片并收到 Anthropic 视觉分析回复
- 开启 extended thinking 后，回复质量明显提升，且不破坏 UI 显示

## 9. Open Questions

- Extended thinking 的 `budget_tokens` 是否需要在 UI 上暴露给用户配置，还是固定默认值？  需要暴露，默认为0
- Anthropic streaming 响应中的 `thinking` block 是否需要在聊天界面中展示（折叠显示），还是直接过滤掉？ （折叠显示）
- `LLM` 类型中是否需要新增 `customProviderType` 字段，或复用 `hostedId` 编码此信息？ 你自己判断
