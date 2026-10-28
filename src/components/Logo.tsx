import { BadgePercent } from 'lucide-react';

export function Logo({ dark = false, suffix }: { dark?: boolean; suffix?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30 ring-1 ring-inset ring-white/20">
        <BadgePercent className="size-5" strokeWidth={2.25} aria-hidden />
      </span>
      <span className={`text-lg sm:text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
        Setup no <span className={dark ? 'text-brand-300' : 'text-brand-600'}>Precinho</span>
      </span>
      {suffix && (
        <span className="ml-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {suffix}
        </span>
      )}
    </span>
  );
}
