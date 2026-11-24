## Skill routing

When the user's request matches an available skill, invoke it using the host's skill workflow. Route only to skills in the session's available-skills list; answer directly for quick questions or small scoped edits.

Key routing rules:
- Product ideas/brainstorming → /office-hours
- Strategy/scope → /plan-ceo-review
- Architecture → /plan-eng-review
- Design system/plan review → /design-consultation or /plan-design-review
- Full review pipeline → /autoplan
- Bugs/errors → /investigate, unless one read-only check confirms the cause and a narrow fix
- QA/testing site behavior → /qa or /qa-only
- Code review/diff check → /review
- Visual polish → /design-review
- Ship/deploy/PR → /ship or /land-and-deploy
- Save progress → /context-save
- Resume context → /context-restore
- Author a backlog-ready spec/issue → /spec

## Project structure

- Layout and naming rules: `docs/folder-structure.md`. Follow them for new files: backend code in
  `Http/Controllers/Api/V1/<Module>`, `Services/<Module>`, `Http/Requests/<Module>`; frontend code in
  `frontend/src/features/<feature>` or `shared/`, imported with the `@/` alias.
- Architecture and request flow: `docs/architecture.md`. API endpoints: `docs/api-reference.md`
  (regenerate after route changes). Deploy: `docs/deployment.md`. Tests: `docs/testing.md`.
- Controller class names are permission keys (`BusinessPermissions`). Don't rename them casually.

## Writing for users

Applies to text people read: toasts, errors, help paragraphs, emails, docs. Not code comments.

- No em dashes in sentences. Use a period, colon or comma. A lone "—" for an empty table cell is fine.
- Say what happened and what to do, in plain words. No "successfully", "seamless", "robust", "leverage", "please note that".
- No internal names or jargon in customer text ("control plane", project folder names). Use the product name, Vynerix.
- A help text must be true. Check it against the code before writing a claim about what the system does or enforces.
- Registered SMS/WhatsApp templates are approved by the carrier and Meta. Do not reword them without re-approval.
