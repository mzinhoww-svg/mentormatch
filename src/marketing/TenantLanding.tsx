/**
 * Employee-facing landing for an already-contracted tenant. Fully white-labeled
 * (tenant logo, colors, font, radius via brandingStyle), zero MentorMatch
 * selling. Copy comes from the pure buildTenantLanding generator; CTAs go to the
 * tenant's /login. A small "via MentorMatch" sits only in the footer for trust.
 */
import { brandingStyle, type Branding } from '../ui/branding.js';
import { FontLoader } from '../ui/FontLoader.js';
import { BRAND_DEFAULTS } from '../settings/branding.js';
import { buildTenantLanding } from './tenantLanding.js';

export function TenantLanding({ branding }: { branding: Branding }) {
  const company = branding.displayName ?? null;
  const programName = branding.programName;
  const hasCustomProgram = Boolean(programName) && programName !== BRAND_DEFAULTS.programName;
  const c = buildTenantLanding({ programName, companyName: company, hasCustomProgram });
  const title = company ?? programName;

  return (
    <div className="tlp" style={brandingStyle(branding)}>
      <FontLoader fontFamily={branding.fontFamily} />

      <header className="tlp-header">
        <div className="tlp-brand">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={title} className="tlp-logo" />
          ) : (
            <span className="tlp-brand-name">{title}</span>
          )}
        </div>
        <a className="btn btn-primary btn-sm" href="/login">Entrar</a>
      </header>

      <section className="tlp-hero">
        <div className="tlp-wrap">
          <p className="tlp-eyebrow">Benefício {company ? `· ${company}` : ''}</p>
          <h1 className="tlp-h1">{c.hero.headline}</h1>
          <p className="tlp-lead">{c.hero.subheadline}</p>
          <div className="tlp-cta-row">
            <a className="btn btn-primary" href="/login">{c.hero.cta}</a>
            <span className="tlp-free">Gratuito — já é um benefício da {company ?? 'sua empresa'}.</span>
          </div>
        </div>
      </section>

      <section className="tlp-section">
        <div className="tlp-wrap tlp-narrow">
          <h2 className="tlp-h2">{c.nextLevel.title}</h2>
          {c.nextLevel.paragraphs.map((p, i) => (
            <p className="tlp-p" key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section className="tlp-section tlp-alt">
        <div className="tlp-wrap">
          <h2 className="tlp-h2">{c.experience.title}</h2>
          <p className="tlp-p tlp-intro">{c.experience.intro}</p>
          <div className="tlp-steps">
            {c.experience.steps.map((s, i) => (
              <div className="tlp-step" key={i}>
                <div className="tlp-step-n">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="tlp-step-t">{s.title}</h3>
                <p className="tlp-step-d">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tlp-section">
        <div className="tlp-wrap">
          <h2 className="tlp-h2">{c.skills.title}</h2>
          <p className="tlp-p tlp-intro">{c.skills.intro}</p>
          <div className="tlp-skills">
            {c.skills.items.map((s) => (
              <span className="tlp-skill" key={s}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="tlp-section tlp-alt">
        <div className="tlp-wrap tlp-narrow">
          <h2 className="tlp-h2">{c.community.title}</h2>
          {c.community.paragraphs.map((p, i) => (
            <p className="tlp-p" key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section className="tlp-section">
        <div className="tlp-wrap">
          <h2 className="tlp-h2">{c.stories.title}</h2>
          <div className="tlp-stories">
            {c.stories.items.map((s, i) => (
              <figure className="tlp-story" key={i}>
                <blockquote className="tlp-quote">“{s.quote}”</blockquote>
                <figcaption className="tlp-author">{s.author} · {s.role}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="tlp-section tlp-final">
        <div className="tlp-wrap tlp-narrow tlp-center">
          <h2 className="tlp-h2">{c.finalCta.title}</h2>
          <p className="tlp-lead">{c.finalCta.subtitle}</p>
          <a className="btn btn-primary" href="/login">{c.finalCta.cta}</a>
        </div>
      </section>

      <footer className="tlp-footer">
        <span>{title}</span>
        <span className="tlp-via">via MentorMatch</span>
      </footer>
    </div>
  );
}
