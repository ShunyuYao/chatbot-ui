"use client"

import { MessageMarkdown } from "@/components/messages/message-markdown"
import { Tables } from "@/supabase/types"
import { IconMoodSmile, IconRobot } from "@tabler/icons-react"
import { FC } from "react"

interface ShareMessageListProps {
  messages: Tables<"messages">[]
}

const ICON_SIZE = 32

export const ShareMessageList: FC<ShareMessageListProps> = ({ messages }) => {
  return (
    <div className="flex flex-col">
      {messages.map(message => (
        <div
          key={message.id}
          className={`flex w-full justify-center ${message.role === "user" ? "" : "bg-secondary"}`}
        >
          <div className="relative flex w-full flex-col p-6 sm:w-[550px] sm:px-0 md:w-[650px] lg:w-[650px] xl:w-[700px]">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                {message.role === "assistant" ? (
                  <IconRobot
                    className="bg-primary text-secondary border-primary rounded border-DEFAULT p-1"
                    size={ICON_SIZE}
                  />
                ) : (
                  <IconMoodSmile
                    className="bg-primary text-secondary border-primary rounded border-DEFAULT p-1"
                    size={ICON_SIZE}
                  />
                )}
                <div className="font-semibold capitalize">{message.role}</div>
              </div>
              <MessageMarkdown content={message.content} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
