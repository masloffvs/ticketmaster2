import { Inject, Singleton } from "@/core/di";
import { Logger } from "@/core/logger";
import { DatabaseProvider } from "@/db";
import {
  partnerChallenges,
  partnerDomains,
  partners,
  partnerSessions,
} from "@/db/schema";
import { EventService } from "@/services/event.service";
import { TopologyService } from "@/services/topology.service";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const LOGIN_ALGORITHM = "ECDSA-P256-SHA256";
const CHALLENGE_PREFIX = "tm-partner-login-v1";

type Jwk = Record<string, string | undefined>;
type PartnerRow = typeof partners.$inferSelect;
type PartnerSessionRow = typeof partnerSessions.$inferSelect;
type PartnerDomainRow = typeof partnerDomains.$inferSelect;
type BinRequest =
  | { action: "challenge.request"; email: string }
  | {
      action: "challenge.login";
      email: string;
      challengeId: string;
      nonce: string;
      signature: string;
    }
  | { action: "session.me"; sessionToken: string }
  | { action: "domains.list"; sessionToken: string }
  | { action: "domains.add"; sessionToken: string; domain: string }
  | { action: "domains.remove"; sessionToken: string; domainId: string }
  | { action: "events.list"; sessionToken: string }
  | { action: "events.get"; sessionToken: string; eventId: string }
  | { action: "topology.get"; sessionToken: string; eventId: string };

export interface PartnerSummary {
  id: string;
  email: string;
  name: string | null;
  publicKeyFingerprint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
}

export interface PartnerKeyFile {
  kind: "tm-partner-keypair-v1";
  algorithm: typeof LOGIN_ALGORITHM;
  partnerId: string;
  email: string;
  issuedAt: string;
  publicKeyFingerprint: string;
  publicKeyJwk: Jwk;
  privateKeyJwk: Jwk;
}

export interface PartnerDomainRecord {
  id: string;
  partnerId: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
}

@Singleton()
export class PartnerService {
  constructor(
    @Inject(DatabaseProvider) private dbProvider: DatabaseProvider,
    @Inject(Logger) private logger: Logger,
    @Inject(EventService) private eventService: EventService,
    @Inject(TopologyService) private topologyService: TopologyService,
  ) {}

  private get db() {
    return this.dbProvider.db;
  }

  async listPartners(): Promise<PartnerSummary[]> {
    const rows = await this.db
      .select()
      .from(partners)
      .orderBy(desc(partners.createdAt));
    return rows.map((row) => this.toPartnerSummary(row));
  }

  async createPartner(input: {
    email: string;
    name?: string;
  }): Promise<{ partner: PartnerSummary; keyFile: PartnerKeyFile }> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const name = input.name?.trim() || null;

    const { publicKeyJwk, privateKeyJwk, publicKeyFingerprint } =
      await this.generateKeyMaterial();

    const [created] = await this.db
      .insert(partners)
      .values({
        email: normalizedEmail,
        name,
        publicKeyJwk: JSON.stringify(publicKeyJwk),
        publicKeyFingerprint,
      })
      .returning();

    this.logger.info("Created partner account", {
      partnerId: created.id,
      email: created.email,
    });

    return {
      partner: this.toPartnerSummary(created),
      keyFile: this.buildKeyFile(created, publicKeyJwk, privateKeyJwk),
    };
  }

  async rotateKeyPair(
    partnerId: string,
  ): Promise<{ partner: PartnerSummary; keyFile: PartnerKeyFile }> {
    const existing = await this.findPartnerById(partnerId);
    if (!existing) {
      throw new Error("Partner not found");
    }

    const { publicKeyJwk, privateKeyJwk, publicKeyFingerprint } =
      await this.generateKeyMaterial();

    const [updated] = await this.db
      .update(partners)
      .set({
        publicKeyJwk: JSON.stringify(publicKeyJwk),
        publicKeyFingerprint,
        updatedAt: new Date(),
      })
      .where(eq(partners.id, partnerId))
      .returning();

    await this.revokePartnerSessions(partnerId);

    return {
      partner: this.toPartnerSummary(updated),
      keyFile: this.buildKeyFile(updated, publicKeyJwk, privateKeyJwk),
    };
  }

  async setPartnerActive(
    partnerId: string,
    isActive: boolean,
  ): Promise<PartnerSummary> {
    const [updated] = await this.db
      .update(partners)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(partners.id, partnerId))
      .returning();

    if (!updated) {
      throw new Error("Partner not found");
    }

    if (!isActive) {
      await this.revokePartnerSessions(partnerId);
    }

    return this.toPartnerSummary(updated);
  }

  async handleBinRequest(payload: BinRequest): Promise<unknown> {
    switch (payload.action) {
      case "challenge.request":
        return this.createChallenge(payload.email);
      case "challenge.login":
        return this.exchangeChallengeForSession(payload);
      case "session.me": {
        const { partner, session } = await this.requireSession(payload.sessionToken);
        return {
          partner,
          session: {
            expiresAt: session.expiresAt.toISOString(),
            createdAt: session.createdAt.toISOString(),
            lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
          },
        };
      }
      case "domains.list": {
        const { partner } = await this.requireSession(payload.sessionToken);
        return this.listPartnerDomains(partner.id);
      }
      case "domains.add": {
        const { partner } = await this.requireSession(payload.sessionToken);
        return this.addPartnerDomain(partner.id, payload.domain);
      }
      case "domains.remove": {
        const { partner } = await this.requireSession(payload.sessionToken);
        await this.removePartnerDomain(partner.id, payload.domainId);
        return this.listPartnerDomains(partner.id);
      }
      case "events.list":
        await this.requireSession(payload.sessionToken);
        return this.eventService.findAll();
      case "events.get":
        await this.requireSession(payload.sessionToken);
        return this.eventService.findById(payload.eventId);
      case "topology.get":
        await this.requireSession(payload.sessionToken);
        return this.topologyService.getTopology(payload.eventId);
      default:
        throw new Error("Unsupported bin action");
    }
  }

  encodeBinaryFrame(payload: unknown): Uint8Array {
    const body = new TextEncoder().encode(JSON.stringify(payload));
    const frame = new Uint8Array(8 + body.length);
    frame[0] = 0x54;
    frame[1] = 0x4d;
    frame[2] = 0x42;
    frame[3] = 0x31;
    new DataView(frame.buffer).setUint32(4, body.length, true);
    frame.set(body, 8);
    return frame;
  }

  decodeBinaryFrame(input: ArrayBuffer): BinRequest {
    const frame = new Uint8Array(input);
    if (frame.byteLength < 8) {
      throw new Error("Invalid bin frame");
    }
    if (
      frame[0] !== 0x54 ||
      frame[1] !== 0x4d ||
      frame[2] !== 0x42 ||
      frame[3] !== 0x31
    ) {
      throw new Error("Unknown bin frame magic");
    }

    const size = new DataView(frame.buffer).getUint32(4, true);
    const body = frame.subarray(8);
    if (body.byteLength !== size) {
      throw new Error("Corrupted bin frame");
    }

    return JSON.parse(new TextDecoder().decode(body)) as BinRequest;
  }

  successFrame(data: unknown): Uint8Array {
    return this.encodeBinaryFrame({ ok: true, data });
  }

  errorFrame(error: unknown): Uint8Array {
    return this.encodeBinaryFrame({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  async listPartnerDomains(partnerId: string): Promise<PartnerDomainRecord[]> {
    const rows = await this.db
      .select()
      .from(partnerDomains)
      .where(eq(partnerDomains.partnerId, partnerId))
      .orderBy(partnerDomains.domain);
    return rows.map((row) => this.toPartnerDomainRecord(row));
  }

  async addPartnerDomain(
    partnerId: string,
    domainInput: string,
  ): Promise<PartnerDomainRecord[]> {
    const partner = await this.findPartnerById(partnerId);
    if (!partner || !partner.isActive) {
      throw new Error("Partner account inactive");
    }

    const normalizedDomain = this.normalizeDomain(domainInput);
    const [existing] = await this.db
      .select()
      .from(partnerDomains)
      .where(eq(partnerDomains.domain, normalizedDomain));

    if (existing?.partnerId === partnerId) {
      return this.listPartnerDomains(partnerId);
    }
    if (existing) {
      throw new Error("Domain is already assigned to another partner");
    }

    await this.db.insert(partnerDomains).values({
      partnerId,
      domain: normalizedDomain,
    });

    this.logger.info("Partner domain claimed", {
      partnerId,
      domain: normalizedDomain,
    });

    return this.listPartnerDomains(partnerId);
  }

  async removePartnerDomain(partnerId: string, domainId: string): Promise<void> {
    const [domain] = await this.db
      .select()
      .from(partnerDomains)
      .where(eq(partnerDomains.id, domainId));

    if (!domain || domain.partnerId !== partnerId) {
      throw new Error("Domain not found");
    }

    await this.db.delete(partnerDomains).where(eq(partnerDomains.id, domainId));
  }

  async resolvePartnerByEmailDomain(email: string): Promise<PartnerSummary | null> {
    const emailDomain = this.extractEmailDomain(email);
    if (!emailDomain) {
      return null;
    }

    const rows = await this.db.select().from(partnerDomains);
    const match = rows
      .map((row) => ({
        row,
        domain: row.domain.toLowerCase(),
      }))
      .filter(
        ({ domain }) =>
          emailDomain === domain || emailDomain.endsWith(`.${domain}`),
      )
      .sort((a, b) => b.domain.length - a.domain.length)[0];

    if (!match) {
      return null;
    }

    const partner = await this.findPartnerById(match.row.partnerId);
    if (!partner || !partner.isActive) {
      return null;
    }

    return this.toPartnerSummary(partner);
  }

  private async createChallenge(email: string) {
    const partner = await this.findPartnerByEmail(email);
    if (!partner || !partner.isActive) {
      throw new Error("Partner account not found or inactive");
    }

    const nonce = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    const [challenge] = await this.db
      .insert(partnerChallenges)
      .values({
        partnerId: partner.id,
        nonce,
        expiresAt,
      })
      .returning();

    return {
      challengeId: challenge.id,
      nonce,
      expiresAt: expiresAt.toISOString(),
      signaturePayload: this.buildSignaturePayload(partner.email, challenge.id, nonce),
      partner: this.toPartnerSummary(partner),
    };
  }

  private async exchangeChallengeForSession(input: {
    email: string;
    challengeId: string;
    nonce: string;
    signature: string;
  }) {
    const partner = await this.findPartnerByEmail(input.email);
    if (!partner || !partner.isActive) {
      throw new Error("Partner account not found or inactive");
    }

    const [challenge] = await this.db
      .select()
      .from(partnerChallenges)
      .where(eq(partnerChallenges.id, input.challengeId));

    if (!challenge || challenge.partnerId !== partner.id) {
      throw new Error("Challenge not found");
    }
    if (challenge.usedAt) {
      throw new Error("Challenge already used");
    }
    if (challenge.nonce !== input.nonce) {
      throw new Error("Challenge nonce mismatch");
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new Error("Challenge expired");
    }

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      JSON.parse(partner.publicKeyJwk) as Jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );

    const signatureOk = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      this.base64UrlToArrayBuffer(input.signature),
      new TextEncoder().encode(
        this.buildSignaturePayload(partner.email, challenge.id, challenge.nonce),
      ),
    );

    if (!signatureOk) {
      throw new Error("Signature verification failed");
    }

    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.db
      .update(partnerChallenges)
      .set({ usedAt: now })
      .where(eq(partnerChallenges.id, challenge.id));

    const [session] = await this.db
      .insert(partnerSessions)
      .values({
        partnerId: partner.id,
        tokenHash: this.sha256(token),
        expiresAt,
        lastSeenAt: now,
      })
      .returning();

    const [updatedPartner] = await this.db
      .update(partners)
      .set({
        lastLoginAt: now,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(partners.id, partner.id))
      .returning();

    this.logger.info("Partner session created", {
      partnerId: partner.id,
      sessionId: session.id,
      email: partner.email,
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      partner: this.toPartnerSummary(updatedPartner),
    };
  }

  private async requireSession(token: string): Promise<{
    partner: PartnerSummary;
    session: PartnerSessionRow;
  }> {
    const [session] = await this.db
      .select()
      .from(partnerSessions)
      .where(
        and(
          eq(partnerSessions.tokenHash, this.sha256(token)),
          isNull(partnerSessions.revokedAt),
          gt(partnerSessions.expiresAt, new Date()),
        ),
      );

    if (!session) {
      throw new Error("Partner session invalid or expired");
    }

    const partner = await this.findPartnerById(session.partnerId);
    if (!partner || !partner.isActive) {
      throw new Error("Partner account inactive");
    }

    const now = new Date();
    await this.db
      .update(partnerSessions)
      .set({ lastSeenAt: now })
      .where(eq(partnerSessions.id, session.id));
    await this.db
      .update(partners)
      .set({ lastSeenAt: now, updatedAt: now })
      .where(eq(partners.id, partner.id));

    return { partner: this.toPartnerSummary(partner), session };
  }

  private async revokePartnerSessions(partnerId: string): Promise<void> {
    await this.db
      .update(partnerSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(partnerSessions.partnerId, partnerId),
          isNull(partnerSessions.revokedAt),
        ),
      );
  }

  private async findPartnerByEmail(email: string): Promise<PartnerRow | null> {
    const [partner] = await this.db
      .select()
      .from(partners)
      .where(eq(partners.email, email.trim().toLowerCase()));
    return partner ?? null;
  }

  private async findPartnerById(id: string): Promise<PartnerRow | null> {
    const [partner] = await this.db
      .select()
      .from(partners)
      .where(eq(partners.id, id));
    return partner ?? null;
  }

  private async generateKeyMaterial(): Promise<{
    publicKeyJwk: Jwk;
    privateKeyJwk: Jwk;
    publicKeyFingerprint: string;
  }> {
    const keyPair = (await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    )) as CryptoKeyPair;

    const publicKeyJwk = (await crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey,
    )) as Jwk;
    const privateKeyJwk = (await crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey,
    )) as Jwk;

    return {
      publicKeyJwk,
      privateKeyJwk,
      publicKeyFingerprint: this.computeFingerprint(publicKeyJwk),
    };
  }

  private buildKeyFile(
    partner: PartnerRow,
    publicKeyJwk: Jwk,
    privateKeyJwk: Jwk,
  ): PartnerKeyFile {
    return {
      kind: "tm-partner-keypair-v1",
      algorithm: LOGIN_ALGORITHM,
      partnerId: partner.id,
      email: partner.email,
      issuedAt: new Date().toISOString(),
      publicKeyFingerprint: this.computeFingerprint(publicKeyJwk),
      publicKeyJwk,
      privateKeyJwk,
    };
  }

  private buildSignaturePayload(
    email: string,
    challengeId: string,
    nonce: string,
  ): string {
    return `${CHALLENGE_PREFIX}:${email}:${challengeId}:${nonce}`;
  }

  private computeFingerprint(publicKeyJwk: Jwk): string {
    return this.sha256(
      JSON.stringify({
        kty: publicKeyJwk.kty,
        crv: publicKeyJwk.crv,
        x: publicKeyJwk.x,
        y: publicKeyJwk.y,
      }),
    ).slice(0, 24);
  }

  private sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private base64UrlToArrayBuffer(value: string): ArrayBuffer {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Uint8Array.from(Buffer.from(padded, "base64")).buffer as ArrayBuffer;
  }

  private toPartnerSummary(row: PartnerRow): PartnerSummary {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      publicKeyFingerprint: row.publicKeyFingerprint,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    };
  }

  private toPartnerDomainRecord(row: PartnerDomainRow): PartnerDomainRecord {
    return {
      id: row.id,
      partnerId: row.partnerId,
      domain: row.domain,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private extractEmailDomain(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    const atIndex = normalized.lastIndexOf("@");
    if (atIndex < 0) {
      return null;
    }
    return this.normalizeDomain(normalized.slice(atIndex + 1));
  }

  private normalizeDomain(input: string): string {
    const trimmed = input.trim().toLowerCase().replace(/^@+/, "");
    const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//, "");
    const withoutPath = withoutProtocol.split("/")[0]?.split("?")[0] ?? "";
    const normalized = withoutPath.replace(/\.+$/g, "");
    if (!normalized || !normalized.includes(".")) {
      throw new Error("Enter a valid domain");
    }
    return normalized;
  }
}
