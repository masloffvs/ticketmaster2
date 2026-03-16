import { Inject, Singleton } from "@/core/di";
import { DatabaseProvider } from "@/db";
import { artists } from "@/db/schema";
import { eq } from "drizzle-orm";

@Singleton()
export class ArtistService {
  constructor(@Inject(DatabaseProvider) private dbProvider: DatabaseProvider) {}

  private get db() {
    return this.dbProvider.db;
  }

  async findAll() {
    return this.db.select().from(artists);
  }

  async findById(id: string) {
    const [artist] = await this.db
      .select()
      .from(artists)
      .where(eq(artists.id, id));
    return artist ?? null;
  }

  async create(data: typeof artists.$inferInsert) {
    const [created] = await this.db.insert(artists).values(data).returning();
    return created;
  }
}
