import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import useSWR from 'swr';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
`;

const ArtistHeader = styled.div`
  background: var(--color-header-blue);
  color: var(--color-white);
  padding: 3rem 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;

  h1 {
    margin: 0;
    font-size: 3rem;
  }
`;

const ContentArea = styled.div`
  display: flex;
  gap: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.aside`
  flex: 1;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  height: fit-content;
`;

const EventsList = styled.main`
  flex: 3;
`;

const EventRow = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  button {
    background: var(--color-primary);
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-family: inherit;

    &:hover {
      background: var(--color-header-blue);
    }
  }
`;

const DateBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 2rem;

  .month {
    font-size: 0.9rem;
    color: var(--color-primary);
    text-transform: uppercase;
    font-weight: bold;
  }
  .day {
    font-size: 1.8rem;
    font-weight: bold;
  }
`;

const EventDetails = styled.div`
  flex-grow: 1;

  .title {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 0.3rem;
  }
  .venue {
    color: #666;
    font-size: 0.95rem;
  }
`;

// Mock fetcher for artist data
const fetchArtist = (url: string) => {
  // Extract id from URL for demo purposes
  const parts = url.split('/');
  const id = parts[parts.length - 1];
  
  return new Promise<any>(resolve => setTimeout(() => resolve({
    id,
    name: url.includes('mccartney') ? 'Paul McCartney' : 'Mock Artist Name',
    bio: 'One of the most successful composers and performers of all time...',
    upcomingEvents: [
      { id: 101, title: 'Got Back Tour', venue: 'Wembley Stadium, London, UK', date: '2026-10-15', mon: 'OCT', day: '15' },
      { id: 102, title: 'Got Back Tour', venue: 'O2 Arena, London, UK', date: '2026-10-18', mon: 'OCT', day: '18' },
    ]
  }), 600));
};

export const ArtistPage = () => {
  const { artistSlug, artistId } = useParams();
  const { data: artist, error, isLoading } = useSWR(`/api/notBindings/artist/${artistId}`, fetchArtist);

  if (isLoading) return <PageContainer>Loading artist details...</PageContainer>;
  if (error || !artist) return <PageContainer>Error loading artist</PageContainer>;

  return (
    <PageContainer>
      <ArtistHeader>
        <h1>{artist.name} Tickets</h1>
      </ArtistHeader>

      <ContentArea>
        <Sidebar>
          <h3>About {artist.name}</h3>
          <p>{artist.bio}</p>
          <p>ID in system: {artistId}</p>
          <p>Slug used: {artistSlug}</p>
        </Sidebar>

        <EventsList>
          <h2>Upcoming Events</h2>
          {artist.upcomingEvents.map((ev: any) => (
            <EventRow key={ev.id}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DateBox>
                  <span className="month">{ev.mon}</span>
                  <span className="day">{ev.day}</span>
                </DateBox>
                <EventDetails>
                  <div className="title">{ev.title}</div>
                  <div className="venue">{ev.venue}</div>
                </EventDetails>
              </div>
              <button>See Tickets</button>
            </EventRow>
          ))}
        </EventsList>
      </ContentArea>
    </PageContainer>
  );
};
