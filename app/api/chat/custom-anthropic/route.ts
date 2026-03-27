import { Database } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"
import { createClient } from "@supabase/supabase-js"
import { AnthropicStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import Anthropic from "@anthropic-ai/sdk"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, customModelId } = json as {
    chatSettings: ChatSettings
    messages: any[]
    customModelId: string
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: customModel, error } = await supabaseAdmin
      .from("models")
      .select("*")
      .eq("id", customModelId)
      .single()

    if (!customModel) {
      return new Response(
        JSON.stringify({
          message: error?.message || "Custom model not found"
        }),
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({
      apiKey: customModel.api_key || "",
      baseURL: customModel.base_url || undefined
    })

    // Extract system message (first message) and format remaining messages
    const systemMessage =
      messages.length > 0 && messages[0].role === "system"
        ? messages[0].content
        : ""
    const userMessages =
      messages.length > 0 && messages[0].role === "system"
        ? messages.slice(1)
        : messages

    const formattedMessages = userMessages.map((message: any) => {
      const messageContent =
        typeof message?.content === "string"
          ? [message.content]
          : message?.content

      return {
        ...message,
        content: messageContent.map((content: any) => {
          if (typeof content === "string") {
            return { type: "text", text: content }
          } else if (
            content?.type === "image_url" &&
            content?.image_url?.url?.length
          ) {
            const url = content.image_url.url
            if (url.startsWith("data:")) {
              return {
                type: "image",
                source: {
                  type: "base64",
                  media_type: getMediaTypeFromDataURL(url),
                  data: getBase64FromDataURL(url)
                }
              }
            } else {
              return {
                type: "image",
                source: {
                  type: "url",
                  url
                }
              }
            }
          } else {
            return content
          }
        })
      }
    })

    const thinkingBudget = customModel.thinking_budget_tokens || 0
    const useThinking = thinkingBudget > 0

    const createParams: Record<string, any> = {
      model: customModel.model_id,
      messages: formattedMessages,
      temperature: useThinking ? 1 : chatSettings.temperature,
      system: systemMessage,
      max_tokens: useThinking ? Math.max(4096, thinkingBudget + 4096) : 4096,
      stream: true
    }

    if (useThinking) {
      createParams.thinking = {
        type: "enabled",
        budget_tokens: thinkingBudget
      }
    }

    const requestOptions = useThinking
      ? {
          headers: {
            "anthropic-beta": "interleaved-thinking-2025-05-14"
          }
        }
      : undefined

    const response = await (anthropic.messages.create as Function)(
      createParams,
      requestOptions
    )

    if (useThinking) {
      // Custom stream that separates thinking blocks from text blocks
      let inThinkingBlock = false
      const blockTypes: Map<number, string> = new Map()

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          try {
            for await (const event of response as AsyncIterable<any>) {
              if (event.type === "content_block_start") {
                const blockType = event.content_block?.type || "text"
                blockTypes.set(event.index, blockType)
                if (blockType === "thinking") {
                  inThinkingBlock = true
                  controller.enqueue(encoder.encode("<thinking>"))
                }
              } else if (event.type === "content_block_delta") {
                const delta = event.delta
                if (delta?.type === "thinking_delta" && delta?.thinking) {
                  controller.enqueue(encoder.encode(delta.thinking))
                } else if (delta?.type === "text_delta" && delta?.text) {
                  controller.enqueue(encoder.encode(delta.text))
                }
              } else if (event.type === "content_block_stop") {
                const blockType = blockTypes.get(event.index)
                if (blockType === "thinking" && inThinkingBlock) {
                  controller.enqueue(encoder.encode("</thinking>"))
                  inThinkingBlock = false
                }
              }
            }
            controller.close()
          } catch (err) {
            controller.error(err)
          }
        }
      })

      return new StreamingTextResponse(stream)
    } else {
      const stream = AnthropicStream(response)
      return new StreamingTextResponse(stream)
    }
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Custom Anthropic API Key not found. Please set it in your model settings."
    } else if (errorCode === 401) {
      errorMessage =
        "Custom Anthropic API Key is incorrect. Please fix it in your model settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
