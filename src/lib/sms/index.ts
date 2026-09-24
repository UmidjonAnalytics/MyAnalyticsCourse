import "server-only";
import { serverEnv } from "@/lib/env";
import { consoleProvider } from "./console";
import { createEskizProvider } from "./eskiz";
import { SmsError, type SmsProvider } from "./types";

// Picks the SMS provider from SMS_PROVIDER. To add a provider: create a file like eskiz.ts
// and add a case here.
export function getSmsProvider(): SmsProvider {
  const env = serverEnv();
  switch (env.SMS_PROVIDER) {
    case "console":
      return consoleProvider;
    case "eskiz":
      if (!env.ESKIZ_EMAIL || !env.ESKIZ_PASSWORD) throw new SmsError("ESKIZ_EMAIL / ESKIZ_PASSWORD are not set");
      return createEskizProvider({
        apiUrl: env.ESKIZ_API_URL,
        email: env.ESKIZ_EMAIL,
        password: env.ESKIZ_PASSWORD,
        from: env.ESKIZ_FROM,
      });
  }
}

export { SmsError };
