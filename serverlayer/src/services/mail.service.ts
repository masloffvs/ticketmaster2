import { Config } from "@/core/config";
import { Inject, Singleton } from "@/core/di";
import { Logger } from "@/core/logger";
import { DatabaseProvider } from "@/db";
import { emailDeliveries } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

interface MailOverrides {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string[];
}

interface SendEmailInput {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

interface ResendEmailResponse {
  id: string;
}

@Singleton()
export class MailService {
  private readonly endpoint = "https://api.resend.com/emails";

  constructor(
    @Inject(Config) private config: Config,
    @Inject(Logger) private logger: Logger,
    @Inject(DatabaseProvider) private dbProvider: DatabaseProvider,
  ) {}

  private get db() {
    return this.dbProvider.db;
  }

  getConfigStatus() {
    const { fromEmail, fromName, provider, replyTo, testTo } = this.config.mail;

    return {
      provider,
      enabled: Boolean(this.config.mail.apiKey && fromEmail),
      apiKeyConfigured: Boolean(this.config.mail.apiKey),
      fromEmail,
      fromName,
      replyTo,
      testTo,
    };
  }

  async getMetrics(limit = 40) {
    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(limit, 200))
      : 40;

    const [summary] = await this.db
      .select({
        total: sql<number>`count(*)`,
        accepted: sql<number>`count(*) filter (where ${emailDeliveries.status} = 'accepted')`,
        failed: sql<number>`count(*) filter (where ${emailDeliveries.status} = 'failed')`,
        lastSentAt: sql<string | null>`max(${emailDeliveries.createdAt})`,
      })
      .from(emailDeliveries);

    const items = await this.db
      .select({
        id: emailDeliveries.id,
        provider: emailDeliveries.provider,
        messageId: emailDeliveries.messageId,
        toEmails: emailDeliveries.toEmails,
        subject: emailDeliveries.subject,
        status: emailDeliveries.status,
        responseStatus: emailDeliveries.responseStatus,
        responseBody: emailDeliveries.responseBody,
        error: emailDeliveries.error,
        createdAt: emailDeliveries.createdAt,
      })
      .from(emailDeliveries)
      .orderBy(desc(emailDeliveries.createdAt))
      .limit(safeLimit);

    return {
      summary: {
        total: Number(summary?.total ?? 0),
        accepted: Number(summary?.accepted ?? 0),
        failed: Number(summary?.failed ?? 0),
        lastSentAt: summary?.lastSentAt ?? null,
      },
      items,
    };
  }

  async sendTestEmail(
    input: SendEmailInput,
    overrides?: MailOverrides,
  ): Promise<ResendEmailResponse> {
    return this.sendEmail(input, overrides);
  }

  async sendEmail(
    input: SendEmailInput,
    overrides?: MailOverrides,
  ): Promise<ResendEmailResponse> {
    const apiKey = overrides?.apiKey?.trim() || this.config.mail.apiKey;
    const fromEmail =
      overrides?.fromEmail?.trim() || this.config.mail.fromEmail.trim();
    const fromName =
      overrides?.fromName?.trim() || this.config.mail.fromName.trim();
    const replyTo =
      overrides?.replyTo?.filter(Boolean) ?? this.config.mail.replyTo;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    if (!fromEmail) {
      throw new Error("RESEND_FROM_EMAIL is not configured");
    }

    if (input.to.length === 0) {
      throw new Error("Recipient list is empty");
    }

    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const payload = {
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: replyTo.length > 0 ? replyTo : undefined,
    };

    let responseStatus: number | null = null;
    let responseBody: string | null = null;

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      responseStatus = response.status;
      responseBody = await response.text();

      if (!response.ok) {
        await this.recordDelivery({
          messageId: null,
          toEmails: input.to,
          subject: input.subject,
          status: "failed",
          responseStatus,
          requestPayload: JSON.stringify(payload),
          responseBody,
          error: `Resend API returned ${response.status}`,
        });

        this.logger.error("Resend email send failed", {
          status: response.status,
          details: responseBody,
          to: input.to,
          subject: input.subject,
        });

        throw new Error(
          `Resend API returned ${response.status}${responseBody ? `: ${responseBody}` : ""}`,
        );
      }

      const data = JSON.parse(responseBody) as ResendEmailResponse;

      await this.recordDelivery({
        messageId: data.id,
        toEmails: input.to,
        subject: input.subject,
        status: "accepted",
        responseStatus,
        requestPayload: JSON.stringify(payload),
        responseBody,
        error: null,
      });

      this.logger.info("Resend email sent", {
        id: data.id,
        to: input.to,
        subject: input.subject,
      });

      return data;
    } catch (error) {
      if (responseStatus === null) {
        await this.recordDelivery({
          messageId: null,
          toEmails: input.to,
          subject: input.subject,
          status: "failed",
          responseStatus: null,
          requestPayload: JSON.stringify(payload),
          responseBody,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      throw error;
    }
  }

  private async recordDelivery(input: {
    messageId: string | null;
    toEmails: string[];
    subject: string;
    status: string;
    responseStatus: number | null;
    requestPayload: string;
    responseBody: string | null;
    error: string | null;
  }) {
    await this.db.insert(emailDeliveries).values({
      provider: this.config.mail.provider,
      messageId: input.messageId,
      toEmails: input.toEmails,
      subject: input.subject,
      status: input.status,
      responseStatus: input.responseStatus,
      requestPayload: input.requestPayload,
      responseBody: input.responseBody,
      error: input.error,
      updatedAt: new Date(),
    });
  }
}
