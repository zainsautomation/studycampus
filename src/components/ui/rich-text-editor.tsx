import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Code, 
  Link as LinkIcon,
  Strikethrough
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Write something...",
  className,
  minHeight = "100px"
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none p-3 focus:outline-none`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.setContent('');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  return (
    <div className={cn("border border-input rounded-xl overflow-hidden bg-background", className)}>
      {/* Floating Bubble Menu - appears on text selection */}
      <BubbleMenu 
        editor={editor} 
        options={{ 
          placement: 'top',
          offset: 8,
        }}
        className="flex items-center gap-0.5 p-1 rounded-lg bg-popover border border-border shadow-lg"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-1.5 rounded-md transition-colors hover:bg-accent",
            editor.isActive('bold') && "bg-accent text-accent-foreground"
          )}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-1.5 rounded-md transition-colors hover:bg-accent",
            editor.isActive('italic') && "bg-accent text-accent-foreground"
          )}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "p-1.5 rounded-md transition-colors hover:bg-accent",
            editor.isActive('strike') && "bg-accent text-accent-foreground"
          )}
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            "p-1.5 rounded-md transition-colors hover:bg-accent",
            editor.isActive('code') && "bg-accent text-accent-foreground"
          )}
        >
          <Code className="h-4 w-4" />
        </button>
        
        <div className="w-px h-5 bg-border mx-0.5" />
        
        {editor.isActive('link') ? (
          <button
            type="button"
            onClick={removeLink}
            className="p-1.5 rounded-md transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={addLink}
            className="p-1.5 rounded-md transition-colors hover:bg-accent"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        )}
        
        <div className="w-px h-5 bg-border mx-0.5" />
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "p-1.5 rounded-md transition-colors hover:bg-accent",
            editor.isActive('bulletList') && "bg-accent text-accent-foreground"
          )}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "p-1.5 rounded-md transition-colors hover:bg-accent",
            editor.isActive('orderedList') && "bg-accent text-accent-foreground"
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </BubbleMenu>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
