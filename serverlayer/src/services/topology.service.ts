import { Config } from "@/core/config";
import { Inject, Singleton } from "@/core/di";
import { Logger } from "@/core/logger";
import { type Collection, type Db, MongoClient } from "mongodb";
import { createClient, type RedisClientType } from "redis";

const REDIS_HOT_TTL = 86400; // 24 hours — Redis is just a hot-read layer
const TOPOLOGY_KEY_PREFIX = "topology:";

interface TopologyDocument {
  eventId: string;
  data: unknown;
  fetchedAt: Date;
  sizeBytes: number;
  source: string;
}

@Singleton()
export class TopologyService {
  private redis: RedisClientType | null = null;
  private connecting = false;
  private mongo: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private topologies: Collection<TopologyDocument> | null = null;
  private mongoConnecting = false;

  constructor(
    @Inject(Config) private config: Config,
    @Inject(Logger) private logger: Logger,
  ) {}

  /* ── Redis ───────────────────────────────────────────────── */

  private async getRedis(): Promise<RedisClientType | null> {
    if (this.redis?.isReady) return this.redis;
    if (this.connecting) return null;

    try {
      this.connecting = true;
      this.redis = createClient({ url: this.config.redisUrl });
      this.redis.on("error", (err) =>
        this.logger.error("Redis error", { error: err.message }),
      );
      await this.redis.connect();
      this.logger.info("Redis connected for topology cache");
      return this.redis;
    } catch (err) {
      this.logger.warn("Redis unavailable, will fetch without cache", {
        error: err instanceof Error ? err.message : String(err),
      });
      this.redis = null;
      return null;
    } finally {
      this.connecting = false;
    }
  }

  /* ── MongoDB ─────────────────────────────────────────────── */

  private async getMongo(): Promise<Collection<TopologyDocument> | null> {
    if (this.topologies) return this.topologies;
    if (this.mongoConnecting) return null;

    try {
      this.mongoConnecting = true;
      this.mongo = new MongoClient(this.config.mongoUrl);
      await this.mongo.connect();
      this.mongoDb = this.mongo.db(this.config.mongoDb);
      this.topologies = this.mongoDb.collection<TopologyDocument>("topologies");
      this.logger.info("MongoDB connected for topology reads");
      return this.topologies;
    } catch (err) {
      this.logger.warn("MongoDB unavailable for topology reads", {
        error: err instanceof Error ? err.message : String(err),
      });
      this.mongo = null;
      return null;
    } finally {
      this.mongoConnecting = false;
    }
  }

  /* ── Main method ─────────────────────────────────────────── */

  async getTopology(eventId: string): Promise<unknown> {
    const cacheKey = `${TOPOLOGY_KEY_PREFIX}${eventId}`;

    // 1. Try Redis (hot read layer, fastest)
    const redis = await this.getRedis();
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          this.logger.debug("Topology hit (Redis)", { eventId });
          return JSON.parse(cached);
        }
      } catch (err) {
        this.logger.warn("Redis get failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 2. Try MongoDB (persistent store — topology never changes)
    const collection = await this.getMongo();
    if (collection) {
      try {
        const doc = await collection.findOne({ eventId });
        if (doc) {
          this.logger.debug("Topology hit (MongoDB, persistent)", { eventId });

          // Promote to Redis for fast subsequent reads
          if (redis) {
            redis
              .set(cacheKey, JSON.stringify(doc.data), {
                EX: REDIS_HOT_TTL,
              })
              .catch(() => {});
          }

          return doc.data;
        }
      } catch (err) {
        this.logger.warn("MongoDB get failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 3. First demand — fetch from TM Maps API and persist permanently
    const url = `https://mapsapi.tmol.io/maps/geometry/3/event/${encodeURIComponent(eventId)}/placeDetailNoKeys?useHostGrids=true&app=PRD2663_EDP_NA&sectionLevel=true&systemId=HOST`;

    this.logger.info("First demand: fetching topology from TM", { eventId });

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TicketmasterProxy/1.0)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`TM Maps API returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    // Promote to Redis hot layer
    if (redis) {
      redis
        .set(cacheKey, JSON.stringify(data), { EX: REDIS_HOT_TTL })
        .catch((err) => {
          this.logger.warn("Redis set failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    // Persist permanently in MongoDB (fire-and-forget for response speed)
    if (collection) {
      const json = JSON.stringify(data);
      collection
        .updateOne(
          { eventId },
          {
            $set: {
              eventId,
              data,
              fetchedAt: new Date(),
              sizeBytes: Buffer.byteLength(json, "utf8"),
              source: "mapsapi.tmol.io",
            },
          },
          { upsert: true },
        )
        .catch((err) => {
          this.logger.warn("MongoDB upsert failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return data;
  }
}
