"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Clock, TrendingUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchService } from "@/lib/services/search.service";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data: history } = useQuery({
    queryKey: ["search-history"],
    queryFn: () => searchService.getHistory(),
    staleTime: 60_000,
  });

  const { data: popular } = useQuery({
    queryKey: ["search-popular"],
    queryFn: () => searchService.getPopular(),
    staleTime: 5 * 60_000,
  });

  const { data: suggestions } = useQuery({
    queryKey: ["search-suggestions", debouncedQuery],
    queryFn: () => searchService.getSuggestions(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  const navigate = (q: string) => {
    if (!q.trim()) return;
    setOpen(false);
    setQuery("");
    router.push(`/dashboard/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") navigate(query);
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showSuggestions = debouncedQuery.trim().length >= 2 && suggestions && suggestions.length > 0;
  const showHistory = !debouncedQuery && history && history.length > 0;
  const showPopular = !debouncedQuery && popular && popular.length > 0;
  const hasContent = showSuggestions || showHistory || showPopular;

  return (
    <Popover open={open && hasContent} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar documentos..."
            className="pl-9 pr-8 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {showSuggestions && (
              <CommandGroup heading="Sugerencias">
                {suggestions!.slice(0, 6).map((s) => (
                  <CommandItem key={s} onSelect={() => navigate(s)}>
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {showHistory && (
              <CommandGroup heading="Recientes">
                {history!.slice(0, 5).map((h) => (
                  <CommandItem key={h.id} onSelect={() => navigate(h.query)}>
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{h.query}</span>
                    {h.resultCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {h.resultCount} docs
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {showHistory && showPopular && <CommandSeparator />}

            {showPopular && (
              <CommandGroup heading="Populares">
                {popular!.slice(0, 5).map((p) => (
                  <CommandItem key={p.query} onSelect={() => navigate(p.query)}>
                    <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{p.query}</span>
                    <span className="text-xs text-muted-foreground">
                      {(p as any).count ?? p.resultCount}×
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!hasContent && debouncedQuery.trim().length >= 2 && (
              <CommandEmpty>Sin sugerencias para "{debouncedQuery}"</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
