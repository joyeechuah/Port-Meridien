# Commercial platform comparison — browser game with possible Step 4 violence
Research date: 15 November 2026. Platform terms can change. Informational research, **not** an acceptance decision or age-rating determination.

| Platform | Technical and business path | Violence/age constraints | Practical fit for Port Meridien |
|---|---|---|---|
| **itch.io** | Direct HTML5 ZIP hosted in browser, free or donation model; **HTML5 embeds take donations rather than pay-to-play access**. Use "Downloadable" to sell access; package an offline playable copy/desktop wrapper if paywall is required. | Fictional rendered adult/violent content is generally allowed if legal; prohibits glorification of sexual violence and other payment-processor restricted content. Individual content review is possible. | **Best first indie release/testing channel**, especially for stylised non-graphic gameplay and direct audience; choose donations vs paid downloadable deliberately. |
| **Steam** | Requires Steam Direct onboarding and **US$100 fee per product** (recoupable after US$1,000 adjusted gross revenue). Browser-only website URL is not itself a normal Steam distributable app; provide packaged desktop executable with offline capability or acceptable client wrapper. | Content survey including **mature violence** and **generative AI** sections, regional rating/data; content must be appropriately labeled/age-gated, lawful, and rights-cleared. Mature violence isn't automatically banned. | Good premium PC option **after** packaging, controls, polish, rights and detailed content survey; highest integration overhead. |
| **CrazyGames** | HTML5 portal, primary revenue through **SDK advertising revenue share**, with selected games eligible for in-game purchases; gameplay, loading, controls, SDK, visibility and review requirements apply. | Its published gameplay requirements state **PEGI 12-compliant** games for its audience (13+). Graphic violence or adult treatment would be incompatible. | Strong audience/monetization fit only for restrained, low-violence version. A bloody Step 4 could eliminate the platform as a route. |
| **Poki** | Curated HTML5 partner submission, typically ad revenue share and possibly exclusive/non-exclusive deal; web exclusivity may affect other browser portals and your GitHub Pages game (check actual agreement). | Explicitly excludes **graphic violence**, visible wounds/body fluids and adult themes; audience includes children. Strict IP/AI-source and performance review. | Consider only a family-friendly non-graphic build; mature combat risks outright rejection. |

**Open commercial decision:** One universal build vs two maintained content variants (non-graphic PG/PEGI12-compatible browser edition vs mature desktop edition). A violence-setting toggle alone may **not** satisfy a platform that evaluates the entire shipped game's code/assets, including hidden content. Decide platforms before committing assets/animation work.

**Other gates:** 24 fictional car names still require trademark screening; car silhouettes, music and cover artwork require independent rights reviews. For Steam, disclose actual AI generated content in the survey. Do not imply age ratings without a recognized rating/survey mechanism.

## Official sources checked
- itch.io: https://itch.io/docs/creators/html5 ; https://itch.io/docs/creators/faq
- Steam: https://partner.steamgames.com/steamdirect ; https://partner.steamgames.com/doc/gettingstarted/contentsurvey
- CrazyGames: https://docs.crazygames.com/requirements/gameplay/ ; https://docs.crazygames.com/requirements/intro/
- Poki: https://developers.poki.com/guide/content-player-safety ; https://developers.poki.com/guide/revenue-deal-types

All platform interpretations above are derived from those official pages as of the research date. Verify the newest terms at application/submission time.
