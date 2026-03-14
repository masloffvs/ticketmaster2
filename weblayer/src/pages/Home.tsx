import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import useSWR from "swr";

const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
`;

const HeroSection = styled.section`
  background: linear-gradient(135deg, #026cdf 0%, #013e80 100%);
  color: white;
  padding: 4rem 2rem;
  border-radius: 12px;
  margin-bottom: 3rem;
  text-align: center;

  h2 {
    margin-top: 0;
    font-size: 2.8rem;
    margin-bottom: 0.5rem;
  }

  p {
    font-size: 1.2rem;
    opacity: 0.9;
  }
`;

const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 2rem;
`;

const EventCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  }
`;

const EventImagePlaceholder = styled.div`
  background-color: #e2e8f0;
  height: 160px;
  border-radius: 6px;
  margin-bottom: 1.2rem;
`;

const EventTitle = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.8rem;
  line-height: 1.3;
`;

const EventMeta = styled.div`
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
`;

const EventPrice = styled.div`
  margin-top: 1.2rem;
  font-weight: 700;
  color: #026cdf;
  font-size: 1.1rem;
`;

interface Event {
  id: number;
  title: string;
  date: string;
  venue: string;
  price: string;
}

// Mock fetcher для SWR, эмулирующий задержку базы данных
const fetcher = () =>
  new Promise<Event[]>((resolve) =>
    setTimeout(
      () =>
        resolve([
          {
            id: 1,
            title: "Coldplay - Music Of The Spheres",
            date: "Oct 15, 2026",
            venue: "Wembley Stadium",
            price: "£95",
          },
          {
            id: 2,
            title: "The Weeknd - After Hours",
            date: "Nov 12, 2026",
            venue: "O2 Arena",
            price: "£110",
          },
          {
            id: 3,
            title: "Champions League Final",
            date: "May 30, 2026",
            venue: "Santiago Bernabéu",
            price: "€350",
          },
          {
            id: 4,
            title: "Hamilton - The Musical",
            date: "Ongoing",
            venue: "Victoria Palace Theatre",
            price: "£55",
          },
        ]),
      500,
    ),
  );

export const Home = () => {
  const navigate = useNavigate();

  const handleCardClick = (event: Event) => {
    const slug =
      event.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + "-tickets";
    const acLinks = `?ac_link=ursa_ae182a25-3001-4462-a0aa-167d87f6f9ad_a_${event.id}&ac_link=iccp_hp_t3_fallback_K8vZ9175R0V`;
    navigate(`/${slug}/event/${event.id}${acLinks}`);
  };

  const {
    data: events,
    error,
    isLoading,
  } = useSWR<Event[]>("/api/events/trending", fetcher);

  return (
    <MainContent>
      <HeroSection>
        <h2>Find Your Next Live Experience</h2>
        <p>Discover thousands of live events playing near you</p>
      </HeroSection>

      <h3>Trending Events</h3>

      {isLoading && <p>Loading trending events...</p>}
      {error && <p>Oops! Something went wrong.</p>}

      {events && (
        <EventsGrid>
          {events.map((event) => (
            <EventCard key={event.id} onClick={() => handleCardClick(event)}>
              <EventImagePlaceholder />
              <EventTitle>{event.title}</EventTitle>
              <EventMeta>📅 {event.date}</EventMeta>
              <EventMeta>📍 {event.venue}</EventMeta>
              <EventPrice>From {event.price}</EventPrice>
            </EventCard>
          ))}
        </EventsGrid>
      )}
    </MainContent>
  );
};
