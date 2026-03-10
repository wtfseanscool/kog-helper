# Primer UI Patterns Notes (Product UI)

This note captures key guidance from `https://primer.style/product/ui-patterns/` and the primary linked pages:

- data-visualization
- degraded-experiences
- empty-states
- feature-onboarding
- forms
- loading
- navigation
- notification-messaging
- progressive-disclosure
- saving

## High-impact principles

1. Inputs need visible labels; placeholders are not labels.
2. Keep forms scannable, predictable, and grouped by related intent.
3. Size controls to expected value length (short fields should look short).
4. Use submit-time validation by default; focus invalid fields and show inline errors.
5. Avoid using disabled submit buttons as the primary validation strategy.
6. Keep loading indicators scoped to affected regions.
7. Distinguish empty, no-results, and unavailable/error states.
8. Keep notifications proportional to scope: inline first, snackbar for brief confirmations.
9. Use progressive disclosure sparingly; keep context stable.
10. Keep navigation state URL-addressable when tabs represent navigation state.

## Applied in this app

- Team planner uses compact controls for short values (delimiter, difficulty, stars).
- Team planner keeps `include_unknown_metadata` enabled by default and hides the toggle.
- Team planner removes random count and seed controls and always requests one random map.
- Team planner uses inline validation for missing players and keeps action buttons available.
- Team planner has scoped loading feedback and retry actions for request failures.
- Team planner has explicit initial empty state and no-results guidance.
- Player lookup uses required-field validation and inline helper/error text.
- Player lookup has explicit initial empty state, scoped loading state, and retry on error.
- Player chart uses theme token colors and includes text context for axis meaning.
- App tab state is reflected in URL and supports tab history navigation.

## Ongoing checklist for future UI changes

- Add labels and helper text only when they provide new information.
- Keep spacing compact but maintain tap targets and readability.
- Prefer one clear primary action in each section.
- Do not hide critical actions when data is loading or invalid.
- Reserve snackbars for non-critical, ephemeral confirmations.
- Keep error messages actionable (what failed and what to do next).
- For tables/charts, provide a meaningful state for: loading, empty, no-results, error.
