# Lifeboat game — page override

This page-specific direction overrides the generic typography recommendation in
`../MASTER.md` where the two conflict.

## Product character

- Adult, cinematic, tactile pass-and-play board game.
- The interface should feel like a table prepared for play, not an admin
  dashboard and not a children's mobile game.
- Dark ocean atmosphere forms the stage; paper cards, wood, ink, and stamped
  labels carry the game state.

## Visual tokens

- Ocean background: `#08171a`; deep edge: `#030a0c`.
- Paper: `#f2e7cf`; paper ink: `#261c14`.
- Primary action: `#ed9d4b`; active highlight: `#ffc26f`.
- Information accent: `#48b4b4`; danger: `#dd6756`; success: `#70c98c`.
- Display type: an offline editorial serif stack (`Iowan Old Style`,
  `Palatino Linotype`, `Georgia`).
- UI type: an offline humanist sans stack (`Avenir Next`, `Inter`, system UI).

## Component rules

- Character and provision cards look like physical, readable game pieces.
- Structural controls use one outline SVG icon family. Do not use emoji as UI
  icons. Card faces may use short typographic tokens such as `H₂O`, `SOS`, or
  `+3`.
- Keep one primary action per screen. Secondary actions remain quiet.
- All touch targets are at least `44 × 44 px`, with at least `8 px` between
  separate targets.
- Body and helper text should remain readable without zoom; avoid text below
  roughly `11 px`.
- Every interactive state needs visible focus, pressed feedback, disabled
  feedback, and reduced-motion support.

## Responsive behavior

- Validate at 375, 768, 1024, and 1440 px, plus a short landscape viewport.
- The page itself must not scroll horizontally.
- Horizontal scrolling is allowed only for intentionally ordered game pieces:
  the lifeboat seats and card rows.
- The fixed game toolbar must respect safe-area insets and must never cover
  actionable content.
