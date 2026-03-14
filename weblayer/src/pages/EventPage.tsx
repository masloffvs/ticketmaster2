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
const EventHeader = styled.div`
  background: var(--color-black);
  color: var(--color-white);
  padding: 3rem 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;

  h1 { margin: 0; font-size: 2.5rem; }
`;
const MapArea = styled.div`
  background: #e0e0e0;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 2rem;
  color: #666;
`;

const fetchEvent = (url: string) => {
  const parts = url.split('/');
  return new Promise<any>(resolve => setTimeout(() => resolve({
    id: parts[parts.length - 1],
    title: url.includes('paul-mccartney') ? 'Paul McCartney: Got Back Tour' : 'Amazing Concert Title',
    venue: 'Wembley Stadium',
    date: '2026-10-15T19:00:00Z',
  }), 400));
};

export const EventPage = () => {
  const { eventSlug, eventId } = useParams();
  const { data: ev, error, isLoading } = useSWR(`/api/notBindings/event/${eventId}`, fetchEvent);

  if (isLoading) return <PageContainer>Loading event details...</PageContainer>;
  if (error || !ev) return <PageContainer>Error loading event</PageContainer>;

  return (
    <PageContainer>
      <EventHeader>
        <h1>{ev.title}</h1>
        <p>{ev.venue} • {new Date(ev.date).toLocaleDateString()}</p>
        <p>System ID: {eventId} / Route Slug: {eventSlug}</p>
      </EventHeader>

      <MapArea>
        [ Interactive Venue Map Placeholder ]
      </MapArea>
    </PageContainer>
  );
};
