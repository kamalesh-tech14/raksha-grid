import { Injectable, Logger } from "@nestjs/common";

export interface GuardianSosAlertInput {
  guardianEmail: string;
  guardianName?: string | null;
  reporterName?: string | null;
  emergencyType: string;
  priority: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: Date;
}

/**
 * Best-effort transactional email via Resend's REST API — a plain fetch
 * call rather than pulling in the SDK, since this is the one thing this
 * service needs to do. Every caller MUST treat failures here as
 * non-fatal: SOS creation must never depend on an email succeeding (see
 * sos.service.ts, where this is deliberately not awaited on the
 * request's critical path).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly fromAddress = process.env.RESEND_FROM_ADDRESS ?? "Raksha Grid <onboarding@resend.dev>";

  async sendGuardianSosAlert(input: GuardianSosAlertInput): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn("RESEND_API_KEY not set — skipping guardian SOS email");
      return;
    }

    const mapsLink =
      input.latitude != null && input.longitude != null
        ? `https://maps.google.com/?q=${input.latitude},${input.longitude}`
        : null;

    const time = input.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

    const html = renderGuardianAlertHtml({ ...input, mapsLink, time });

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: input.guardianEmail,
          subject: `🚨 Emergency SOS — ${formatEmergencyType(input.emergencyType)} (${input.priority})`,
          html,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        this.logger.error(`Resend API returned ${res.status}: ${body}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send guardian SOS email: ${err instanceof Error ? err.message : err}`);
    }
  }
}

function formatEmergencyType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderGuardianAlertHtml(input: {
  guardianName?: string | null;
  reporterName?: string | null;
  emergencyType: string;
  priority: string;
  mapsLink: string | null;
  time: string;
}): string {
  const greeting = input.guardianName ? `Hi ${escapeHtml(input.guardianName)},` : "Hi,";
  const reporter = input.reporterName ? escapeHtml(input.reporterName) : "Someone who listed you as their emergency contact";
  const priorityColor: Record<string, string> = { P1: "#FF4D5E", P2: "#F2A93C", P3: "#4C7CFF", P4: "#8CA0C2" };
  const color = priorityColor[input.priority] ?? "#4C7CFF";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0A0F1C;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F1C;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#111A2B;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
            <tr>
              <td style="background:${color};padding:20px 28px;">
                <span style="color:#fff;font-size:20px;font-weight:700;">🚨 Emergency SOS Alert</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#F2F5FA;">
                <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${greeting}</p>
                <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
                  ${reporter} has just sent an emergency SOS report through Raksha Grid and listed you as their guardian contact.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17223A;border-radius:12px;margin-bottom:20px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 8px;font-size:13px;color:#8CA0C2;text-transform:uppercase;letter-spacing:0.04em;">Emergency Type</p>
                      <p style="margin:0 0 16px;font-size:17px;font-weight:600;">${escapeHtml(formatEmergencyType(input.emergencyType))}</p>
                      <p style="margin:0 0 8px;font-size:13px;color:#8CA0C2;text-transform:uppercase;letter-spacing:0.04em;">Priority</p>
                      <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:${color};">${escapeHtml(input.priority)}</p>
                      <p style="margin:0 0 8px;font-size:13px;color:#8CA0C2;text-transform:uppercase;letter-spacing:0.04em;">Time</p>
                      <p style="margin:0;font-size:17px;font-weight:600;">${escapeHtml(input.time)}</p>
                    </td>
                  </tr>
                </table>
                ${
                  input.mapsLink
                    ? `<a href="${input.mapsLink}" style="display:inline-block;background:#3AD1F2;color:#0A0F1C;font-weight:700;font-size:15px;padding:12px 24px;border-radius:999px;text-decoration:none;">📍 View Location on Google Maps</a>`
                    : `<p style="font-size:14px;color:#8CA0C2;margin:0;">Location was not available for this report.</p>`
                }
                <p style="font-size:13px;color:#4B5A76;margin:24px 0 0;line-height:1.6;">
                  This is an automated alert from Raksha Grid, a disaster intelligence and emergency response platform. Please try to reach out to them directly.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
