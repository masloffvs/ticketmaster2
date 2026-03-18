import { container } from "@/core/di";
import { MailService } from "@/services/mail.service";
import Elysia, { t } from "elysia";

export const mailRoutes = new Elysia({ prefix: "/mail" })
  .get("/config", () => {
    const service = container.resolve(MailService);
    return service.getConfigStatus();
  })
  .post(
    "/test",
    async ({ body, set }) => {
      try {
        const service = container.resolve(MailService);
        const result = await service.sendTestEmail(
          {
            to: body.to
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean),
            subject: body.subject.trim(),
            html: body.html,
            text: body.text?.trim() || undefined,
          },
          {
            apiKey: body.apiKey?.trim() || undefined,
            fromEmail: body.fromEmail?.trim() || undefined,
            fromName: body.fromName?.trim() || undefined,
            replyTo: body.replyTo
              ? body.replyTo
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter(Boolean)
              : undefined,
          },
        );

        return {
          ok: true,
          provider: "resend",
          id: result.id,
        };
      } catch (error) {
        set.status = 400;
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      body: t.Object({
        to: t.String({ minLength: 1 }),
        subject: t.String({ minLength: 1 }),
        html: t.String({ minLength: 1 }),
        text: t.Optional(t.String()),
        apiKey: t.Optional(t.String()),
        fromEmail: t.Optional(t.String()),
        fromName: t.Optional(t.String()),
        replyTo: t.Optional(t.String()),
      }),
    },
  );
