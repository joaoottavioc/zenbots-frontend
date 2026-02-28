export function getMinutesFromDate(dateString: string) {
  if (!dateString) return 0;
  const utcString = dateString.endsWith("Z") ? dateString : `${dateString}Z`;
  const start = new Date(utcString).getTime();
  const now = new Date().getTime();
  return Math.floor((now - start) / 60000);
}

export function calculateTimeElapsed(dateString: string) {
  const diff = getMinutesFromDate(dateString);
  if (diff < 0) return "0m";
  if (diff < 60) return `${diff}m`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
}
