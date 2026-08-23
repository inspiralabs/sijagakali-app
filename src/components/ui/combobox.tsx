import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  onAddNew?: (label: string) => void | Promise<void>;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  addNewLabel?: (query: string) => string;
}

export function Combobox({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = 'Pilih...',
  emptyText = 'Tidak ada hasil.',
  disabled = false,
  addNewLabel = (q) => `+ Tambah "${q}"`,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const hasExactMatch = options.some((o) => o.label.toLowerCase() === q);
  const showAddNew = Boolean(onAddNew) && q.length > 0 && !hasExactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cari atau ketik baru..." value={query} onValueChange={setQuery} />
          <CommandList>
            {filtered.length === 0 && !showAddNew && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </CommandItem>
              ))}
              {showAddNew && (
                <CommandItem
                  value={`__add__${query}`}
                  onSelect={async () => {
                    await onAddNew!(query.trim());
                    setQuery('');
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {addNewLabel(query.trim())}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
