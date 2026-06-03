import type { ReactNode } from "react";

// Convert the date string from the database (UTC) and convert it to a Date object in local time and then format into a string
export function formatDate(dateString: string) {
  console.log(dateString);
  const isoString = dateString.replace(" ", "T") + "Z";
  const date = new Date(isoString);
  const now = new Date();

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // if today just return time
  const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

  if (isToday) {
    return time;
  }

  const datePart = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return `${datePart}, ${time}`;
}

// convert an iso date to string displaying relative time to now
export function formatDateRelative(dateString: string) {
  const s = dateString.trim();
  let isoString = s;

  if (!isoString.includes("T") && isoString.includes(" ")) {
    isoString = isoString.replace(" ", "T");
  }

  const hasTZ = /[zZ]$|[+\-]\d{2}:?\d{2}$/.test(isoString);
  if (!hasTZ) isoString = isoString + "Z";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const dateMid = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diff = Math.round((dateMid.getTime() - nowMid.getTime()) / msPerDay);

  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";

  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

export function renderMarkdownBold(text: string): ReactNode {
  return text.split(/(\*\*(?:[\s\S]*?)\*\*)/g).map((segment, index) => {
    const match = segment.match(/^\*\*([\s\S]*?)\*\*$/);
    return match ? <strong key={index}>{match[1]}</strong> : segment;
  });
}
