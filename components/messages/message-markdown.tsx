import React, { FC, useMemo } from "react"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { MessageCodeBlock } from "./message-codeblock"
import { MessageMarkdownMemoized } from "./message-markdown-memoized"

interface MessageMarkdownProps {
  content: string
}

function parseThinkingContent(content: string): {
  thinkingBlocks: string[]
  mainContent: string
} {
  const blocks: string[] = []
  let remaining = content

  // Extract complete <thinking>...</thinking> blocks
  remaining = remaining.replace(
    /<thinking>([\s\S]*?)<\/thinking>/g,
    (_, thinking) => {
      blocks.push(thinking)
      return ""
    }
  )

  // Handle incomplete thinking block (still streaming)
  const incompleteMatch = remaining.match(/<thinking>([\s\S]*)$/)
  if (incompleteMatch) {
    blocks.push(incompleteMatch[1])
    remaining = remaining.replace(/<thinking>[\s\S]*$/, "")
  }

  return { thinkingBlocks: blocks, mainContent: remaining.trim() }
}

const markdownProps = {
  remarkPlugins: [remarkGfm, remarkMath],
  components: {
    p({ children }: any) {
      return <p className="mb-2 last:mb-0">{children}</p>
    },
    img({ node, ...props }: any) {
      return <img className="max-w-[67%]" {...props} />
    },
    code({ node, className, children, ...props }: any) {
      const childArray = React.Children.toArray(children)
      const firstChild = childArray[0] as React.ReactElement
      const firstChildAsString = React.isValidElement(firstChild)
        ? (firstChild as React.ReactElement).props.children
        : firstChild

      if (firstChildAsString === "▍") {
        return <span className="mt-1 animate-pulse cursor-default">▍</span>
      }

      if (typeof firstChildAsString === "string") {
        childArray[0] = firstChildAsString.replace("`▍`", "▍")
      }

      const match = /language-(\w+)/.exec(className || "")

      if (
        typeof firstChildAsString === "string" &&
        !firstChildAsString.includes("\n")
      ) {
        return (
          <code className={className} {...props}>
            {childArray}
          </code>
        )
      }

      return (
        <MessageCodeBlock
          key={Math.random()}
          language={(match && match[1]) || ""}
          value={String(childArray).replace(/\n$/, "")}
          {...props}
        />
      )
    }
  }
}

export const MessageMarkdown: FC<MessageMarkdownProps> = ({ content }) => {
  const { thinkingBlocks, mainContent } = useMemo(
    () => parseThinkingContent(content),
    [content]
  )

  return (
    <>
      {thinkingBlocks.length > 0 && (
        <details className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
            思考过程
          </summary>
          <div className="whitespace-pre-wrap px-3 pb-3 text-sm text-zinc-600 dark:text-zinc-400">
            {thinkingBlocks.join("\n\n")}
          </div>
        </details>
      )}

      <MessageMarkdownMemoized
        className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 min-w-full space-y-6 break-words"
        {...markdownProps}
      >
        {mainContent}
      </MessageMarkdownMemoized>
    </>
  )
}
