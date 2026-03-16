// ── Shared / Common ──────────────────────────────────────────────

export interface TicketmasterConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface PageParams {
  size?: number;
  page?: number;
  sort?: string;
}

export interface PageInfo {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface Link {
  href: string;
  templated?: boolean;
}

export interface Links {
  self: Link;
  next?: Link;
  prev?: Link;
  first?: Link;
  last?: Link;
}

export interface Image {
  url: string;
  ratio: "16_9" | "3_2" | "4_3" | "1_1" | string;
  width: number;
  height: number;
  fallback: boolean;
  attribution?: string;
}

export interface Genre {
  id: string;
  name: string;
}

export interface SubGenre {
  id: string;
  name: string;
}

export interface Segment {
  id: string;
  name: string;
}

export interface Classification {
  primary: boolean;
  segment: Segment;
  genre: Genre;
  subGenre: SubGenre;
  type?: { id: string; name: string };
  subType?: { id: string; name: string };
  family: boolean;
}

export interface ExternalLinks {
  youtube?: { url: string }[];
  twitter?: { url: string }[];
  itunes?: { url: string }[];
  lastfm?: { url: string }[];
  facebook?: { url: string }[];
  wiki?: { url: string }[];
  spotify?: { url: string }[];
  instagram?: { url: string }[];
  musicbrainz?: { id: string }[];
  homepage?: { url: string }[];
}

// ── Location / Venue ────────────────────────────────────────────

export interface Location {
  longitude: string;
  latitude: string;
}

export interface Address {
  line1: string;
  line2?: string;
  line3?: string;
}

export interface City {
  name: string;
}

export interface State {
  name: string;
  stateCode: string;
}

export interface Country {
  name: string;
  countryCode: string;
}

export interface Market {
  id: string;
  name: string;
}

export interface DMA {
  id: number;
}

export interface BoxOfficeInfo {
  phoneNumberDetail?: string;
  openHoursDetail?: string;
  acceptedPaymentDetail?: string;
  willCallDetail?: string;
}

export interface GeneralInfo {
  generalRule?: string;
  childRule?: string;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  url?: string;
  locale?: string;
  postalCode?: string;
  timezone?: string;
  city: City;
  state?: State;
  country: Country;
  address?: Address;
  location?: Location;
  markets?: Market[];
  dmas?: DMA[];
  boxOfficeInfo?: BoxOfficeInfo;
  generalInfo?: GeneralInfo;
  images?: Image[];
  upcomingEvents?: Record<string, number>;
  _links?: Links;
}

export interface VenueSearchParams extends PageParams {
  keyword?: string;
  id?: string;
  locale?: string;
  source?: "ticketmaster" | "universe" | "frontgate" | "tmr";
  countryCode?: string;
  stateCode?: string;
  geoPoint?: string;
  radius?: string;
  unit?: "miles" | "km";
}

export interface VenueSearchResponse {
  _embedded?: { venues: Venue[] };
  _links: Links;
  page: PageInfo;
}

// ── Attraction ──────────────────────────────────────────────────

export interface Attraction {
  id: string;
  name: string;
  type: string;
  url?: string;
  locale?: string;
  images?: Image[];
  classifications?: Classification[];
  externalLinks?: ExternalLinks;
  upcomingEvents?: Record<string, number>;
  aliases?: string[];
  _links?: Links;
}

export interface AttractionSearchParams extends PageParams {
  keyword?: string;
  id?: string;
  locale?: string;
  source?: "ticketmaster" | "universe" | "frontgate" | "tmr";
  classificationName?: string;
  classificationId?: string;
}

export interface AttractionSearchResponse {
  _embedded?: { attractions: Attraction[] };
  _links: Links;
  page: PageInfo;
}

// ── Event ───────────────────────────────────────────────────────

export interface DateStart {
  localDate: string;
  localTime?: string;
  dateTime?: string;
  dateTBD: boolean;
  dateTBA: boolean;
  timeTBA: boolean;
  noSpecificTime: boolean;
}

export interface DateStatus {
  code: "onsale" | "offsale" | "cancelled" | "postponed" | "rescheduled";
}

export interface Dates {
  start: DateStart;
  end?: { localDate?: string; localTime?: string; dateTime?: string };
  timezone?: string;
  status: DateStatus;
  spanMultipleDays?: boolean;
}

export interface PriceRange {
  type: string;
  currency: string;
  min: number;
  max: number;
}

export interface Promoter {
  id: string;
  name: string;
  description?: string;
}

export interface Sales {
  public: {
    startDateTime?: string;
    endDateTime?: string;
    startTBD?: boolean;
    startTBA?: boolean;
  };
  presales?: {
    name: string;
    description?: string;
    url?: string;
    startDateTime: string;
    endDateTime: string;
  }[];
}

export interface Seatmap {
  staticUrl: string;
}

export interface TicketLimit {
  info?: string;
}

export interface Accessibility {
  info?: string;
  ticketLimit?: number;
}

export interface Event {
  id: string;
  name: string;
  type: string;
  url?: string;
  locale?: string;
  images?: Image[];
  dates: Dates;
  sales?: Sales;
  classifications?: Classification[];
  promoter?: Promoter;
  promoters?: Promoter[];
  priceRanges?: PriceRange[];
  seatmap?: Seatmap;
  ticketLimit?: TicketLimit;
  accessibility?: Accessibility;
  info?: string;
  pleaseNote?: string;
  _embedded?: {
    venues?: Venue[];
    attractions?: Attraction[];
  };
  _links?: Links;
}

export interface EventSearchParams extends PageParams {
  keyword?: string;
  id?: string;
  locale?: string;
  source?: "ticketmaster" | "universe" | "frontgate" | "tmr";
  attractionId?: string;
  venueId?: string;
  promoterId?: string;
  postalCode?: string;
  latlong?: string;
  geoPoint?: string;
  radius?: string;
  unit?: "miles" | "km";
  startDateTime?: string;
  endDateTime?: string;
  onsaleStartDateTime?: string;
  onsaleEndDateTime?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  classificationName?: string;
  classificationId?: string;
  segmentId?: string;
  segmentName?: string;
  genreId?: string;
  subGenreId?: string;
  includeFamily?: "yes" | "no" | "only";
  includeTBA?: "yes" | "no" | "only";
  includeTBD?: "yes" | "no" | "only";
  includeTest?: "yes" | "no" | "only";
}

export interface EventSearchResponse {
  _embedded?: { events: Event[] };
  _links: Links;
  page: PageInfo;
}

// ── Classification ──────────────────────────────────────────────

export interface ClassificationDetail {
  segment: Segment & {
    _embedded?: {
      genres: (Genre & { _embedded?: { subgenres: SubGenre[] } })[];
    };
  };
  _links?: Links;
}

export interface ClassificationSearchParams extends PageParams {
  keyword?: string;
  id?: string;
}

export interface ClassificationSearchResponse {
  _embedded?: { classifications: ClassificationDetail[] };
  _links: Links;
  page: PageInfo;
}

// ── Suggest ─────────────────────────────────────────────────────

export interface SuggestParams {
  keyword: string;
  locale?: string;
  source?: "ticketmaster" | "universe" | "frontgate" | "tmr";
  countryCode?: string;
  includeSpellcheck?: "yes" | "no";
  segmentId?: string;
}

export interface SuggestResponse {
  _embedded?: {
    events?: Event[];
    attractions?: Attraction[];
    venues?: Venue[];
  };
}

// ── Error ───────────────────────────────────────────────────────

export interface TicketmasterApiError {
  fault?: {
    faultstring: string;
    detail: { errorcode: string };
  };
  errors?: { code: string; detail: string; status: string }[];
}
