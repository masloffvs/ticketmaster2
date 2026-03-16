import styled from "styled-components";
import useSWR from "swr";
import { useI18n } from "../i18n/I18nProvider";
import { ArtistShowcaseCard } from "./home/ArtistShowcaseCard";
import { HomeHero } from "./home/HomeHero";
import { TrendingEventCard } from "./home/TrendingEventCard";
import type { HomeArtist, HomeEvent } from "./home/types";

const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-top: 3rem;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 2rem;
`;

const StatusMessage = styled.p`
  color: #475569;
`;

const FEATURED_ARTISTS: HomeArtist[] = [
  {
    genre: "Rock",
    id: 1,
    imageColor: "#026cdf",
    name: "Shinedown",
    slug: "shinedown-tickets",
  },
  {
    genre: "Classic Rock",
    id: 2,
    imageColor: "#bebebe",
    name: "Paul McCartney",
    slug: "paul-mccartney-tickets",
  },
];

const fetcher = () =>
  new Promise<HomeEvent[]>((resolve) =>
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
        ]),
      500,
    ),
  );

export const Home = () => {
  const { t } = useI18n();
  const {
    data: events,
    error,
    isLoading,
  } = useSWR<HomeEvent[]>("/api/events/trending", fetcher);

  const handleEventClick = (event: HomeEvent) => {
    const slug =
      event.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + "-tickets";
    const acLinks =
      "?ac_link=ursa_ae182a25-3001-4462-a0aa-167d87f6f9ad_a_" +
      `${event.id}&ac_link=iccp_hp_t3_fallback_K8vZ9175R0V`;

    window.location.href = `/${slug}/event/${event.id}${acLinks}`;
  };

  const handleArtistClick = (artist: HomeArtist) => {
    window.location.href = `/${artist.slug}/artist/${artist.id}`;
  };

  return (
    <MainContent>
      <HomeHero />

      <section aria-labelledby="trending-artists-title">
        <SectionTitle id="trending-artists-title">
          {t("homePage.trendingArtists")}
        </SectionTitle>
        <EventsGrid>
          {FEATURED_ARTISTS.map((artist) => (
            <ArtistShowcaseCard
              key={artist.id}
              artist={artist}
              onSelect={handleArtistClick}
            />
          ))}
        </EventsGrid>
      </section>

      <section aria-labelledby="trending-events-title">
        <SectionTitle id="trending-events-title">
          {t("homePage.trendingEvents")}
        </SectionTitle>

        {isLoading ? (
          <StatusMessage aria-live="polite">
            {t("homePage.loadingTrending")}
          </StatusMessage>
        ) : null}
        {error ? (
          <StatusMessage aria-live="polite">
            {t("homePage.loadingError")}
          </StatusMessage>
        ) : null}

        {events ? (
          <EventsGrid>
            {events.map((event) => (
              <TrendingEventCard
                key={event.id}
                event={event}
                onSelect={handleEventClick}
              />
            ))}
          </EventsGrid>
        ) : null}
      </section>
    </MainContent>
  );
};
