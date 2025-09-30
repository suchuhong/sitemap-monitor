export function coerceDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 1e12 ? value : value * 1000;
    return new Date(millis);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      const millis = asNumber > 1e12 ? asNumber : asNumber * 1000;
      return new Date(millis);
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }

  return null;
}

const padTwo = (value: number) => value.toString().padStart(2, "0");

type FormatOptions = {
  includeSeconds?: boolean;
};

export function formatDate(value: unknown): string {
  const date = coerceDate(value);
  if (!date) return "—";
  const year = date.getFullYear();
  const month = padTwo(date.getMonth() + 1);
  const day = padTwo(date.getDate());
  return `${year}-${month}-${day}`;
}

export function formatTime(value: unknown, options?: FormatOptions): string {
  const date = coerceDate(value);
  if (!date) return "—";
  const includeSeconds = options?.includeSeconds ?? false;
  const hours = padTwo(date.getHours());
  const minutes = padTwo(date.getMinutes());
  const seconds = padTwo(date.getSeconds());
  return includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
}

export function formatDateTime(value: unknown, options?: FormatOptions): string {
  const date = coerceDate(value);
  if (!date) return "—";
  const includeSeconds = options?.includeSeconds ?? false;
  const datePart = formatDate(date);
  const timePart = formatTime(date, { includeSeconds });
  return `${datePart} ${timePart}`;
}
