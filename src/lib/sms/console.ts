import "server-only";
import type { SmsProvider } from "./types";

// Testing only: prints the SMS in the server log instead of sending it.
export const consoleProvider: SmsProvider = {
  name: "console",
  async send(phone, text) {
    console.warn(`[SMS console provider] to +${phone}: ${text}`);
  },
};
