
// Convert the date string from the database (UTC) and convert it to a Date object in local time and then format into a string
export function formatDate(dateString: string) {
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