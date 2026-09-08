import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function encodeRaw(to: string, subject: string, html: string) {
  const msg = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
  ].join('\r\n');
  return btoa(unescape(encodeURIComponent(msg))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const schema = z.object({
  to: z.string().email(),
  fullName: z.string().min(1).max(200).optional(),
});

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAIL_API_KEY = process.env.GOOGLE_MAIL_API_KEY;
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      throw new Error("Email haijawekwa.");
    }

    const name = data.fullName ?? "Mwanafunzi";
    const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#ffffff;color:#111;">
  <div style="background:#0f172a;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="margin:0;font-size:22px;">Karibu MUMSO 🎓</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <p>Habari <strong>${name}</strong>,</p>
    <p>Akaunti yako ya MUMSO imeundwa kwa mafanikio. Sasa unaweza:</p>
    <ul>
      <li>Kutuma huduma za kitaaluma</li>
      <li>Kuripoti matatizo ya mikopo</li>
      <li>Kupata matangazo ya hivi karibuni</li>
    </ul>
    <p style="margin-top:24px;">Karibu sana — <em>Sauti ya Mwanafunzi, Suluhisho la Pamoja.</em></p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">MUMSO — Muslim University of Morogoro Students Organization</p>
  </div>
</div>`.trim();

    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodeRaw(data.to, "Karibu MUMSO — Akaunti Yako Imeundwa", html) }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gmail send failed [${res.status}]: ${t.slice(0, 200)}`);
    }
    return { ok: true };
  });
