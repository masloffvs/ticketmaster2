import styled from "styled-components";
import type { HomeArtist } from "./types";

const CardButton = styled.button`
  background: white;
  border-radius: 8px;
  padding: 1.2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border: none;
  text-align: center;
  font-family: inherit;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  }
`;

const ArtistImagePlaceholder = styled.div<{ $color: string }>`
  background-color: ${(props) => props.$color};
  height: 160px;
  border-radius: 50%;
  width: 160px;
  margin: 0 auto 1.2rem auto;
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

interface ArtistShowcaseCardProps {
  artist: HomeArtist;
  onSelect: (artist: HomeArtist) => void;
}

export const ArtistShowcaseCard = ({
  artist,
  onSelect,
}: ArtistShowcaseCardProps) => {
  return (
    <CardButton
      type="button"
      aria-label={`Open artist page for ${artist.name}`}
      onClick={() => onSelect(artist)}
    >
      <ArtistImagePlaceholder $color={artist.imageColor} aria-hidden="true" />
      <EventTitle>{artist.name}</EventTitle>
      <EventMeta>{artist.genre}</EventMeta>
    </CardButton>
  );
};
