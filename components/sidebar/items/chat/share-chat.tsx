import { ChatbotUIContext } from "@/context/context"
import { createSharedChat, getSharedChatByChatId } from "@/db/shared-chats"
import { Tables } from "@/supabase/types"
import { IconShare } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { useToast } from "@/components/ui/use-toast"

interface ShareChatProps {
  chat: Tables<"chats">
}

export const ShareChat: FC<ShareChatProps> = ({ chat }) => {
  const { profile } = useContext(ChatbotUIContext)
  const { toast } = useToast()
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (!profile) return
    setIsSharing(true)

    try {
      let shareToken: string

      const existing = await getSharedChatByChatId(chat.id, profile.user_id)
      if (existing) {
        shareToken = existing.share_token
      } else {
        const created = await createSharedChat(chat.id, profile.user_id)
        shareToken = created.share_token
      }

      const shareUrl = `${window.location.origin}/share/${shareToken}`
      await navigator.clipboard.writeText(shareUrl)

      toast({ title: "链接已复制" })
    } catch {
      toast({ title: "分享失败，请重试", variant: "destructive" })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <IconShare
      className={`hover:opacity-50 ${isSharing ? "animate-pulse" : ""}`}
      size={18}
      onClick={handleShare}
    />
  )
}
