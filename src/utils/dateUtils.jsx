export function getDefaultFilters() {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = now.toISOString().slice(0, 10);

  return { start: startStr, end: endStr };
}

