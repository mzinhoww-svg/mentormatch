'use client';
/**
 * Shared presentational components and a tiny data hook used across the product
 * pages. Loading uses the brand's spinning "A Corrente" — the canonical loader.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Mark } from './Mark.js';
import { ApiError } from './api.js';

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <Mark size={22} className="mm-live fast" />
      <span>{label}</span>
    </div>
  );
}

/** Shimmer placeholders shown while a card grid loads (less jarring than a spinner). */
export function SkeletonGrid({ count = 3, cols = 3 }: { count?: number; cols?: 2 | 3 | 4 }) {
  return (
    <div className={`grid grid-${cols}`} aria-hidden role="presentation">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skel-card" />
      ))}
    </div>
  );
}

/** Accessible confirmation modal for destructive actions. Closes on Esc / backdrop. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Voltar',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="mm-overlay" onClick={onCancel}>
      <div className="mm-dialog" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {message ? <p>{message}</p> : null}
        <div className="mm-dialog-actions">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/** 1–5 star rating. Renders a static result once `value` is set. */
export function StarRating({
  value,
  onRate,
  label = 'Avaliar',
}: {
  value: number | null;
  onRate: (n: number) => void;
  label?: string;
}) {
  if (value !== null) {
    return (
      <span className="tag tag-green" data-testid="rated">Avaliado: {value}/5</span>
    );
  }
  return (
    <span className="mm-stars" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className="mm-star" aria-label={`Nota ${n}`} onClick={() => onRate(n)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9 6.2 20.9l1.1-6.47L2.6 9.85l6.5-.95L12 2.5z" />
          </svg>
        </button>
      ))}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden>
        <Mark size={38} ink="var(--line-strong)" accent="var(--brand-primary)" decorative />
      </span>
      <div className="empty-title">{title}</div>
      {hint ? <p>{hint}</p> : null}
      {action ? (
        <a className="btn btn-primary btn-sm" href={action.href} style={{ marginTop: 'var(--sp-2)' }}>
          {action.label}
        </a>
      ) : null}
    </div>
  );
}

/** Consistent page header (eyebrow + title + subtitle, optional right actions). */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="page-head-main">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </div>
  );
}

export function Banner({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  return <div className={`banner banner-${kind}`}>{children}</div>;
}

/**
 * Canonical status → { label PT, tag class } map used across the product, so
 * every screen labels statuses consistently (no more raw English statuses).
 */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  // requests
  pending: { label: 'Pendente', cls: 'tag-ember' },
  waitlisted: { label: 'Em fila', cls: 'tag-gray' },
  accepted: { label: 'Aceita', cls: 'tag-green' },
  rejected: { label: 'Recusada', cls: 'tag-gray' },
  cancelled: { label: 'Cancelada', cls: 'tag-gray' },
  expired: { label: 'Expirada', cls: 'tag-gray' },
  // sessions
  requested: { label: 'Solicitada', cls: 'tag-ember' },
  confirmed: { label: 'Confirmada', cls: 'tag-green' },
  completed: { label: 'Concluída', cls: 'tag-gray' },
  // mentorships
  active: { label: 'Ativa', cls: 'tag-green' },
  ended: { label: 'Encerrada', cls: 'tag-gray' },
  // user account status
  suspended: { label: 'Suspenso', cls: 'tag-gray' },
};

export function StatusTag({ status }: { status: string }) {
  const m = STATUS_MAP[status] ?? { label: status, cls: 'tag-gray' };
  return <span className={`tag ${m.cls}`}>{m.label}</span>;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'erro_inesperado';
}

interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Loads a resource on mount; exposes reload for after-mutation refreshes. */
export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loader()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick, ...deps]);

  return { data, error, loading, reload };
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
