# PRD: Chat Settings Always Editable

## Introduction

Currently, the chat settings panel (model, system prompt, temperature, context length, etc.) in the top-right corner is only accessible before the first message is sent. Once a chat begins, the `ChatSettings` component is unmounted and users lose all ability to adjust parameters. This feature removes that restriction, allowing users to modify all model parameters at any point during a chat session. Modified parameters only affect subsequent messages and are auto-saved to the database.

## Goals

- Allow users to access and edit chat settings at any point during a conversation
- Auto-save parameter changes to the database so they persist across sessions
- Ensure modified parameters apply only to subsequent messages, not retroactively
- Maintain the existing settings UI and UX as-is (minimal viable version)

## User Stories

### US-001: Show chat settings button during active chat

**Description:** As a user, I want to see the chat settings button (model name + gear icon) in the top-right corner even after I've sent messages, so that I can access settings at any time.

**Acceptance Criteria:**
- [ ] The `ChatSettings` component renders in the chat header when `chatMessages.length > 0`
- [ ] The button displays the current model name and gear icon, same as before chat starts
- [ ] Clicking the button opens the same settings popover as before
- [ ] The settings popover does not overlap or obstruct the chat message area
- [ ] Typecheck passes (`npm run type-check`)
- [ ] Verify in browser using dev-browser skill

### US-002: Edit all parameters during active chat

**Description:** As a user, I want to modify system prompt, model, temperature, context length, and other settings during a chat, so that I can fine-tune my conversation without starting over.

**Acceptance Criteria:**
- [ ] All parameters are editable during active chat: model, prompt (system prompt), temperature, context length, include profile context, include workspace instructions, embeddings provider
- [ ] Editing any parameter updates the in-memory `chatSettings` state immediately
- [ ] The settings form behaves identically to pre-chat editing (same validation, same sliders, same dropdowns)
- [ ] When model is changed, temperature and context length are clamped to the new model's valid ranges
- [ ] Typecheck passes (`npm run type-check`)
- [ ] Verify in browser using dev-browser skill

### US-003: Auto-save settings changes to database

**Description:** As a user, I want my parameter changes to be automatically saved to the chat record, so that the settings persist when I reload the page or revisit the chat later.

**Acceptance Criteria:**
- [ ] When a parameter is changed during an active chat, `updateChat()` is called with the updated settings
- [ ] The `chats` table record is updated with the new values for: `model`, `prompt`, `temperature`, `context_length`, `include_profile_context`, `include_workspace_instructions`, `embeddings_provider`
- [ ] The `updated_at` timestamp is refreshed on save
- [ ] After page refresh, reopening the chat shows the last-saved parameter values
- [ ] Typecheck passes (`npm run type-check`)

### US-004: Apply modified settings only to subsequent messages

**Description:** As a user, I expect that changing settings mid-conversation only affects new messages I send, so that my existing conversation history remains consistent.

**Acceptance Criteria:**
- [ ] After changing model mid-chat, the next message uses the new model for generation
- [ ] After changing system prompt mid-chat, the next API call includes the updated system prompt
- [ ] After changing temperature mid-chat, the next API call uses the new temperature
- [ ] Existing messages in the chat history are not regenerated or modified
- [ ] Typecheck passes (`npm run type-check`)

## Functional Requirements

- FR-1: The `ChatSettings` component must render in the chat UI header regardless of whether `chatMessages.length` is 0 or greater
- FR-2: All settings fields (model, prompt, temperature, context length, include profile context, include workspace instructions, embeddings provider) must remain fully interactive during an active chat
- FR-3: When any setting is changed during an active chat (when `selectedChat` exists), the system must call `updateChat()` to persist the change to the `chats` table
- FR-4: The `chatSettings` in-memory state must be the single source of truth for the next message's API call parameters
- FR-5: The chat settings button must display the current model name, updating dynamically if the model is changed mid-chat
- FR-6: Settings changes must not trigger message regeneration or modify existing chat history

## Non-Goals

- No parameter change history or undo functionality
- No visual indicator in the message stream showing where settings were changed
- No per-message parameter overrides (settings are chat-level, not message-level)
- No confirmation dialog before applying setting changes
- No batch/bulk settings changes across multiple chats

## Technical Considerations

### Key Files to Modify

| File | Change |
|------|--------|
| `app/[locale]/[workspaceid]/chat/page.tsx` | Remove conditional rendering that hides `ChatSettings` when `chatMessages.length > 0` |
| `components/chat/chat-ui.tsx` | Add `ChatSettings` component to the chat header area |
| `components/chat/chat-settings.tsx` | Add auto-save logic: call `updateChat()` when settings change and `selectedChat` exists |
| `db/chats.ts` | The existing `updateChat()` function already supports partial updates, no schema changes needed |

### Architecture Notes

- The `ChatSettings` component currently lives in the "empty chat" view (`chat/page.tsx`, line 29-40). It needs to also render inside `ChatUI` when messages exist.
- The `chatSettings` state in `ChatbotUIContext` is already used by `handleSendMessage()` to build API payloads, so updating state alone is sufficient to affect future messages.
- The existing `updateChat()` function in `db/chats.ts` accepts `TablesUpdate<"chats">` which allows partial updates — no new DB functions are needed.
- No database migration is required; the `chats` table already has all necessary columns.

### Auto-Save Strategy

- Use a debounced save (300-500ms) to avoid excessive database writes when adjusting sliders
- Save triggers when any `chatSettings` value changes AND `selectedChat` is not null (i.e., chat already exists in DB)
- For new chats (before first message), existing behavior is preserved: settings are saved when the first message is sent via `handleCreateChat()`

## Success Metrics

- Users can modify any chat parameter at any point during a conversation
- Settings changes persist after page refresh
- No regression in existing chat functionality (message sending, streaming, retrieval)

## Open Questions

- Should there be a visual cue (e.g., a brief toast notification) confirming that settings were saved?
- When switching models mid-chat, should the chat name/title update to reflect the new model?
