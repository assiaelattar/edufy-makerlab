# Pickup educational style study — 19 October 2026

## Direction and review boundary

The user rejected the classical Pulse rendering and requested a Duolingo-inspired style on one page, then approved the initial direction while requesting the reference colors. Pickup is the sole review page. Other modules and heartbeat poursuivre-edufy-pulse remain PAUSED until final design acceptance. Preserve the uncommitted Programs synthetic harness preparation; no Programs UI was changed.

## Delivered

Rounded Nunito typography, tactile buttons with a pressed state, outlined learner cards with initials, an illustrated welcome area and the existing adopted 011Y Rive character. The real Pickup context data, filters, staff authorization, lifecycle checks, verification and command handlers are unchanged. All new theme values are scoped to Pickup.

Colors sampled directly from the supplied screenshots: green #57CC02, blue #1CB0F6, pale lime #D7FFB8, navy #021D2E and pale sky #E0F2FF. Foreground and secondary shades support readable controls. Orange now emphasizes gate status, blue incoming pickups and primary actions, purple learner-ready status, green released pickups and yellow the action count.

The existing sparkquest/components/ParentO11Y.tsx is reused unchanged. Its licensed asset and attribution are copied to public/mascot. The page includes attribution. The component supports reduced motion and pauses after its short introduction, when hidden and offscreen. No dependency was added. The existing runtime adds a 2.18 MB WASM asset before compression plus the 697 KB Rive file.

## Verification

- Production build passed; existing bundle-size warnings remain.
- Light/dark at 1440, 766 and 390 CSS px: document width equals scroll width.
- Mascot loaded in all captures; canvas exposes the existing Hit trigger.
- Verification focuses the identity method. Release is disabled before evidence and confirmation; completing the synthetic form invokes the existing callback with evidence and displays success.
- Captures: pulse-evidence/pickup-playful-{desktop,tablet,mobile}-{light,dark}-2026-10-19.png.
- Standard browser capture failed; screenshots used supported browser CDP Page.captureScreenshot without injecting page state.
- Repository context reader ran; it still selects historical headings and is not a test suite.

These are synthetic UI checks, not real-school or physical-phone acceptance. No production records or permission rules changed. No push or deployment.

## Review

- http://127.0.0.1:5236/?theme=light
- http://127.0.0.1:5236/?theme=dark

Run node scripts/preview-pulse-pickup.mjs and restart after edits. The preview has theme links and sample-data labels. Await final acceptance before extending this style to other modules.


## Palette revision — orange and status colors

User feedback: orange was missing and the green/blue treatment did not yet express the full reference palette. Sampled the new attached palette image directly: orange #FF9000, purple #DC7BFF, yellow #FFC700. Retained the previously sampled green #57CC02 and blue #1CB0F6. These are image samples, not a claim about current official brand tokens.

Orange now fills the gate summary tile, arrival initials/status chips and selected arrival filter. Blue and green fill the other summary tiles. Purple identifies learner-ready cards; yellow calls attention to pending handoffs. Labels remain present throughout. All changes are Pickup-scoped; no command, data, authorization or lifecycle logic changed.

Verification: production build passed in 23.01 seconds (existing chunk-size warnings). Final CSS preview compilation passed after equalizing mobile tile heights. Light/dark at 1440 and 390 CSS px have no horizontal overflow. Browser computed orange is rgb(255, 144, 0). Arrival filter selects only the arrived learner and becomes orange. Verification autofocus and disabled release guard remain intact. Rive trigger loaded. Synthetic QA only; real-account and physical-phone acceptance remain pending.

Evidence: pulse-evidence/pickup-palette-{desktop,mobile}-{light,dark}-2026-10-19.png. Dark desktop capture shows the operational cards further down the page. Review links remain unchanged. Wider rollout and heartbeat remain paused for final user acceptance.
