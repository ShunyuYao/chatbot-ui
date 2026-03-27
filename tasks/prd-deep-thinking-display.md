# PRD: 深度思考内容展示

## Introduction

部分 AI 模型（如 Claude 的 Extended Thinking、DeepSeek R1）在生成回复时会产生"深度思考"内容，即模型推理过程。目前前端不展示这部分内容，用户无法了解模型的推理链路。

本功能将深度思考内容从 API 响应中提取出来，以可折叠的方式展示在对应消息前，样式与正式回复内容有明显区分，并持久化存储到数据库，历史消息也可查看。

## Goals

- 从 Anthropic thinking blocks 和 DeepSeek `<think>` 标签中提取深度思考内容
- 以"查看思考过程"折叠按钮展示，默认收起，样式与正文有明显区分
- 深度思考内容持久化到数据库，历史消息中也可展开查看
- 流式响应期间，思考内容实时流式展示

## User Stories

### US-001: 数据库新增 thinking_content 字段
**Description:** As a developer, I need to store thinking content separately from the main message content so it can be displayed distinctly.

**Acceptance Criteria:**
- [ ] 在 `messages` 表新增 `thinking_content text` 列（可为 null，默认 null）
- [ ] 编写迁移 SQL 文件并记录到 `supabase/migrations/`
- [ ] 手动通过 Supabase Management API 将迁移应用到云端数据库
- [ ] 更新 `supabase/types.ts`，使 `messages` 表的 TypeScript 类型包含 `thinking_content: string | null`
- [ ] `db/messages.ts` 中的 `createMessage` 和 `updateMessage` 支持传入 `thinking_content`
- [ ] Typecheck 通过

### US-002: Anthropic API 路由处理 thinking blocks
**Description:** As a developer, I need the Anthropic API route to extract thinking content from the response stream and return it to the client.

**Acceptance Criteria:**
- [ ] `app/api/chat/anthropic/route.ts` 在请求中添加 thinking 相关参数（`betas: ["interleaved-thinking-2025-05-14"]`，`thinking: { type: "enabled", budget_tokens: 8000 }`）
- [ ] 当模型支持 extended thinking 时（根据模型 ID 判断，目前为 claude-3-7-sonnet 系列），才启用该参数，否则走原有流程
- [ ] 从响应流中区分 `thinking` 类型的 content block 和 `text` 类型的 content block
- [ ] 在流式响应中，thinking 内容和正文内容通过自定义格式（如 HTTP header 或特殊 stream chunk）分别传输给前端
- [ ] 若模型返回无 thinking content，行为与当前一致
- [ ] Typecheck 通过

### US-003: DeepSeek 路由解析 `<think>` 标签
**Description:** As a developer, I need the DeepSeek API route to parse `<think>...</think>` tags from the response and separate thinking content from the main reply.

**Acceptance Criteria:**
- [ ] `app/api/chat/openai/route.ts`（DeepSeek 走 openai 兼容接口）或对应 route 中，在流式接收到内容时检测 `<think>` 标签
- [ ] `<think>...</think>` 标签内的内容提取为 thinking_content，标签外的内容为正文
- [ ] 流式响应时，`<think>` 标签内容实时通过与 US-002 相同的机制传输给前端
- [ ] 若响应中无 `<think>` 标签，行为与当前一致
- [ ] Typecheck 通过

### US-004: 前端接收并实时展示流式 thinking 内容
**Description:** As a user, I want to see the model's thinking process as it streams in, so I can follow along with the reasoning.

**Acceptance Criteria:**
- [ ] `components/chat/chat-ui.tsx` 或 `useChat` hook 中解析 thinking 内容流，并与正文内容分开存储到组件状态
- [ ] 流式期间，thinking 内容区域实时更新（字符逐步显示）
- [ ] thinking 内容展示区默认折叠，用户点击"查看思考过程"后展开
- [ ] 正文内容在 thinking 内容之后正常流式展示
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-005: 思考过程折叠 UI 组件
**Description:** As a user, I want a visually distinct, collapsible section for the model's thinking process so it doesn't clutter the main conversation.

**Acceptance Criteria:**
- [ ] 创建 `components/messages/message-thinking.tsx` 组件，接受 `content: string` 和 `isStreaming?: boolean` 属性
- [ ] 展示为"查看思考过程 ▶"按钮（展开后变为"▼"），点击切换展开/折叠
- [ ] 展开后内容区域有以下视觉区分：灰色或淡蓝色背景、左侧彩色（紫色/蓝色）border、使用 `italic` 或较小字体（`text-sm`）、标题区显示模型图标或"💭 思考过程"标签
- [ ] 流式接收 thinking 内容时，若组件已展开则显示流式光标动画
- [ ] 组件支持 dark mode（TailwindCSS dark: 前缀）
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-006: 消息渲染时展示历史 thinking 内容
**Description:** As a user, I want to see the thinking process for past messages when I scroll through chat history.

**Acceptance Criteria:**
- [ ] `components/messages/message.tsx` 中，若 `message.thinking_content` 不为空，在正文上方渲染 `<MessageThinking>` 组件
- [ ] 历史消息中 thinking 内容默认折叠，点击可展开
- [ ] 历史消息中无 thinking_content 的消息，不渲染任何 thinking 相关 UI
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-007: 保存消息时持久化 thinking_content
**Description:** As a developer, I need thinking content to be saved to the database alongside the message so it's available in future sessions.

**Acceptance Criteria:**
- [ ] 生成回复完成后，`createMessage` 或 `updateMessage` 调用时将 `thinking_content` 一并传入
- [ ] 从数据库加载历史消息时（`getMessagesByChatId`），`thinking_content` 字段正常返回
- [ ] 若 `thinking_content` 为空字符串，存为 null（避免空字符串干扰 UI 判断）
- [ ] Typecheck 通过

## Functional Requirements

- FR-1: `messages` 表新增 `thinking_content text` 可空列
- FR-2: Anthropic API 路由在支持 extended thinking 的模型上启用 thinking，并从流中提取 thinking blocks
- FR-3: OpenAI 兼容路由（DeepSeek）解析响应中的 `<think>...</think>` 标签
- FR-4: 流式响应通过自定义机制将 thinking 内容与正文内容分别传输至前端
- FR-5: `MessageThinking` 组件默认折叠，点击"查看思考过程"展开，视觉上与正文明显区分
- FR-6: 流式期间 thinking 内容实时显示，支持光标动画
- FR-7: 消息保存时 `thinking_content` 持久化到数据库
- FR-8: 历史消息加载时 `thinking_content` 正常展示

## Non-Goals

- 不提供"开启/关闭 Extended Thinking"的用户设置项（始终尝试，由 API 决定是否返回）
- 不对 thinking 内容做 Markdown 渲染（纯文本展示即可）
- 不支持用户编辑或复制 thinking 内容（只读）
- 不统计或展示 thinking token 用量
- 不支持 OpenAI 官方模型的 thinking（OpenAI 无此特性）

## Design Considerations

**MessageThinking 组件视觉规范：**

```
┌─────────────────────────────────────────────────┐
│ 💭 思考过程  ▶ 查看                              │  ← 折叠态（灰色文字，小字）
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 💭 思考过程  ▼ 收起                              │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌│
│  ┃  首先，我需要分析这个问题...                   │  ← 左侧紫色/蓝色 border
│  ┃  考虑到...                                    │  ← 灰色背景，斜体，text-sm
│  ┃  因此结论是...▍                               │
└─────────────────────────────────────────────────┘
```

- 整体置于 `message.tsx` 中正文内容的上方
- TailwindCSS 类参考：`bg-muted/50 border-l-4 border-purple-400 dark:border-purple-600 italic text-sm text-muted-foreground`

## Technical Considerations

- **流式传输机制**：Vercel `ai` 库的 `StreamingTextResponse` 不原生支持多通道。可考虑：
  - 方案 A：用特殊前缀标记 thinking chunk（如 `\x00THINKING\x00{content}`），前端解析
  - 方案 B：在响应 header 中传递 thinking 内容（不支持流式）
  - 推荐方案 A，前端在 `onChunk` 回调中解析前缀
- **模型判断**：通过 `chatSettings.model` 判断是否为支持 extended thinking 的模型，维护一个白名单数组
- **DeepSeek 解析**：需处理 `<think>` 标签跨多个 chunk 的情况（流式时标签可能被切割）
- **数据库迁移**：本地无 Docker，需通过 Supabase Management API 应用迁移

## Success Metrics

- 使用 Claude 3.7 Sonnet 或 DeepSeek R1 时，thinking 内容正常展示（有即展示，无即不展示）
- 折叠/展开交互响应 < 100ms
- 历史消息中 thinking 内容可正常查看
- 不影响不支持 thinking 的模型的现有功能

## Open Questions

- 流式传输 thinking 内容的具体编码格式需在 US-002 实现时确定（方案 A 的前缀格式）
- Anthropic Extended Thinking 目前 `budget_tokens` 的默认值是否合适（建议先设 8000）？
- DeepSeek 以外是否还有其他走 OpenAI 兼容接口但带 `<think>` 标签的模型需要支持？
