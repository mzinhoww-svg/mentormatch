'use client';
/**
 * Loads a tenant's chosen Google Font (when allowlisted) by appending its
 * stylesheet <link> once. Renders nothing. The font is applied via the `--sans`
 * CSS var elsewhere; this just makes the @font-face available so it renders
 * instead of falling back. A non-allowlisted/empty family is a no-op.
 */
import { useEffect } from 'react';
import { googleFontHref } from './googleFonts.js';

export function FontLoader({ fontFamily }: { fontFamily: string | null | undefined }) {
  useEffect(() => {
    const href = googleFontHref(fontFamily);
    if (!href || typeof document === 'undefined') return;
    if (document.querySelector(`link[data-mm-font][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-mm-font', '');
    document.head.appendChild(link);
  }, [fontFamily]);
  return null;
}
