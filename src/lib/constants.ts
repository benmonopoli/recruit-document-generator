import type { ToneSettings } from "@/types";

/**
 * Default tone settings used across the application
 * for job descriptions and other generated content.
 */
export const DEFAULT_TONE_SETTINGS: ToneSettings = {
  formal_casual: 0.4,
  serious_playful: 0.3,
  concise_detailed: 0.5,
  traditional_unconventional: 0.4,
  preset: "company-standard",
};

/**
 * Default tone values for database storage (0-100 scale)
 */
export const DEFAULT_TONE_DB_VALUES = {
  formal_casual: 50,
  serious_playful: 30,
  concise_detailed: 50,
  traditional_unconventional: 30,
};
