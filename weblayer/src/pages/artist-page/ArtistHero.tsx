import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import type { ArtistData } from "../../store/useArtistStore";

const HeroSection = styled.section<{ $bgImage: string }>`
  position: relative;
  width: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background-image:
    linear-gradient(
      to right,
      rgba(0, 0, 0, 0.9) 0%,
      rgba(0, 0, 0, 0.4) 50%,
      rgba(0, 0, 0, 0) 100%
    ),
    url(${(props) => props.$bgImage});
  background-size: cover;
  background-position: center 20%;
  color: var(--color-white);
  padding: 3rem 0;
`;

const Breadcrumbs = styled.nav`
  position: absolute;
  top: 1.5rem;
  left: max(2rem, calc((100% - 1200px) / 2));
  font-size: 0.85rem;
  color: #e0e0e0;
  font-weight: 500;

  a {
    color: inherit;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  span {
    margin: 0 0.5rem;
  }
`;

const HeroContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 2rem;
`;

const Genre = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0 0 1.5rem 0;
  letter-spacing: -0.5px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const IconButton = styled.button`
  background: rgba(0, 0, 0, 0.3);
  color: white;
  border: 1px solid white;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  svg {
    fill: transparent;
    stroke: currentColor;
    stroke-width: 2;
    width: 20px;
    height: 20px;
  }
`;

const RatingBadge = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid white;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.95rem;

  svg {
    fill: #ffb400;
    width: 18px;
    height: 18px;
  }
`;

interface ArtistHeroProps {
  artist: ArtistData;
}

export const ArtistHero = ({ artist }: ArtistHeroProps) => {
  const { t } = useI18n();

  return (
    <HeroSection $bgImage={artist.heroImage}>
      <Breadcrumbs aria-label="Breadcrumb">
        <a href="/">{t("common.home")}</a>
        <span aria-hidden="true">/</span>
        <a href="/#concerts">{t("common.concerts")}</a>
        <span aria-hidden="true">/</span>
        <a href={`/#${artist.genre.toLowerCase()}`}>{artist.genre}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{artist.name}</span>
      </Breadcrumbs>

      <HeroContent>
        <Genre>{artist.genre}</Genre>
        <Title>{artist.name}</Title>
        <ActionButtons>
          <IconButton type="button" aria-label={t("artistPage.favorite")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </IconButton>
          <RatingBadge aria-label={`Artist rating ${artist.rating} out of 5`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            {artist.rating}
          </RatingBadge>
        </ActionButtons>
      </HeroContent>
    </HeroSection>
  );
};
