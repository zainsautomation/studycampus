import { useEditor, EditorContent } from '@tiptap/react';
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
  Strikethrough,
  Unlink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
  const [isFocused, setIsFocused] = useState(false);
  
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
    onFocus: () => setIsFocused(true),
    onBlur: () => {
      // Delay to allow toolbar button clicks to register
      setTimeout(() => setIsFocused(false), 150);
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

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    children,
    variant = 'default'
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    variant?: 'default' | 'danger';
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent blur
        onClick();
      }}
      className={cn(
        "p-1.5 rounded-md transition-colors touch-manipulation",
        variant === 'danger' 
          ? "text-destructive hover:bg-destructive/10"
          : isActive 
            ? "bg-primary/15 text-primary" 
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("border border-input rounded-xl overflow-hidden bg-background", className)}>
      {/* Editor Content */}
      <EditorContent editor={editor} />
      
      {/* Bottom Formatting Toolbar - Telegram Style */}
      <div 
        className={cn(
          "flex items-center gap-0.5 px-2 py-1.5 border-t border-border/50 bg-muted/30 transition-all duration-200",
          isFocused ? "opacity-100" : "opacity-50"
        )}
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        {editor.isActive('link') ? (
          <ToolbarButton onClick={removeLink} variant="danger">
            <Unlink className="h-4 w-4" />
          </ToolbarButton>
        ) : (
          <ToolbarButton onClick={addLink}>
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
        )}
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}
