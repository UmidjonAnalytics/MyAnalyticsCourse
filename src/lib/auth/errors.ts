import { uz } from "@/lib/i18n/uz";

// Maps Supabase Auth error codes to Uzbek messages.
export function authErrorMessage(code: string | undefined | null): string {
  switch (code) {
    case "otp_expired":
    case "invalid_credentials":
      return uz.errors.codeWrong;
    case "over_sms_send_rate_limit":
      return uz.errors.waitBeforeResend;
    case "over_request_rate_limit":
    case "rate_limited":
      return uz.errors.tooManyRequests;
    case "too_many_attempts":
      return uz.errors.tooManyAttempts;
    case "sms_send_failed":
    case "hook_timeout":
    case "hook_timeout_after_retry":
    case "hook_payload_invalid_content_type":
    case "hook_payload_over_size_limit":
      return uz.errors.smsFailed;
    case "phone_exists":
      return uz.errors.phoneTaken;
    case "identity_already_exists":
    case "email_exists":
      return uz.errors.identityTaken;
    case "single_identity_not_deletable":
      return uz.errors.lastMethod;
    case "manual_linking_disabled":
      return uz.errors.linkingDisabled;
    case "phone_provider_disabled":
    case "sms_provider_disabled":
      return uz.errors.phoneDisabled;
    case "validation_failed":
    case "invalid_phone":
      return uz.errors.invalidPhone;
    case "session_revoked":
      return uz.errors.sessionRevoked;
    case "not_logged_in":
      return uz.errors.notLoggedIn;
    case "oauth_failed":
      return uz.errors.oauthFailed;
    default:
      return uz.errors.generic;
  }
}
