export const formatSaleBillNo = value => {
  const raw = String(value ?? "").trim();
  return /^\d+$/.test(raw) ? `SB/${raw}` : raw;
};
