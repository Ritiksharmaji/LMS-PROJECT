import type { CourseLevel, Role } from './types';

// Shared with the web app (frontend/src/lib/format.ts).

/** A course price: 0 reads "Free". */
export function price(cents: number, currency = 'USD'): string {
  if (cents === 0) return 'Free';
  return money(cents, currency);
}

/** A money amount (totals, refunds): 0 reads "$0.00". */
export function money(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    cents / 100,
  );
}

export function duration(minutes: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}

export function level(l: CourseLevel): string {
  return l.charAt(0) + l.slice(1).toLowerCase();
}

export function role(r: Role): string {
  return r.charAt(0) + r.slice(1).toLowerCase();
}

export function count(n: number): string {
  return n.toLocaleString('en-US');
}

/** "2h ago", "in 3 days", "yesterday" (Hermes has no Intl.RelativeTimeFormat, so this is spelled out). */
export function relative(
  iso: string | null | undefined,
  now = Date.now(),
): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const say = (n: number, unit: string) => {
    const v = Math.round(n);
    const label = `${v} ${unit}${v === 1 ? '' : 's'}`;
    return diff < 0 ? `${label} ago` : `in ${label}`;
  };
  if (abs < minute) return 'just now';
  if (abs < hour) return say(abs / minute, 'minute');
  if (abs < day) return say(abs / hour, 'hour');
  if (abs < 2 * day) return diff < 0 ? 'yesterday' : 'tomorrow';
  if (abs < 30 * day) return say(abs / day, 'day');
  return date(iso);
}

export function date(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Deadline badge in the design's wording and tone. */
export function due(
  iso: string,
  now = Date.now(),
): { label: string; tone: 'danger' | 'warning' | 'neutral' } {
  const hours = (new Date(iso).getTime() - now) / 3_600_000;
  if (hours < 0) return { label: 'Overdue', tone: 'danger' };
  if (hours < 48)
    return { label: hours < 24 ? 'Due today' : 'Due tomorrow', tone: 'danger' };
  if (hours < 24 * 7)
    return { label: `In ${Math.round(hours / 24)} days`, tone: 'warning' };
  return { label: 'Next week', tone: 'neutral' };
}

export function bytes(n: number | null | undefined): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function greeting(at = new Date()): string {
  const h = at.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
