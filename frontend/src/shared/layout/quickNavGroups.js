/** Every page the user can open, grouped by module. A module with no sub pages (Dashboard) goes under "General". */
export function buildQuickNavGroups(items) {
  const groups = [];
  const general = [];
  (items || []).forEach((item) => {
    if (item.subItems?.length) {
      const pages = item.subItems.filter((page) => page.path).map((page) => ({ name: page.name, path: page.path, icon: page.icon }));
      if (pages.length) groups.push({ name: item.name, icon: item.icon, pages });
    } else if (item.path) {
      general.push({ name: item.name, path: item.path, icon: item.icon });
    }
  });
  return general.length ? [{ name: "General", icon: null, pages: general }, ...groups] : groups;
}

/** Keeps the pages whose name matches, or every page of a module whose name matches. */
export function filterQuickNavGroups(groups, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return groups;
  const words = needle.split(/\s+/);
  const matches = (text) => words.every((word) => text.includes(word));
  return groups
    .map((group) => (matches(group.name.toLowerCase())
      ? group
      : { ...group, pages: group.pages.filter((page) => matches(`${group.name} ${page.name}`.toLowerCase())) }))
    .filter((group) => group.pages.length > 0);
}
