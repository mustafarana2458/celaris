import { Resend } from "resend";
import type { InvitationRole } from "@/lib/types";

const FROM_ADDRESS = "Celaris <invites@celaris.cloud>";
const SUPPORT_EMAIL = "support@celaris.cloud";
const INVITE_EXPIRY_DAYS = 7;

let resendClient: Resend | null = null;

// Lazily constructed so a missing key doesn't crash module load / the
// build -- callers get a clear log line and a graceful { error } instead.
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set -- skipping email send.");
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inviteEmailHtml({
  workspaceName,
  inviterName,
  roleLabel,
  inviteUrl,
}: {
  workspaceName: string;
  inviterName: string;
  roleLabel: string;
  inviteUrl: string;
}) {
  const safeWorkspace = escapeHtml(workspaceName);
  const safeInviter = escapeHtml(inviterName);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:32px 32px 24px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.02em;color:#6366f1;text-transform:uppercase;">Celaris</p>
                <h1 style="margin:0;font-size:20px;font-weight:600;color:#0f172a;">You&#39;re invited to join ${safeWorkspace}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;">
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                  ${safeInviter} invited you to join <strong>${safeWorkspace}</strong> on Celaris as a <strong>${roleLabel}</strong>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#6366f1;">
                      <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Accept invite</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  This invite expires in ${INVITE_EXPIRY_DAYS} days. If the button doesn&#39;t work, copy and paste this link into your browser:<br />
                  <a href="${inviteUrl}" style="color:#6366f1;word-break:break-all;">${inviteUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">If you weren&#39;t expecting this invite, you can safely ignore this email.</p>
                <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">For further queries you can contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#6366f1;">${SUPPORT_EMAIL}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type SendInviteEmailParams = {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: InvitationRole;
  token: string;
};

export type SendEmailResult = { error?: string };

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<SendEmailResult> {
  const client = getResendClient();
  if (!client) {
    return { error: "Email service is not configured." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[email] NEXT_PUBLIC_APP_URL is not set -- cannot build invite link.");
    return { error: "App URL is not configured." };
  }

  const inviteUrl = `${appUrl}/invite/${params.token}`;
  const roleLabel = params.role === "admin" ? "Admin" : "Member";

  try {
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: SUPPORT_EMAIL,
      subject: `You're invited to join ${params.workspaceName} on Celaris`,
      html: inviteEmailHtml({
        workspaceName: params.workspaceName,
        inviterName: params.inviterName,
        roleLabel,
        inviteUrl,
      }),
    });

    if (error) {
      console.error("[email] Resend returned an error sending invite email:", error);
      return { error: error.message || "Failed to send invite email." };
    }

    return {};
  } catch (err) {
    console.error("[email] Unexpected error sending invite email:", err);
    return { error: "Failed to send invite email." };
  }
}
