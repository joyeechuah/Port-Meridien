# Mature-game distribution and payments

Research checked 13 November 2026. Scope: platform policies for Port Meridien's planned fictional violence, including pedestrian/police combat. Sexual content is not part of the supplied plan. This is a product-planning review, not a platform approval or a complete Malaysian legal/tax assessment. Recheck policies and the actual release build before submission.

## Recommendation

Develop and playtest the walk–drive–sail game first. For a first paid release, investigate an itch.io downloadable edition with a free browser demo. Keep the mature edition and any portal-friendly adaptation as explicit product decisions. Do not assume a blood-off preference makes the mature game acceptable to every storefront, advertiser or processor.

A platform permitting a listing, a processor accepting its payments and an age-rating body assigning a rating are three different decisions. None guarantees the others. Browser technology itself does not guarantee distribution acceptance.

## Channel comparison

| Channel | Published constraint | Consequence for this game |
| --- | --- | --- |
| itch.io | HTML5 listings currently take donations; paid access is supported by choosing a downloadable product. Adult-theme labelling and processor rules also apply. [1–3] | Best candidate to investigate for a browser demo plus paid download. Do not promise a paid embedded-browser entitlement that the standard HTML5 format does not provide. |
| Google Play | Fictional game violence is generally allowed, but gratuitous violence and graphic realistic violence can breach policy. Paid downloads and digital unlocks generally use Play Billing, subject to specific regional/program exceptions. [4–5] | A restrained fictional-action build may be viable; no guarantee for realistic civilian harm or gore. Budget for Android packaging, lifecycle testing and billing integration. |
| Apple App Store | Guidelines 1.1.2–1.1.3 restrict realistic killing/maiming and encouragement of dangerous weapon use. 4.2 requires more than a repackaged website. 3.1.1 generally requires IAP for digital unlocks, with storefront-specific external-link exceptions, including the US. 5.2 requires appropriate content rights. [6] | Higher review uncertainty for the planned mature build. A minimal WebView wrapper and a gore toggle are not an approval strategy. Do not apply US payment-link rules globally. |
| CrazyGames | Games must meet PEGI 12. Basic Launch is unmonetised; Full Launch requires its SDK. Ads use its system; selected games can apply for purchases through Xsolla. [7–8] | The proposed unrestricted civilian-combat edition is a poor fit. A separate exploration/driving adaptation may fit, subject to review. Not a straightforward paid-download store. |
| Poki | All-ages content rules exclude graphic violence and adult themes. Monetisation is through its ads; no internal purchases. External resources are blocked by default. [9–10] | Poor fit for the mature edition. A substantially adapted non-combat game would also need bundled libraries/fonts and platform integration. |
| Own commercial website | Host and processor must permit the product. GitHub Pages does not permit use as free hosting for an online business/e-commerce site primarily facilitating transactions. [11] | A commercial host and checkout/entitlement design are separate work. Do not turn the current GitHub Pages deployment into the paid service. |

These suitability judgments are inferences from the cited rules, not decisions from the platforms. No submission or account application was made.

## Why a no-gore switch is insufficient

PEGI describes apparently motiveless killing and violence against defenceless characters among its PEGI 18 criteria. That makes freely attacking non-hostile pedestrians a material rating risk even without blood. This is not an official rating prediction for an unbuilt game. [12]

Proposed architecture, not an implementation request:

| Control | Purpose | Example |
| --- | --- | --- |
| Release content profile | Defines the mechanics and assets permitted in a reviewed release | Exploration-only portal build; fictional-action build |
| Player violence-visibility setting | Reduces effects within the approved profile | Less blood, shorter hit effects, no persistent decals |
| Age classification and disclosures | Describes all accessible content in the submitted release | Answer the store questionnaire accurately; show content notices |

The restricted build must actually omit/disable excluded mechanics and assets. Do not hide them from reviewers or let a remote flag re-enable them after approval. A separate profile should not create a separate copy of all driving physics; keep shared systems and explicit content configuration. A mobile package or controlled export pipeline would be a future architecture decision, not a change to today's single-file development convention.

## Payments: what is and is not established

**itch.io:** distinguish direct payments from its collected-payout model. The collected model makes itch.io merchant of record and requires tax identity validation, payout setup and review. It is not an instant withdrawal arrangement. Confirm that the chosen payout method works for the actual Malaysian seller account before announcing sales; no account eligibility was tested here. [3]

**Stripe:** Malaysia is supported. Its adult-content prohibition specifically covers sexually gratifying content; a mature violence rating is not automatically the same category. Its rules also address unlawful violence and infringing products. These provisions do not amount to approval of this game. Disclose the actual content and sales model accurately, and resolve any classification uncertainty with the provider. [13–14]

**PayPal:** the Malaysian help page directs sellers to its Acceptable Use Policy. The Malaysian full policy could not be retrieved in this review. The accessible US policy includes mature-content approval provisions, but it must not be treated as the Malaysian account contract. Malaysian treatment of this exact product remains unverified. Do not infer a universal ban on fictional violence, or guaranteed acceptance. [15–16]

The 2025 itch.io NSFW/payment disruption shows why processor access must be checked, but it is not evidence that every non-sexual mature game is prohibited today. Apply the current FAQ and payment terms to the actual build; do not market it as sexual adult content when that is not its subject. [2,17]

Recommended initial commercial design: one paid edition, with no cash-out currency, gambling, paid random rewards or recurring subscription. This is a scope recommendation, not an assertion that those systems already exist.

For a web checkout, keep secret credentials and fulfilment verification on a server. A public JavaScript file or editable localStorage flag cannot securely prove that a purchase occurred. A downloadable product can use the storefront's delivery mechanism; do not create custom authentication and DRM merely to sell an initial download.

## Advertising

Google's publisher restrictions include a specific gameplay-imagery exception. Ordinary fictional game combat is not automatically restricted solely under its shocking-content rule; the exception excludes categories such as torture, sexual violence, violence against minors or prominent real people, and discriminatory violence. Other policies and advertiser demand still apply, and restricted inventory may receive fewer or no ads. This does not override CrazyGames/Poki's stricter content standards. [18]

No blanket result is claimed for every ad network: direct Google publisher products and the two portals above were checked. Another network requires its own review. Do not forecast ad revenue before admission and testing.

## Existing-code release issues

The inspected baseline CARS array still names real manufacturers and models, including Volkswagen Golf GTI, Mazda MX-5 and BMW M3 Competition. The audio directory contains showroom.mp3, cruise.mp3 and highway.mp3. Their existence does not prove infringement; the inspection did not establish licences or commercial-use rights.

Before a paid release, record source, creator, licence/permission, commercial-use scope and required attribution for vehicle branding/designs, music, fonts and third-party libraries. Use fictional vehicles/branding where appropriate, with a deliberate art review rather than only changing the displayed name. Platform rights rules remain relevant even for procedurally generated assets. [6,13]

Current production code loads three.js and Google Fonts externally. A Poki build would need to address its external-request restriction. A downloadable edition should bundle required assets, include their notices and be tested offline where promised. An Android/iOS wrapper requires its own persistence, back-button, pause/resume, audio and purchase-restore validation; it is not included in this work.

The current README's no-analytics/no-accounts claims must be revisited if a release adds ads, checkout, accounts or a portal SDK. Describe what the game collects separately from what the hosting platform processes.

## Decision and evidence required before commercial implementation

| Decision | Proposed position | Still unresolved |
| --- | --- | --- |
| First channel | itch.io free demo + paid download investigation | Actual build review, seller/payout onboarding |
| Mature combat | Keep as the stated future direction | Exact depiction, civilian interaction, rating and channel fit |
| Portal edition | Optional separate adaptation | Whether its scope justifies the maintenance cost |
| Payment integration | Store-provided delivery initially | Product format, account eligibility and refund/support process |
| Asset rights | Inventory before paid launch | Vehicle, audio and other permissions/attributions |
| Local obligations | Separate review before sales | Applicable Malaysian business, tax and content obligations; not assessed here |

No exact platform commission, processing fee, net revenue or tax outcome is assumed. These depend on the seller account, channel, buyer geography and programme terms.

## Official sources

All accessed 13 November 2026; verify again immediately before submission.

1. [itch.io HTML5 uploads and payments](https://itch.io/docs/creators/html5)
2. [itch.io creator FAQ, adult content and processor rules](https://itch.io/docs/creators/faq#is-adult-content-allowed)
3. [itch.io payments and payouts](https://itch.io/docs/creators/payments)
4. [Google Play inappropriate content](https://support.google.com/googleplay/android-developer/answer/9878810?hl=en)
5. [Google Play payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
6. [Apple App Review Guidelines, sections 1.1, 3.1, 4.2 and 5.2](https://developer.apple.com/app-store/review/guidelines/)
7. [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
8. [CrazyGames launch and monetisation requirements](https://docs.crazygames.com/requirements/intro/)
9. [Poki content and player safety](https://developers.poki.com/guide/content-player-safety)
10. [Poki requirements](https://developers.poki.com/guide/requirements-quality)
11. [GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
12. [PEGI 18 definition](https://pegi.info/pegi-18)
13. [Stripe prohibited and restricted businesses](https://stripe.com/legal/restricted-businesses)
14. [Stripe supported countries](https://stripe.com/global)
15. [PayPal MY policy help](https://pep.paypal.com/my/cshelp/article/what-is-paypal%E2%80%99s-acceptable-use-policy-and-where-can-i-find-it-help270?locale.x=en_MY)
16. [PayPal US acceptable use policy (US context only)](https://pep.paypal.com/us/legalhub/paypal/acceptableuse-full?country.x=US&locale.x=en_US)
17. [itch.io July 2025 NSFW update (historical context)](https://itch.io/updates/update-on-nsfw-content)
18. [Google Publisher Restrictions](https://support.google.com/publisherpolicies/answer/10437795?hl=en-GB)
