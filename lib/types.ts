import type { Database } from "./database.types";

export type Alarm = {
  id: string;
  label: string;
  // ISO 8601 string of the next fire time
  nextFireAt: string;
  // 0-6 (Sun-Sat); empty array = one-shot
  repeatDays: number[];
  mantraId: string;
  enabled: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

export type Session = Database["public"]["Tables"]["sessions"]["Row"];
