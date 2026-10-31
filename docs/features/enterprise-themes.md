# Enterprise Themes

The existing header Light/Dark toggle remains the only mode selector. Theme style,
brand colors and typography are independent of mode. Shared ERP control heights,
grid dimensions and print formats are unchanged.

## Scope and preservation

Effective appearance is application defaults, then company configuration, then a
permitted store override. A verified Tenant Administrator manages company branding
without selecting a store. Store administrators can edit only assigned stores whose
override is permitted; they cannot publish company defaults. Ordinary staff inherit
their active store appearance.

The migration creates `tenant_themes`, `theme_revisions` and
`tenant_theme_presets`. It does not rewrite store configurations or existing store
presets. Before company governance is first published, legacy behavior is retained.
The first company policy defaults to preserving stores with existing customizations.
Disabling a store override retains its saved configuration but stops using it.

## Workspace

Styles, Brand Colors, Typography, Store Overrides and Presets & History are grouped
in tabs. The preview uses a separate iframe document and Emotion cache, including
dialog/menu portals, and contains sample records only. Draft changes and preview
presets do not change the live application. Applying changes requires confirmation;
company confirmation lists affected stores. Clearing a store override restores
inheritance. Named presets are saved separately from publishing.

Default, Liquid Glass, Glassmorphism and Liquid AI remain available. Saved Apple and
Playfair configurations remain editable. Shared data surfaces and overlay menus are
opaque to protect readability; decorative glass effects honor reduced-motion and
reduced-transparency preferences with a fallback when blur is unavailable.

## Validation and history

Both frontend and server check supported fields, valid hex colors and 4.5:1 text
contrast against page and surface colors. Company publishing also checks retained
store overrides against the new company values. General store CRUD cannot update
theme configuration outside these controls.

Company writes require `expected_revision`; the workspace includes it for both
company and store writes. A stale write returns 409 and keeps the draft. Legacy
store clients may omit it for compatibility. Writes serialize on the company/store
records. The first write captures a baseline, and apply, preset application and
restore append revisions with actor and timestamp. Restoration never deletes history.

Routes are `/tenant/theme`, `/tenant/theme-presets`, `/tenant/theme-history`, and
equivalent `/companies/{storeId}/...` endpoints. History returns 50 revisions with
`meta.next_before`; use `?before_revision=...` to retrieve earlier revisions.
POST `theme-history/{revisionId}/restore` restores within the same scope, with a
revision check and current validation. Company restoration also restores its override
policy, excluding stores that no longer exist or belong to the company.

Presets & History also offers Delete for one revision and Clear history for the
selected scope, both with confirmation. DELETE `theme-history/{revisionId}` and
DELETE `theme-history` require `expected_revision`. Removal erases saved restore
data and hides those revisions without changing the active theme, presets or draft.
Revision numbers remain monotonic; removed revisions cannot be restored.

## Refresh and offline behavior

Auth responses resolve the effective company/store theme. After publishing, the
workspace refreshes the current session. Focus and online events recheck `/auth/me`
for changed branding; failed requests retain the last saved appearance and session.
Web fonts fall back to installed fonts offline. Saving, publishing or restoring still
requires a connection to the ERP backend.
