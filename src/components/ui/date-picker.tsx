import { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

function toValue(date: Date | undefined): string {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  allowClear?: boolean;
  /** Override rentang tahun di dropdown caption. Default: 100 tahun ke belakang s.d. maxDate/minDate. */
  yearRange?: { from: number; to: number };
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  disabled,
  minDate,
  maxDate,
  allowClear = false,
  yearRange,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const currentYear = new Date().getFullYear();
  const fromYear = yearRange?.from ?? minDate?.getFullYear() ?? currentYear - 100;
  const toYear = yearRange?.to ?? maxDate?.getFullYear() ?? currentYear + 1;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start gap-2 font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
          {selected ? format(selected, 'd MMMM yyyy', { locale: idLocale }) : placeholder}
          {allowClear && selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Hapus tanggal"
              className="ml-auto rounded-sm p-0.5 opacity-60 hover:bg-accent hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange('');
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={idLocale}
          selected={selected}
          defaultMonth={selected ?? maxDate}
          onSelect={(d) => {
            onChange(toValue(d));
            setOpen(false);
          }}
          disabled={(d) => (minDate ? d < minDate : false) || (maxDate ? d > maxDate : false)}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          initialFocus
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          {allowClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Hapus
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = maxDate && new Date() > maxDate ? maxDate : new Date();
              onChange(toValue(today));
              setOpen(false);
            }}
          >
            Hari ini
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
