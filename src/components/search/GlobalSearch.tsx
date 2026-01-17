import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  HelpCircle, 
  MessageSquare, 
  Megaphone, 
  Calendar,
  Search,
  FileText,
  Loader2
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'note' | 'question' | 'post' | 'announcement' | 'update';
  url: string;
}

const typeConfig = {
  note: { icon: BookOpen, label: 'Note', color: 'bg-blue-500/10 text-blue-500' },
  question: { icon: HelpCircle, label: 'Q&A', color: 'bg-purple-500/10 text-purple-500' },
  post: { icon: MessageSquare, label: 'Post', color: 'bg-green-500/10 text-green-500' },
  announcement: { icon: Megaphone, label: 'Announcement', color: 'bg-orange-500/10 text-orange-500' },
  update: { icon: Calendar, label: 'Update', color: 'bg-pink-500/10 text-pink-500' },
};

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Save search to recent
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Perform search
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const searchContent = async () => {
      setIsLoading(true);
      const searchResults: SearchResult[] = [];
      const searchTerm = `%${debouncedQuery}%`;

      try {
        // Search notes
        const { data: notes } = await supabase
          .from('notes')
          .select('id, title, description')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);
        
        if (notes) {
          searchResults.push(...notes.map(n => ({
            id: n.id,
            title: n.title,
            description: n.description || undefined,
            type: 'note' as const,
            url: `/notes?highlight=${n.id}`
          })));
        }

        // Search questions
        const { data: questions } = await supabase
          .from('questions')
          .select('id, title, content')
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .limit(5);
        
        if (questions) {
          searchResults.push(...questions.map(q => ({
            id: q.id,
            title: q.title,
            description: q.content.substring(0, 100),
            type: 'question' as const,
            url: `/qa/${q.id}`
          })));
        }

        // Search posts
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content')
          .ilike('content', searchTerm)
          .limit(5);
        
        if (posts) {
          searchResults.push(...posts.map(p => ({
            id: p.id,
            title: p.content.substring(0, 50) + (p.content.length > 50 ? '...' : ''),
            description: p.content.substring(0, 100),
            type: 'post' as const,
            url: `/posts?highlight=${p.id}`
          })));
        }

        // Search announcements
        const { data: announcements } = await supabase
          .from('announcements')
          .select('id, title, content')
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .limit(5);
        
        if (announcements) {
          searchResults.push(...announcements.map(a => ({
            id: a.id,
            title: a.title,
            description: a.content.substring(0, 100),
            type: 'announcement' as const,
            url: `/announcements?highlight=${a.id}`
          })));
        }

        // Search updates
        const { data: updates } = await supabase
          .from('updates')
          .select('id, title, description')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5);
        
        if (updates) {
          searchResults.push(...updates.map(u => ({
            id: u.id,
            title: u.title,
            description: u.description || undefined,
            type: 'update' as const,
            url: `/updates?highlight=${u.id}`
          })));
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchContent();
  }, [debouncedQuery]);

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    onOpenChange(false);
    setQuery('');
    navigate(result.url);
  };

  const handleRecentSearch = (searchTerm: string) => {
    setQuery(searchTerm);
  };

  // Quick actions
  const quickActions = [
    { label: 'Go to Notes', icon: BookOpen, url: '/notes' },
    { label: 'Go to Q&A', icon: HelpCircle, url: '/qa' },
    { label: 'Go to Posts', icon: MessageSquare, url: '/posts' },
    { label: 'Go to Announcements', icon: Megaphone, url: '/announcements' },
    { label: 'Go to Updates', icon: Calendar, url: '/updates' },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search notes, questions, posts..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <CommandEmpty>No results found.</CommandEmpty>
            
            {/* Search Results */}
            {results.length > 0 && (
              <CommandGroup heading="Search Results">
                {results.map((result) => {
                  const config = typeConfig[result.type];
                  const Icon = config.icon;
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={`${result.type}-${result.title}`}
                      onSelect={() => handleSelect(result)}
                      className="flex items-start gap-3 py-3"
                    >
                      <div className={`p-1.5 rounded-md ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{result.title}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {config.label}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <>
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search, index) => (
                    <CommandItem
                      key={index}
                      value={`recent-${search}`}
                      onSelect={() => handleRecentSearch(search)}
                      className="flex items-center gap-2"
                    >
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Quick Actions */}
            {!query && (
              <CommandGroup heading="Quick Actions">
                {quickActions.map((action) => (
                  <CommandItem
                    key={action.url}
                    value={action.label}
                    onSelect={() => {
                      onOpenChange(false);
                      navigate(action.url);
                    }}
                    className="flex items-center gap-2"
                  >
                    <action.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{action.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
