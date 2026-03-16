import { Inject, Singleton } from "@/core/di";
import { DatabaseProvider } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

@Singleton()
export class EventService {
  constructor(@Inject(DatabaseProvider) private dbProvider: DatabaseProvider) {}

  private get db() {
    return this.dbProvider.db;
  }

  async findAll() {
    return this.db.select().from(events);
  }

  async findById(id: string) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, id));
    return event ?? null;
  }

  async create(data: typeof events.$inferInsert) {
    const [created] = await this.db.insert(events).values(data).returning();
    return created;
  }
}
