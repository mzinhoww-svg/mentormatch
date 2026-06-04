import { Mark } from '../ui/Mark.js';

/**
 * Static product anchor for the hero — a stylized snippet of the mentor
 * directory rendered with brand tokens. Decorative (aria-hidden); it shows
 * "what the product looks like" without shipping a screenshot asset.
 */
export function HeroMockup() {
  const rows = [
    { initials: 'AC', name: 'Ana Costa', area: 'PRODUTO · DISCOVERY', chip: 'Disponível' },
    { initials: 'RM', name: 'Rafael Mendes', area: 'DADOS · ANALYTICS', chip: 'Disponível' },
    { initials: 'JS', name: 'Julia Souza', area: 'LIDERANÇA · GESTÃO', chip: '2 vagas' },
  ];
  return (
    <div className="mk-hero-mockup" aria-hidden="true">
      <div className="mk-mock-glow" />
      <div className="bar"><i /><i /><i /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Mark size={18} ink="var(--argila-100)" accent="var(--brand-primary)" decorative />
        <span className="mk-mock-sub">Diretório de mentores</span>
      </div>
      {rows.map((r) => (
        <div className="mk-mock-card" key={r.initials}>
          <div className="mk-mock-row">
            <span className="mk-mock-av">{r.initials}</span>
            <span>
              <span className="mk-mock-name" style={{ display: 'block' }}>{r.name}</span>
              <span className="mk-mock-sub">{r.area}</span>
            </span>
            <span className="mk-mock-chip">{r.chip}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
