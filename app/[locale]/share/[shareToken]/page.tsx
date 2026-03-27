import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import { IconEye } from "@tabler/icons-react"
import Link from "next/link"
import { ShareMessageList } from "./share-message-list"

interface SharePageProps {
  params: {
    shareToken: string
    locale: string
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareToken } = params

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sharedChat } = await supabaseAdmin
    .from("shared_chats")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle()

  if (!sharedChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">该分享链接不存在或已失效</h1>
          <p className="text-muted-foreground mt-2">
            The shared link does not exist or has expired.
          </p>
          <Link
            href="/"
            className="text-primary mt-4 inline-block underline hover:opacity-80"
          >
            使用 Chatbot UI 开始你自己的对话
          </Link>
        </div>
      </div>
    )
  }

  const { data: chat } = await supabaseAdmin
    .from("chats")
    .select("id, name, model")
    .eq("id", sharedChat.chat_id)
    .single()

  if (!chat) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">该分享链接不存在或已失效</h1>
          <p className="text-muted-foreground mt-2">
            The shared chat could not be found.
          </p>
          <Link
            href="/"
            className="text-primary mt-4 inline-block underline hover:opacity-80"
          >
            使用 Chatbot UI 开始你自己的对话
          </Link>
        </div>
      </div>
    )
  }

  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("chat_id", sharedChat.chat_id)
    .order("sequence_number", { ascending: true })

  const filteredMessages = (messages || []).filter(
    msg => msg.role !== "system" && msg.role !== "tool"
  )

  return (
    <div className="flex size-full flex-col overflow-hidden">
      {/* Read-only header */}
      <div className="bg-secondary flex min-h-[50px] w-full flex-col items-center justify-center border-b-2 px-4 py-3">
        <div className="flex w-full max-w-[700px] items-center justify-between">
          <div className="flex items-center space-x-2">
            <IconEye size={18} className="text-muted-foreground" />
            <span className="text-muted-foreground text-sm font-medium">
              只读 / Read-only
            </span>
          </div>
          <Link
            href="/"
            className="text-primary text-sm underline hover:opacity-80"
          >
            使用 Chatbot UI 开始你自己的对话
          </Link>
        </div>
        <div className="mt-1 w-full max-w-[700px]">
          <h1 className="truncate text-lg font-bold">{chat.name}</h1>
          <p className="text-muted-foreground text-sm">{chat.model}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        <ShareMessageList messages={filteredMessages} />
      </div>
    </div>
  )
}
