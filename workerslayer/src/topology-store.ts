import { type Collection, type Db, MongoClient } from "mongodb";
import type { Logger } from "pino";

export interface TopologyDocument {
  eventId: string;
  data: unknown;
  fetchedAt: Date;
  sizeBytes: number;
  source: string;
}

export class TopologyStore {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<TopologyDocument> | null = null;

  constructor(
    private readonly mongoUrl: string,
    private readonly dbName: string,
    private readonly logger: Logger,
  ) {}

  async connect(): Promise<void> {
    this.client = new MongoClient(this.mongoUrl);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.collection = this.db.collection<TopologyDocument>("topologies");

    // Unique index on eventId for upserts
    await this.collection.createIndex({ eventId: 1 }, { unique: true });

    this.logger.info("MongoDB connected, collection: topologies (persistent)");
  }

  async upsert(eventId: string, data: unknown): Promise<TopologyDocument> {
    if (!this.collection) throw new Error("TopologyStore not connected");

    const json = JSON.stringify(data);
    const doc: TopologyDocument = {
      eventId,
      data,
      fetchedAt: new Date(),
      sizeBytes: Buffer.byteLength(json, "utf8"),
      source: "mapsapi.tmol.io",
    };

    await this.collection.updateOne(
      { eventId },
      { $set: doc },
      { upsert: true },
    );

    this.logger.info(
      { eventId, sizeBytes: doc.sizeBytes },
      "Topology upserted into MongoDB",
    );
    return doc;
  }

  async get(eventId: string): Promise<TopologyDocument | null> {
    if (!this.collection) throw new Error("TopologyStore not connected");
    return this.collection.findOne({ eventId });
  }

  async list(limit = 50): Promise<TopologyDocument[]> {
    if (!this.collection) throw new Error("TopologyStore not connected");
    return this.collection
      .find({}, { projection: { data: 0 } })
      .sort({ fetchedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async stats(): Promise<{ count: number; totalBytes: number }> {
    if (!this.collection) throw new Error("TopologyStore not connected");

    const pipeline = [
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalBytes: { $sum: "$sizeBytes" },
        },
      },
    ];
    const result = await this.collection.aggregate(pipeline).toArray();
    if (result.length === 0) return { count: 0, totalBytes: 0 };
    return { count: result[0]!.count, totalBytes: result[0]!.totalBytes };
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}
