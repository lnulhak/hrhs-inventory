export function daysUntilExpiry(dateStr, today = new Date()) {
  const expiry = new Date(dateStr);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

export function urgencyClass(days) {
  if (days < 0) return "expired";
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  return "ok";
}

export function urgencyLabel(days) {
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `${days} days left`;
}
