---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface: index.html (Valoverstas homepage)

## Scope & mode
Persuade. Flagship surface establishing the site's new visual world; the rest of the site (blog, archive, privacy page) inherits this system once approved here.

## Audience, job, action, proof, constraints
- Audience: Finnish PK-yrittäjä with an underperforming/outdated site, evaluating whether to redo it and with whom.
- Job: decide whether Valoverstas is credible and different enough to book a call.
- Action: contact form submission / package selection.
- Proof/content: three productized tiers (Tuikku/Lamppu/Majakka), 4-step process, ROI calculator, stats/testimonials already in place, FAQ.
- Constraints: no Valok mention, no founder surname, no phone number anywhere except tietosuoja.html (legal exception). First name "Aleksanteri" may appear. Static HTML/CSS/JS, no build step, must keep working on GitHub Pages. Formspree is the only backend.

## Chosen direction and memorable moment
World: suminagashi fluid-ink basin (Japanese paper marbling), user-adopted after being dealt as a declined challenger against the rolled "sauna instrument-panel" direction.

Fusion resolution (this is the load-bearing design decision for the whole build): the ever-shifting marbling material stays as **atmosphere and one signature interactive moment**, not as the site's navigation model. Concretely:
- Hero background: a real WebGL fluid-ink simulation the visitor's cursor drags color through (indigo/carbon ink on cream water). This is the signature interaction.
- The three package tiers (Tuikku/Lamppu/Majakka) are NOT live-simulated; they render as three distinct, fixed "lifted prints" — pre-authored marbled-paper textures of increasing density/complexity (Tuikku = one clean simple swirl single color, Lamppu = richer two-tone pattern, Majakka = the most elaborate deep multi-color sheet). Comparable and stable, per Persuade-mode's "conversion lives in the form's own vocabulary" rule.
- Typography stays a quiet, calm humanist sans held to a still cream margin outside the ink (per the world's own system grammar) — the ink is the visual event, type is not competing with it.
- Mascot: the hedgehog stays a solid, brand-recognizable illustrated character (round glasses, warm-brown quills, cream face/belly — per PRODUCT.md Brand Commitments) standing at the edge of the basin / interacting with the ink, never dissolved into abstract ink shapes itself.
- A continuous flowing ink-current visual thread (thin, quiet) runs behind section transitions down the page as a spine, tying an otherwise conventional page structure together without becoming the navigation model itself.

Execution contract: **code-led**. No pixel-locked comp for this page; ambition lives in this brief's FIRST VIEWPORT description and the named signature interaction (live pointer-reactive fluid basin), audited in the finish review by behavior, not image overlay.

## Unresolved decisions
- Exact palette hex values and the humanist sans typeface pick happen at build time (DESIGN.md is written from the built world, not before).
- Whether the flowing ink-spine motif extends usefully into blog post pages (thinner content, less hero real estate) is deferred until the homepage system is approved and propagation begins.
