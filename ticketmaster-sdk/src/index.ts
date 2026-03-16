import { HttpClient } from "./client";
import { AttractionsModule } from "./modules/attractions";
import { ClassificationsModule } from "./modules/classifications";
import { EventsModule } from "./modules/events";
import { SuggestModule } from "./modules/suggest";
import { VenuesModule } from "./modules/venues";
import type { TicketmasterConfig } from "./types";

export class Ticketmaster {
  public readonly events: EventsModule;
  public readonly attractions: AttractionsModule;
  public readonly venues: VenuesModule;
  public readonly classifications: ClassificationsModule;
  public readonly suggest: SuggestModule;

  constructor(config: TicketmasterConfig) {
    const http = new HttpClient(config);
    this.events = new EventsModule(http);
    this.attractions = new AttractionsModule(http);
    this.venues = new VenuesModule(http);
    this.classifications = new ClassificationsModule(http);
    this.suggest = new SuggestModule(http);
  }
}
