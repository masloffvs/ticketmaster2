import { create } from "zustand";

export interface TicketType {
  id: string;
  label: string;
  price: number;
  currency: string;
}

export interface EventData {
  id: string;
  name: string;
  slug: string;
  date: string;
  venue: string;
  venueSlug: string;
  city: string;
  imageUrl: string;
  description: string;
  ageLimit: string;
  performers: string[];
  organizer: string;
  serviceFee: number;
  currency: string;
  ticketLimit: number;
  category: string;
  subcategory: string;
  artistName: string;
  artistSlug: string;
  tickets: TicketType[];
  hasResale: boolean;
}

interface EventState {
  event: EventData | null;
  isLoading: boolean;
  error: string | null;
  selectedTickets: Record<string, number>;
  fetchEvent: (eventId: string) => Promise<void>;
  setTicketQuantity: (ticketId: string, quantity: number) => void;
  totalTickets: () => number;
}

export const useEventStore = create<EventState>((set, get) => ({
  event: null,
  isLoading: false,
  error: null,
  selectedTickets: {},

  fetchEvent: async (eventId: string) => {
    set({ isLoading: true, error: null });

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockEvent: EventData = {
        id: eventId,
        name: "THE BEST OF CHRISTER SJÖGREN",
        slug: "the-best-of-christer-sjogren-biljetter",
        date: "2026-11-13T15:00:00+01:00",
        venue: "Forum Oskarshamn",
        venueSlug: "forum-oskarshamn-oskarshamn-biljetter/fr6/416",
        city: "OSKARSHAMN",
        imageUrl:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=200",
        description:
          'Christer Sjögren är tillbaka på scenen med sin hyllade show "The best of Christer Sjögren" Tillsammans med sitt band och den fantastiska sångerskan Anna Werner bjuder Christer på en musikalisk resa genom hela sin storslagna karriär. Från de omåttligt populära låtarna med Vikingarna, till tidlösa klassiker från Elvis Presley och Frank Sinatra. En kväll fylld med oförglömliga hits som "My Way", "Leende guldbruna ögon" och många fler.',
        ageLimit: "13+",
        performers: [
          "Christer Sjögren",
          "Anna Werner",
          "Anna-Lena Andersson",
          "Martin Lindqvist",
          "Stefan Jonsson",
          "Leif Ottebrand",
          "Peter Mjörnestrand",
        ],
        organizer: "H.I.P.E. Music",
        serviceFee: 60,
        currency: "SEK",
        ticketLimit: 15,
        category: "Musik",
        subcategory: "Övrig musik",
        artistName: "Christer Sjögren",
        artistSlug: "christer-sjogren-biljetter/97573",
        tickets: [
          {
            id: "standard",
            label: "Ordinarie",
            price: 745,
            currency: "SEK",
          },
        ],
        hasResale: true,
      };

      set({ event: mockEvent, isLoading: false });
    } catch {
      set({ error: "Failed to load event data", isLoading: false });
    }
  },

  setTicketQuantity: (ticketId, quantity) => {
    set((state) => ({
      selectedTickets: {
        ...state.selectedTickets,
        [ticketId]: Math.max(0, quantity),
      },
    }));
  },

  totalTickets: () => {
    const { selectedTickets } = get();
    return Object.values(selectedTickets).reduce((sum, q) => sum + q, 0);
  },
}));
