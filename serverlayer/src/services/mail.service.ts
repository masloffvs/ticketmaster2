import { Config } from "@/core/config";
import { Inject, Singleton } from "@/core/di";
import { Logger } from "@/core/logger";

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
  ) {}

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

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text();

      this.logger.error("Resend email send failed", {
        status: response.status,
        details,
        to: input.to,
        subject: input.subject,
      });

      throw new Error(
        `Resend API returned ${response.status}${details ? `: ${details}` : ""}`,
      );
    }

    const data = (await response.json()) as ResendEmailResponse;

    this.logger.info("Resend email sent", {
      id: data.id,
      to: input.to,
      subject: input.subject,
    });

    return data;
  }
}
