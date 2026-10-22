// Keep portalled menus inside the viewport, opening above fields near the bottom.
export function dropdownPlacement(rect, viewportWidth, viewportHeight) {
  const margin = 8;
  const gap = 4;
  const width = Math.max(0, Math.min(Math.max(rect.width, 220), viewportWidth - margin * 2));
  const below = Math.max(0, viewportHeight - rect.bottom - margin - gap);
  const above = Math.max(0, rect.top - margin - gap);
  const openAbove = below < 208 && above > below;
  const available = openAbove ? above : below;
  const panelHeight = Math.min(256, available);
  return {
    top: openAbove ? rect.top - gap - panelHeight : rect.bottom + gap,
    left: Math.max(margin, Math.min(rect.left, viewportWidth - margin - width)),
    width,
    // Search row and borders occupy up to 48px in addition to the option list.
    maxHeight: Math.max(0, panelHeight - 48),
  };
}
