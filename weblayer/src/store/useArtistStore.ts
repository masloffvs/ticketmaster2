import { create } from 'zustand';

export interface ConcertEvent {
  id: string;
  month: string;
  day: string;
  dateDetails: string;
  location: string;
  venue: string;
  subtitle?: string;
  isPromoted?: boolean;
}

export interface ArtistData {
  id: string;
  name: string;
  genre: string;
  rating: number;
  heroImage: string;
}

interface ArtistState {
  artist: ArtistData | null;
  events: ConcertEvent[];
  isLoading: boolean;
  error: string | null;
  fetchArtistData: (artistId: string) => Promise<void>;
}

export const useArtistStore = create<ArtistState>((set) => ({
  artist: null,
  events: [],
  isLoading: false,
  error: null,
  
  fetchArtistData: async (artistId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Имитируем запрос к API (serverlayer)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockArtist: ArtistData = {
        id: artistId,
        name: 'Shinedown Tickets',
        genre: 'Rock',
        rating: 4.7,
        heroImage: 'https://images.unsplash.com/photo-1540039155732-684735035726?auto=format&fit=crop&q=80&w=2000'
      };

      const mockEvents: ConcertEvent[] = [
        { id: '1', month: 'APR', day: '04', dateDetails: 'Sat • 7:00 PM', location: 'Seattle, WA', venue: 'Moore Theatre', subtitle: 'Amplify Courage: A Concert For School Bullying Prevention' },
        { id: '2', month: 'MAY', day: '13', dateDetails: 'Wed • 7:00 PM', location: 'Green Bay, WI', venue: 'Resch Center', subtitle: 'Shinedown: Dance, Kid, Dance Act II' },
        { id: 'promo', month: '', day: '', dateDetails: '', location: '', venue: '', subtitle: 'Be notified early about exclusive access to presales.', isPromoted: true },
        { id: '3', month: 'MAY', day: '15', dateDetails: 'Fri • 11:00 AM', location: 'Columbus, OH', venue: 'Historic Crew Stadium', subtitle: 'Sonic Temple Art + Music Festival' },
        { id: '4', month: 'MAY', day: '16', dateDetails: 'Sat • 7:00 PM', location: 'Madison, WI', venue: 'Kohl Center', subtitle: 'Shinedown: Dance, Kid, Dance Act II' },
        { id: '5', month: 'MAY', day: '18', dateDetails: 'Mon • 7:00 PM', location: 'Sioux Falls, SD', venue: 'Denny Sanford PREMIER Center', subtitle: 'Shinedown: Dance, Kid, Dance Act II' },
      ];

      set({ artist: mockArtist, events: mockEvents, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to load artist data', isLoading: false });
    }
  }
}));
