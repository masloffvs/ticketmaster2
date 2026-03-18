// ─── ISMDS Facets Response Types ────────────────────────────────

interface IsmdsEventFacetsResponse {
  schema: string; // "urn:com.ticketmaster.services:schema:ismds:EventFacets:1.0"
  meta: {
    type: string;
    modified: string;
    expires: string;
  };
  eventId: string;
  facets: IsmdsFacet[];
  _embedded?: {
    area?: Record<string, IsmdsArea>;
    description?: Record<string, IsmdsDescription>;
  };
}

interface IsmdsFacet {
  accessibility?: string[];
  areas?: string[];
  attributes?: string[];
  available: boolean;
  description?: string;
  inventoryTypes?: ("primary" | "resale")[];
  offerTypes?: ("standard" | "platinum" | "vip")[];
  offers?: string[];
  seating?: "reserved" | "general";
  section?: string;
  count: number;
  places: string[]; // compressed bracket-notation, e.g. "GEYDCOSMHI[2[A,Q],3[A,Q],ZQ]"
  placeGroups?: string[];
}

interface IsmdsArea {
  name: string;
  description?: string;
}

interface IsmdsDescription {
  name: string;
  description?: string;
  color?: string;
}

// ─── Compressed Places Decoder ──────────────────────────────────
// The "compress=places" param returns a bracket-encoded tree:
//   "GEYDCOSMHI[2[A,Q],3[A,Q],ZQ]"
// Each character or group before '[' is a prefix. Inside brackets,
// comma-separated children share that prefix. Nesting goes deeper.
// Leaves are individual place IDs when fully expanded.
//
// Decoded: GEYDCOSMHI2A, GEYDCOSMHI2Q, GEYDCOSMHI3A, GEYDCOSMHI3Q, GEYDCOSMHIZQ

function decompressPlaces(compressed: string): string[] {
  const results: string[] = [];

  function parse(s: string, pos: number, prefix: string): number {
    let token = "";
    while (pos < s.length) {
      const ch = s[pos];
      if (ch === "[") {
        // everything accumulated in token becomes deeper prefix
        pos = parse(s, pos + 1, prefix + token);
        token = "";
      } else if (ch === ",") {
        if (token) results.push(prefix + token);
        token = "";
        pos++;
      } else if (ch === "]") {
        if (token) results.push(prefix + token);
        return pos + 1;
      } else {
        token += ch;
        pos++;
      }
    }
    if (token) results.push(prefix + token);
    return pos;
  }

  parse(compressed, 0, "");
  return results;
}

// Decode all places from a facet
function decodeFacetPlaces(facet: IsmdsFacet): string[] {
  return facet.places.flatMap(decompressPlaces);
}

// ─── RequestBuilder ─────────────────────────────────────────────

class RequestBuilder {
  private headers: Headers = new Headers();
  private method: string = "GET";
  private url: string = "";
  private params: [string, string][] = [];

  setUrl(url: string): this {
    this.url = url;
    return this;
  }

  setMethod(method: string): this {
    this.method = method;
    return this;
  }

  addHeader(key: string, value: string): this {
    this.headers.append(key, value);
    return this;
  }

  addParam(key: string, value: string): this {
    this.params.push([key, value]);
    return this;
  }

  private buildUrl(): string {
    if (this.params.length === 0) return this.url;
    const url = new URL(this.url);
    for (const [key, value] of this.params) {
      url.searchParams.append(key, value);
    }
    return url.toString();
  }

  build(): RequestInit {
    return {
      method: this.method,
      headers: this.headers,
      redirect: "follow",
    };
  }

  async execute(): Promise<string> {
    const response = await fetch(this.buildUrl(), this.build());
    return response.text();
  }
}

// Usage:
new RequestBuilder()
  .setUrl(
    "https://services.ticketmaster.com/api/ismds/event/080062F9BC624987/facets",
  )
  .addHeader(
    "c-tmpt",
    "0:32d0282981000000:1750840747:90b9cea3:f5986c6c5533969ddea657c52fbc6061:22993c5a2ca0791ba66293fd00dada6836a457fc5ed6a3e012892567006ee45c",
  )
  .addHeader(
    "User-Agent",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  )
  .addHeader("TMPS-Correlation-Id", "291a4114-264f-483c-bd3c-1b5b52a3d05a")
  .addHeader(
    "Cookie",
    "BID=iAZowRCJ8EnmhSRJJTTS8GhRKVVAMtRAC_1TD8NjAlyaCiq74HU1cZ3z04ACf0e0KvMTmiHqw08QqjJo; SID=wDW7ebovbgGCW5PO6XQX_oNmMBMTmRGA8OB6nHeHkXTYlL1g8q4GsbfBYL18ijK61sTaTj02V7oaGjSD",
  )

  .addParam(
    "by",
    "section+seating+attributes+available+accessibility+offer+placeGroups+inventoryType+offerType+area+description",
  )
  .addParam("show", "places")
  .addParam("embed", "area")
  .addParam("embed", "description")
  .addParam("q", "available")
  .addParam("compress", "places")
  .addParam(
    "resaleChannelId",
    "internal.ecommerce.consumer.desktop.web.browser.ticketmaster.us",
  )
  .addParam("apikey", "b462oi7fic6pehcdkzony5bxhe")
  .addParam("apisecret", "pquzpfrfz7zd2ylvtz3w5dtyse")
  .execute()
  .then((raw) => {
    const data: IsmdsEventFacetsResponse = JSON.parse(raw);

    if (!data.facets) {
      console.log("No facets in response. Raw response:");
      console.log(raw);
      return;
    }

    console.log(`Event: ${data.eventId}`);
    console.log(`Facets: ${data.facets.length}`);
    console.log("---");

    for (const facet of data.facets) {
      const seats = decodeFacetPlaces(facet);
      console.log(
        `Section ${facet.section ?? "?"} | ${facet.seating ?? "?"} | ${facet.count} places | ` +
          `inventory: ${(facet.inventoryTypes ?? []).join(",")} | offers: ${(facet.offerTypes ?? []).join(",")}`,
      );
      console.log(`  Decoded seats: ${seats.join(", ")}`);
    }
  })
  .catch((error) => console.error(error));
