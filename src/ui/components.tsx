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

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <span className="eyebrow">Nada por aqui ainda</span>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      {hint ? <p style={{ marginTop: 8 }}>{hint}</p> : null}
    </div>
  );
}

export function Banner({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  return <div className={`banner banner-${kind}`}>{children}</div>;
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
