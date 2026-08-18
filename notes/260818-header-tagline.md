# Header tagline — "Your second brain, built right."
**Date:** 260818

#### Discussion Topics
- Adding a hero/tagline line to the site header (not the page hero block).
- Where it should live structurally so the existing `space-between` header layout doesn't break.
- Deploying the change to the live site.

#### Key Decisions
- Tagline text: **Your second brain, built right.**
- Placed next to the logo, wrapped with it in a new `.header-left` flex container — keeps `.site-header` at exactly 3 flex children so `justify-content: space-between` still positions nav centre and controls right.
- Styled as `.logo-tagline`: 12px Spline Sans Mono, `var(--mut)`, left divider border using `var(--cardb)`, `white-space: nowrap`.
- Hidden at `max-width: 768px` so it doesn't crowd the mobile header (which already hides nav and search pill).
- Applied to all three pages rather than just the homepage, since the header is duplicated markup.
- Deploy = commit + push to `main` (GitHub Pages serves the branch directly; no build step, no workflow).

#### Actions

| Item | Owner | Notes |
|------|-------|-------|
| Add `.header-left` wrapper + tagline span to index, about, newsletter | Claude | Done |
| Add `.header-left` / `.logo-tagline` CSS + mobile hide rule | Claude | Done — style.css |
| Commit and push to main | Claude | Done — c964d20 |
| Visually confirm on live site | Zhenia | Pages deploy takes ~1 min |

#### References
- `index.html:17-36` — header markup
- `about/index.html`, `newsletter/index.html` — duplicated headers
- `style.css:109-127` — `.header-left`, `.logo`, `.logo-tagline`
- `style.css:849+` — 768px media query, tagline hide rule
- Repo: https://github.com/zzhenia/formula-commons

#### Open Questions
- Header markup is copy-pasted across three files; any future header change needs three edits. Worth extracting to a JS-injected partial or a small build step?
- Should the tagline also appear somewhere on mobile (e.g. inside the hamburger menu), or is hiding it fine?
