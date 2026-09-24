// Every SMS provider (Eskiz, Play Mobile, ...) implements this. Add a new provider as one file
// and register it in ./index.ts.
export interface SmsProvider {
  readonly name: string;
  /** phone: digits only, e.g. "998901234567" */
  send(phone: string, text: string): Promise<void>;
}

export class SmsError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "SmsError";
  }
}
