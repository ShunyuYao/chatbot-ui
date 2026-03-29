import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { ChatbotUIContext } from "@/context/context"
import { MODEL_NAME_MAX } from "@/db/limits"
import { TablesInsert } from "@/supabase/types"
import { FC, useContext, useState } from "react"

interface CreateModelProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateModel: FC<CreateModelProps> = ({ isOpen, onOpenChange }) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)

  const [isTyping, setIsTyping] = useState(false)

  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [description, setDescription] = useState("")
  const [modelId, setModelId] = useState("")
  const [name, setName] = useState("")
  const [contextLength, setContextLength] = useState(4096)
  const [providerType, setProviderType] = useState<"openai" | "anthropic">(
    "openai"
  )
  const [thinkingBudgetTokens, setThinkingBudgetTokens] = useState(0)

  if (!profile || !selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="models"
      isOpen={isOpen}
      isTyping={isTyping}
      onOpenChange={onOpenChange}
      createState={
        {
          user_id: profile.user_id,
          api_key: apiKey,
          base_url: baseUrl,
          description,
          context_length: contextLength,
          model_id: modelId,
          name,
          provider_type: providerType,
          thinking_budget_tokens: thinkingBudgetTokens
        } as TablesInsert<"models">
      }
      renderInputs={() => (
        <>
          <div className="space-y-1.5 text-sm">
            <div>Create a custom model.</div>
          </div>

          <div className="space-y-1">
            <Label>Provider Format</Label>

            <Select
              value={providerType}
              onValueChange={value =>
                setProviderType(value as "openai" | "anthropic")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI Compatible</SelectItem>
                <SelectItem value="anthropic">Anthropic Native</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Model name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={MODEL_NAME_MAX}
            />
          </div>

          <div className="space-y-1">
            <Label>Model ID</Label>

            <Input
              placeholder="Model ID..."
              value={modelId}
              onChange={e => setModelId(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Base URL</Label>

            <Input
              placeholder={
                providerType === "anthropic"
                  ? "https://api.anthropic.com"
                  : "Base URL..."
              }
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
            />

            <div className="pt-1 text-xs italic">
              {providerType === "anthropic"
                ? "Your API must be compatible with the Anthropic SDK."
                : "Your API must be compatible with the OpenAI SDK."}
            </div>
          </div>

          <div className="space-y-1">
            <Label>API Key</Label>

            <Input
              type="password"
              placeholder="API Key..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Max Context Length</Label>

            <Input
              type="number"
              placeholder="4096"
              min={0}
              value={contextLength}
              onChange={e => setContextLength(parseInt(e.target.value))}
            />
          </div>

          {providerType === "anthropic" && (
            <div className="space-y-1">
              <Label>Thinking Budget (tokens)</Label>

              <Input
                type="number"
                placeholder="0"
                min={0}
                value={thinkingBudgetTokens}
                onChange={e =>
                  setThinkingBudgetTokens(parseInt(e.target.value) || 0)
                }
              />

              <div className="pt-1 text-xs italic">
                Set to 0 to disable extended thinking.
              </div>
            </div>
          )}
        </>
      )}
    />
  )
}
