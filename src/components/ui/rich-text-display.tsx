import { cn } from '@/lib/utils';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  // Check if content is HTML or plain text
  const isHtml = content.startsWith('<') && content.includes('>');
  
  if (!isHtml) {
    return (
      <p className={cn("whitespace-pre-wrap", className)}>
        {content}
      </p>
    );
  }

  return (
    <div 
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-p:my-1 prose-ul:my-1 prose-ol:my-1",
        "prose-li:my-0.5",
        "prose-pre:bg-muted prose-pre:text-foreground",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
