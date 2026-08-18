# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, no framework (existing codebase; not a new decision).

## Users

Primary user: a Finnish PK-yrittäjä (SME owner/decision-maker) who already has a website but it's underperforming — outdated look, slow, not generating leads, or painful to maintain (commonly a neglected WordPress site). They're evaluating whether to redo it and with whom.

## Product Purpose

Valoverstas designs and builds business websites for Finnish SMEs, and stays on as an ongoing partner for maintenance, content updates, and technical care after launch (not just a one-off build-and-leave project).

## Positioning

Valoverstas is not locked to one tech stack or one type of site. The mechanism a narrower competitor can't truthfully copy: they adapt to whatever the client actually needs — e-commerce, a traditional showcase/marketing site, lead-gen forms, different underlying platforms — and they stay responsible for SEO/GEO (AI-search visibility) as an ongoing concern, not a one-time checkbox. This is explicitly broader than "we only build static sites," even though that's one tool they use and have written about; the differentiator is range + follow-through, not a single technical bet.

## Operating Context

- Three productized service tiers already exist and are load-bearing product facts, not just marketing copy: **Tuikku** (light one-page site, ships in under 2 weeks), **Lamppu** (fuller business site with CMS/blog/referenssit, ~3–5 weeks), **Majakka** (full ongoing partnership: maintenance + continued development).
- A 4-step process is presented on the homepage (project → results).
- Client-facing pages include an ROI calculator (slow-site cost), testimonials/stats, an FAQ block, and a Formspree-based contact form with a package selector.
- Blog (`blogi.html` + `arkisto.html`, 6-most-recent-then-archive pattern) covers SEO/GEO, accessibility, site speed, redesign cost/timeline, security/SSL, GDPR/cookies, conversion, UX psychology, and choosing a web agency.
- Light/dark theme system (`data-theme` attribute, `localStorage`), GDPR-compliant cookie consent banner with Google Consent Mode v2, GA4 analytics.

## Capabilities and Constraints

- No build tooling; every page is a self-contained static HTML file with inline `<style>` following an established shared pattern (nav, cookie banner, theme anti-flash script, footer) — a redesign must preserve this deployability (GitHub Pages, no server, no build step) unless the user explicitly changes it.
- Formspree is the only backend integration (contact form). No CMS, no server-side code.
- `tietosuoja.html` (privacy policy) legally discloses the controller as "Valok Oy" — this is a GDPR requirement, confirmed out of scope for the anonymity constraint below, and must not be edited as part of this redesign.

## Brand Commitments

- **Anonymity constraint (explicit, binding):** outside of `tietosuoja.html`'s required legal disclosure, the redesign must not name Valok, the founder's surname, or a phone number anywhere on the site. The founder's first name, **Aleksanteri**, may appear (e.g. a short "who's behind this" mention), but no surname, no photo of a specific identifiable person tied to a surname, no Valok branding/link.
- **Mascot:** a hedgehog character with round wire-frame glasses is the established brand mascot (reference sheet at `kuvapankki/valoverstas_siilimaskotti_referenssi.png`), distinct from sister-brand Valok's fox — soft warm-brown spiky quills, cream-white face/muzzle/belly, small black round nose, rosy pink blush cheeks, plump rounded body, short stubby limbs. This is a confirmed, preserved asset; the redesign should keep using it, not replace it.
- **Package names** (Tuikku/Lamppu/Majakka) are an established naming convention (Finnish light-themed words: spark/lamp/lighthouse) and are product truth, not to be silently renamed.

## Evidence on Hand

- Full existing site (`website-creation/`) as incumbent implementation: homepage, ~29 blog posts, privacy page, archive page.
- No customer logos, press mentions, or third-party case studies found on the site or referenced by the user — testimonials/stats currently on the homepage should be treated as unverified marketing copy already in place, not something to expand with new invented claims.

## Product Principles

1. Range over specialization: the site should read as capable across site types and ongoing technical care, not as a single-technology boutique.
2. Anonymity by design: the brand voice and mascot carry personality; no surname, photo-identifiable founder, phone number, or Valok tie-in appears outside the legally required privacy page.
3. Deployability is a constraint, not a preference: static HTML/CSS/JS, no build step, must keep working on GitHub Pages with zero server-side code beyond the existing Formspree form.
4. The three productized packages (Tuikku/Lamppu/Majakka) are the commercial backbone and must stay legible and comparable, however the visual redesign reshapes the page.
5. SEO/GEO stewardship is a standing service commitment, not a one-time feature — it can be reflected in ongoing-partnership framing (ties to the Majakka tier).

## Accessibility & Inclusion

No product-specific accessibility requirement was established beyond general web accessibility best practice (the existing blog covers WCAG/saavutettavuus as a topic for clients, which sets an implicit bar for the agency's own site to meet the same standard it advises).
