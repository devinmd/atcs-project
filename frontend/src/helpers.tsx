export function formatDate(dateString: string) {
  // get string from database (UTC) and convert to Date object with conversion to local time
  const isoString = dateString.replace(" ", "T") + "Z";
  const date = new Date(isoString);
  const now = new Date();

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return time;
  }

  const datePart = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return `${datePart}, ${time}`;
}