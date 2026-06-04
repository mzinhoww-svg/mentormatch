import { describe, it, expect } from 'vitest';
import { parseDesignFile } from '../designFile.js';

describe('parseDesignFile — JSON', () => {
  it('reads valid fields and ignores invalid colors', () => {
    const r = parseDesignFile(
      JSON.stringify({
        primaryColor: '#0A0A0A',
        secondaryColor: 'not-a-color',
        programName: 'Trilha Líderes',
        displayName: 'Acme',
      }),
    );
    expect(r.primaryColor).toBe('#0A0A0A');
    expect(r.secondaryColor).toBeUndefined();
    expect(r.programName).toBe('Trilha Líderes');
    expect(r.displayName).toBe('Acme');
  });

  it('falls back to name when displayName is absent', () => {
    expect(parseDesignFile(JSON.stringify({ name: 'Acme Inc' })).displayName).toBe('Acme Inc');
  });
});

describe('parseDesignFile — markdown/text', () => {
  it('takes the first two valid hex colors positionally', () => {
    const r = parseDesignFile('# Marca\n\nPrimária #FF4A1C, secundária #1B5C4C. Resto #ZZZZZZ.');
    expect(r.primaryColor).toBe('#FF4A1C');
    expect(r.secondaryColor).toBe('#1B5C4C');
  });

  it('explicit color keys override positional detection', () => {
    const r = parseDesignFile('#000000 #111111\nprimaryColor: #FF0000\nsecondaryColor = #00FF00');
    expect(r.primaryColor).toBe('#FF0000');
    expect(r.secondaryColor).toBe('#00FF00');
  });

  it('reads program/display names from key:value lines', () => {
    const r = parseDesignFile('programa: Mentoria Acme\nempresa = Acme Inc\n');
    expect(r.programName).toBe('Mentoria Acme');
    expect(r.displayName).toBe('Acme Inc');
  });

  it('returns an empty object for content with nothing recognizable', () => {
    expect(parseDesignFile('apenas um texto qualquer sem nada útil')).toEqual({});
  });
});
