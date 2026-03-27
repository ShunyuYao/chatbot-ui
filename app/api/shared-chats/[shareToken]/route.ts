import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  request: Request,
  { params }: { params: { shareToken: string } }
) {
  const { shareToken } = params

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: sharedChat, error: sharedChatError } = await supabaseAdmin
      .from("shared_chats")
      .select("*")
      .eq("share_token", shareToken)
      .maybeSingle()

    if (sharedChatError) {
      throw sharedChatError
    }

    if (!sharedChat) {
      return new Response(JSON.stringify({ message: "Share not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    const { data: chat, error: chatError } = await supabaseAdmin
      .from("chats")
      .select("id, name, model")
      .eq("id", sharedChat.chat_id)
      .single()

    if (chatError || !chat) {
      return new Response(JSON.stringify({ message: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("chat_id", sharedChat.chat_id)
      .order("sequence_number", { ascending: true })

    if (messagesError) {
      throw messagesError
    }

    const filteredMessages = (messages || []).filter(
      msg => msg.role !== "system" && msg.role !== "tool"
    )

    return new Response(JSON.stringify({ chat, messages: filteredMessages }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred"
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
