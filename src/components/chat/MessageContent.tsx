"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/lib/app-store";
import { useMemo, Fragment } from "react";

interface MessageContentProps {
  content: string;
  className?: string;
}

export function MessageContent({ content, className }: MessageContentProps) {
  const users = useAppStore((s) => s.users);
  const servers = useAppStore((s) => s.servers);

  const emojiMap = useMemo(() => {
    const map = new Map<string, { name: string; url: string }>();
    Object.values(servers).forEach((srv) => {
      srv.customEmojis?.forEach((e) => map.set(e.id, { name: e.name, url: e.url }));
    });
    return map;
  }, [servers]);

  const mentionResolved = content
    .replace(/<@([a-zA-Z0-9_-]+)>/g, (match, userId: string) => {
      const user = users[userId];
      if (!user) return match;
      return `**@${user.username}**`;
    })
    .replace(/\n/g, "  \n");

  const hasCustomEmoji = /<:[a-zA-Z0-9_-]+:>/.test(mentionResolved);

  if (!hasCustomEmoji) {
    return (
      <div className={cn("prose prose-invert prose-sm max-w-none", className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {mentionResolved}
        </ReactMarkdown>
      </div>
    );
  }

  const parts = mentionResolved.split(/(<:[a-zA-Z0-9_-]+:>)/g);

  return (
    <div className={cn("prose prose-invert prose-sm max-w-none", className)}>
      {parts.map((part, i) => {
        const emojiMatch = part.match(/^<:([a-zA-Z0-9_-]+):>$/);
        if (emojiMatch) {
          const emoji = emojiMap.get(emojiMatch[1]);
          if (emoji) {
            return (
              <img
                key={i}
                src={emoji.url}
                alt={emoji.name}
                title={`:${emoji.name}:`}
                className="inline-block w-6 h-6 object-contain align-middle mx-0.5"
              />
            );
          }
          return <Fragment key={i}>{part}</Fragment>;
        }
        if (!part) return null;
        return (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

const MD_COMPONENTS = {
  p: ({ children }: any) => <p className="m-0">{children}</p>,
  br: () => <br />,
  strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  code: ({ className, children, ...props }: any) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="bg-[#1e1f22] rounded p-3 my-2 overflow-x-auto text-sm">
          <code {...props}>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-[#1e1f22] px-1.5 py-0.5 rounded text-sm" {...props}>
        {children}
      </code>
    );
  },
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] hover:underline">
      {children}
    </a>
  ),
  img: ({ src, alt }: any) =>
    src ? (
      <span className="block my-1">
        <img
          src={src}
          alt={alt ?? "Image"}
          className="max-w-sm max-h-64 rounded object-contain bg-[#1e1f22]"
        />
      </span>
    ) : null,
};
