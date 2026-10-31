const normalizeText = (value) => String(value ?? "").trim();

const getPrimarySizeValue = (size = {}) =>
  normalizeText(size.measurement) ||
  normalizeText(size.size_name) ||
  normalizeText(size.code);

const getDuplicateAwareLabel = (size = {}, duplicateCount = 1, fallbackIndex = 0) => {
  const primary = getPrimarySizeValue(size) || `Size ${fallbackIndex + 1}`;
  if (duplicateCount <= 1) return primary;

  const suffixCandidates = [
    normalizeText(size.size_name),
    normalizeText(size.code),
    normalizeText(size.age_set),
    size.id != null ? `ID ${size.id}` : "",
  ].filter(Boolean);

  const suffix = suffixCandidates.find((value) => value !== primary) || `Option ${fallbackIndex + 1}`;
  return `${primary} (${suffix})`;
};

export const buildSizeSelectOptions = ({
  sizes = [],
  sizeGroups = [],
  includeJump = false,
  includeCut = false,
} = {}) => {
  const counts = new Map();
  sizes.forEach((size) => {
    const primary = getPrimarySizeValue(size) || "";
    counts.set(primary, (counts.get(primary) || 0) + 1);
  });

  const options = [];

  if (includeCut) {
    options.push({
      key: "special:cut",
      value: "Cut",
      label: "Cut",
      group: "Special",
      searchText: "cut",
    });
  }

  sizes.forEach((size, index) => {
    const primary = getPrimarySizeValue(size) || `Size ${index + 1}`;
    const label = getDuplicateAwareLabel(size, counts.get(primary) || 1, index);
    options.push({
      key: `size:${size.id ?? index}`,
      value: primary,
      label,
      group: "Sizes",
      searchText: [
        primary,
        normalizeText(size.size_name),
        normalizeText(size.measurement),
        normalizeText(size.code),
        normalizeText(size.age_set),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    });
  });

  sizeGroups.forEach((group, index) => {
    const label = normalizeText(group.group_name) || `Group ${index + 1}`;
    options.push({
      key: `size-group:${group.id ?? label ?? index}`,
      value: label,
      label,
      group: "Size Groups",
      searchText: label.toLowerCase(),
    });
  });

  if (includeJump) {
    options.push({
      key: "special:jump",
      value: "__jump__",
      label: "Jump...",
      group: "Special",
      searchText: "jump",
    });
  }

  return options;
};
