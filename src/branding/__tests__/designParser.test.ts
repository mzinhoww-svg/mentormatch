import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseDesignMarkdown } from '../designParser.js';

const read = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');

describe('parseDesignMarkdown — real DESIGN.md files', () => {
  it('parses sicredi (serif, black, 4px)', () => {
    const d = parseDesignMarkdown(read('www_sicredi_com_br-DESIGN.md'));
    expect(d.title).toMatch(/Sicredi/);
    expect(d.primaryColor).toBe('#000000');
    expect(d.fontFamily).toBe('Times New Roman');
    expect(d.borderRadius).toBe('4px');
    expect(d.palette.length).toBeGreaterThan(2);
  });
  it('parses solu (yellow, poppins, pill 34px)', () => {
    const d = parseDesignMarkdown(read('getsolu_ai-DESIGN.md'));
    expect(d.title).toMatch(/Solu/);
    expect(d.primaryColor).toBe('#FFFF00');
    expect(d.fontFamily).toBe('Poppins');
    expect(d.borderRadius).toBe('34px');
  });
  it('parses salario transparente (blue, parkinsans, 10px)', () => {
    const d = parseDesignMarkdown(read('salariotransparente_com_br-DESIGN.md'));
    expect(d.primaryColor).toBe('#0000FF');
    expect(d.fontFamily).toBe('Parkinsans');
    expect(d.borderRadius).toBe('10px');
  });
  it('never throws on garbage', () => {
    const d = parseDesignMarkdown('no design here');
    expect(d.primaryColor).toBeNull();
    expect(d.warnings.length).toBeGreaterThan(0);
  });
});
