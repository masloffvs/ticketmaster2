import { type Collection, type Db, MongoClient } from "mongodb";
import type { Logger } from "pino";

export type IsmdsEndpoint = "facets" | "quickpicks";

export interface IsmdsDocument {
  eventId: string;
  endpoint: IsmdsEndpoint;
  data: unknown;
  fetchedAt: Date;
  sizeBytes: number;
  source: string;
}

export class IsmdsStore {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<IsmdsDocument> | null = null;

  constructor(
    private readonly mongoUrl: string,
    private readonly dbName: string,
    private readonly logger: Logger,
  ) {}

  async connect(): Promise<void> {
    this.client = new MongoClient(this.mongoUrl);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.collection = this.db.collection<IsmdsDocument>("ismds");

    // Compound unique index: one doc per (eventId, endpoint)
    await this.collection.createIndex(
      { eventId: 1, endpoint: 1 },
      { unique: true },
    );

    this.logger.info("MongoDB connected, collection: ismds (persistent)");
  }

  async upsert(
    eventId: string,
    endpoint: IsmdsEndpoint,
    data: unknown,
  ): Promise<IsmdsDocument> {
    if (!this.collection) throw new Error("IsmdsStore not connected");

    const json = JSON.stringify(data);
    const doc: IsmdsDocument = {
      eventId,
      endpoint,
      data,
      fetchedAt: new Date(),
      sizeBytes: Buffer.byteLength(json, "utf8"),
      source: "services.ticketmaster.com",
    };

    await this.collection.updateOne(
      { eventId, endpoint },
      { $set: doc },
      { upsert: true },
    );

    this.logger.info(
      { eventId, endpoint, sizeBytes: doc.sizeBytes },
      "ISMDS upserted into MongoDB",
    );
    return doc;
  }

  async get(
    eventId: string,
    endpoint: IsmdsEndpoint,
  ): Promise<IsmdsDocument | null> {
    if (!this.collection) throw new Error("IsmdsStore not connected");
    return this.collection.findOne({ eventId, endpoint });
  }

  async getEvent(eventId: string): Promise<IsmdsDocument[]> {
    if (!this.collection) throw new Error("IsmdsStore not connected");
    return this.collection.find({ eventId }).toArray();
  }

  async list(limit = 50): Promise<IsmdsDocument[]> {
    if (!this.collection) throw new Error("IsmdsStore not connected");
    return this.collection
      .find({}, { projection: { data: 0 } })
      .sort({ fetchedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async stats(): Promise<{ count: number; totalBytes: number }> {
    if (!this.collection) throw new Error("IsmdsStore not connected");

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
