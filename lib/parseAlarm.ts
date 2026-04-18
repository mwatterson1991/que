import type { Alarm } from "./types";

// Lightweight local parser for utterances like:
//   "wake me up tomorrow at 7am"
//   "set an alarm for 6:30"
// In production, replace this with a server-side LLM call for robust NLU.
export function parseAlarmUtterance(text: string): Alarm | null {
  const lower = text.toLowerCase();

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!timeMatch) return null;

  let hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const meridiem = timeMatch[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  const now = new Date();
  const fire = new Date(now);
  fire.setHours(hour, minute, 0, 0);
  if (lower.includes("tomorrow") || fire.getTime() <= now.getTime()) {
    fire.setDate(fire.getDate() + 1);
  }

  return {
    id: `alarm_${Date.now()}`,
    label: text.trim(),
    nextFireAt: fire.toISOString(),
    repeatDays: [],
    mantraId: "",
    enabled: true,
  };
}
