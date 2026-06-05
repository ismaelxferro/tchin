export function formatDateUS(date?: string) {
  if (!date) return "No due date";

  const parsedDate = new Date(date);

  return parsedDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatDateTimeUS(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fileUrl(path?: string) {
  if (!path) return "";

  return `${import.meta.env.VITE_API_URL}/${path.replaceAll("\\", "/")}`;
}

export function isLateSubmission(dueDate?: string, submittedAt?: string) {
  if (!dueDate || !submittedAt) return false;

  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);

  const submitted = new Date(submittedAt);

  return submitted > due;
}

export function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

export function submittedPdfUrl(submissionId?: string) {
  if (!submissionId) return "";
  return `${apiBaseUrl}/submissions/file/${submissionId}/submitted`;
}

export function correctedPdfUrl(submissionId?: string) {
  if (!submissionId) return "";
  return `${apiBaseUrl}/submissions/file/${submissionId}/corrected`;
}