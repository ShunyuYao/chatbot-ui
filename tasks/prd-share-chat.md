# PRD: 分享聊天记录

## Introduction

用户可以将自己与 AI 的聊天记录分享给他人。点击分享后生成一个唯一的公开 URL，任何持有该 URL 的人都可以打开并查看完整的聊天历史（不含系统提示和工具调用内容）。查看界面与现有聊天界面一致，但为只读模式。

## Goals

- 允许用户一键生成聊天分享链接
- 任何人无需登录即可通过链接查看聊天记录
- 分享内容不暴露系统提示或工具调用细节
- 查看体验与聊天界面一致（只读）
- 分享入口在聊天列表菜单和聊天顶部工具栏均可访问

## User Stories

### US-001: 创建 shared_chats 数据表
**Description:** As a developer, I need a database table to store share records so that shared chats can be retrieved by token.

**Acceptance Criteria:**
- [ ] 新建 migration 文件，创建 `shared_chats` 表，包含字段：
  - `id` uuid primary key
  - `chat_id` uuid references chats(id) on delete cascade
  - `user_id` uuid references auth.users(id)
  - `share_token` text unique not null（用于生成 URL 的唯一标识符）
  - `created_at` timestamp with time zone default now()
- [ ] 对 `share_token` 字段建立唯一索引
- [ ] 启用 RLS：所有人均可通过 `share_token` 读取记录；只有 `user_id` 匹配的用户可写入/删除
- [ ] 运行 `npm run db-migrate` 成功，类型文件自动更新
- [ ] Typecheck 通过

### US-002: 创建分享聊天的数据库操作函数
**Description:** As a developer, I need CRUD functions for shared chats so that the UI can create and manage share records.

**Acceptance Criteria:**
- [ ] 在 `db/shared-chats.ts` 中实现以下函数：
  - `createSharedChat(chatId, userId)` — 生成唯一 `share_token`，插入记录，返回完整记录
  - `getSharedChatByToken(shareToken)` — 通过 token 查询记录（不需要登录），返回 `shared_chat` 及关联的 `chat_id`
  - `deleteSharedChat(shareToken, userId)` — 删除指定分享记录（仅限 owner）
  - `getSharedChatByChatId(chatId, userId)` — 查询某个 chat 是否已有分享记录
- [ ] `share_token` 使用 `crypto.randomUUID()` 或类似方式生成，确保唯一性
- [ ] Typecheck 通过

### US-003: 创建获取分享聊天内容的 API Route
**Description:** As a developer, I need an API endpoint to fetch shared chat messages so that the public share page can display them without requiring auth.

**Acceptance Criteria:**
- [ ] 新建 `app/api/shared-chats/[shareToken]/route.ts`（GET 方法）
- [ ] 通过 `share_token` 查找对应的 `chat_id`，若不存在返回 404
- [ ] 查询该 chat 的所有 messages，过滤掉 role 为 `system` 的消息以及包含工具调用的消息（tool calls / tool results）
- [ ] 返回 JSON：`{ chat: { id, name, model }, messages: [...] }`
- [ ] 该接口无需身份验证即可访问
- [ ] Typecheck 通过

### US-004: 创建公开分享页面
**Description:** As a viewer, I want to open a shared link and see the chat history so that I can read the conversation without logging in.

**Acceptance Criteria:**
- [ ] 新建路由 `app/[locale]/share/[shareToken]/page.tsx`
- [ ] 服务端调用 API（或直接查询数据库）获取聊天数据，若 token 无效则展示"该分享链接不存在或已失效"提示页
- [ ] 页面展示聊天名称、模型名称、消息列表
- [ ] 消息列表样式与现有聊天界面一致（复用 `ChatMessage` 等组件），但不可交互
- [ ] 页面顶部有明显的"只读"标识，并显示"使用 Chatbot UI 开始你自己的对话"的引导链接
- [ ] 不显示侧边栏、输入框等聊天操作区域
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-005: 在聊天列表菜单添加分享入口
**Description:** As a user, I want to share a chat from the sidebar context menu so that I can quickly generate a share link.

**Acceptance Criteria:**
- [ ] 在 `components/sidebar/items/chat/chat-item.tsx` 的操作菜单中添加"分享"选项
- [ ] 点击"分享"后：
  - 若该 chat 尚未分享：调用 `createSharedChat`，生成 share URL，复制到剪贴板，显示成功提示"链接已复制"
  - 若该 chat 已有分享记录：直接将现有 share URL 复制到剪贴板，显示成功提示"链接已复制"
- [ ] Share URL 格式为：`{window.location.origin}/share/{shareToken}`
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

### US-006: 在聊天顶部工具栏添加分享入口
**Description:** As a user, I want to share a chat from within the chat view so that I can share while I'm actively reading the conversation.

**Acceptance Criteria:**
- [ ] 在聊天界面顶部工具栏（`components/chat/chat-ui.tsx` 或相关 header 组件）添加分享按钮（使用 `IconShare` 图标）
- [ ] 点击行为与 US-005 一致（检查已有分享记录 → 生成或复用 → 复制到剪贴板 → toast 提示）
- [ ] 按钮有 tooltip 显示"分享聊天"
- [ ] Typecheck 通过
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: 系统必须为每个分享记录生成唯一的 `share_token`
- FR-2: 分享链接格式为 `{origin}/share/{shareToken}`，无需登录即可访问
- FR-3: 分享内容包含所有 user 和 assistant 消息，不包含 system 消息、tool call 消息、tool result 消息
- FR-4: 若同一 chat 已存在分享记录，再次点击分享不新建记录，而是复用已有 token
- FR-5: 分享链接复制到剪贴板后，通过 toast 通知用户"链接已复制"
- FR-6: 分享页面无需登录即可查看
- FR-7: 分享页面只读，不提供输入框、重新生成等交互操作
- FR-8: `shared_chats` 表通过 `on delete cascade` 确保 chat 被删除后分享记录自动清除

## Non-Goals

- 不支持分享链接过期/失效时间设置（链接永久有效，除非手动删除）
- 不支持查看者基于分享聊天发起新对话（Fork 功能）
- 不支持在分享页面下载/导出聊天记录
- 不支持密码保护的分享链接
- 不支持查看分享链接的访问统计（浏览次数等）
- 不支持撤销/取消分享（本期不做，作为后续迭代）

## Design Considerations

- 分享页面复用现有 `ChatMessage` 组件，保持视觉一致性
- 使用现有 toast 组件（`sonner` 或项目内 toast）显示"链接已复制"提示
- 分享页面不需要侧边栏，使用独立的简洁布局
- 顶部显示聊天标题和模型名，底部或顶部显示"只读"标识

## Technical Considerations

- 分享页面路由 `app/[locale]/share/[shareToken]/` 不在 `[workspaceid]` 下，无需工作区权限
- API route 使用 Supabase service role 或匿名客户端查询（需确认 RLS 策略允许匿名读取）
- `share_token` 建议使用 UUID v4，确保不可猜测
- 需在 Supabase middleware 中排除 `/share/*` 路径的认证检查，允许未登录访问

## Success Metrics

- 用户点击分享到链接复制完成在 2 秒内
- 分享页面首屏加载时间 < 2 秒
- 分享链接可被任何人直接打开并正确展示聊天内容

## Open Questions

- 是否需要在分享页面展示每条消息的时间戳？  不需要
- 如果聊天包含图片或文件附件，分享页面如何处理？ 先不需要支持文件和图片
- 后续是否需要支持"取消分享"功能（删除 share record）？ 后续再说
