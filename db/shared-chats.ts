import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

export const createSharedChat = async (chatId: string, userId: string) => {
  const shareToken = crypto.randomUUID()

  const insert: TablesInsert<"shared_chats"> = {
    chat_id: chatId,
    user_id: userId,
    share_token: shareToken
  }

  const { data: sharedChat, error } = await supabase
    .from("shared_chats")
    .insert([insert])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return sharedChat
}

export const getSharedChatByToken = async (shareToken: string) => {
  const { data: sharedChat, error } = await supabase
    .from("shared_chats")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return sharedChat
}

export const deleteSharedChat = async (shareToken: string, userId: string) => {
  const { error } = await supabase
    .from("shared_chats")
    .delete()
    .eq("share_token", shareToken)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const getSharedChatByChatId = async (chatId: string, userId: string) => {
  const { data: sharedChat, error } = await supabase
    .from("shared_chats")
    .select("*")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return sharedChat
}
