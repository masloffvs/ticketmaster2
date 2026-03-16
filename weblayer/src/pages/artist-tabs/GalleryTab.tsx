import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import { GALLERY_VIDEOS } from "./content";
import { ContentWrapper, FullWidthDarkSection, Grid, SectionTitle } from "./shared";

const GallerySpacer = styled.div`
  background-color: #fff;
  height: 4rem;
  width: 100%;
  margin-bottom: 4rem;
`;

const VideoCard = styled.a`
  position: relative;
  aspect-ratio: 16 / 9;
  background-color: #222;
  cursor: pointer;
  overflow: hidden;
  border: none;
  padding: 0;
  text-align: left;
  display: block;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
    transition: opacity 0.3s;
  }

  &:hover img,
  &:focus-visible img {
    opacity: 0.8;
  }

  .play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    fill: transparent;
    stroke: white;
    stroke-width: 1.5;
  }

  .title {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.88));
    color: white;
  }
`;

export const GalleryTab = () => {
  const { t } = useI18n();

  return (
    <FullWidthDarkSection style={{ padding: "0 0 4rem 0" }} aria-labelledby="gallery-title">
      <GallerySpacer aria-hidden="true" />
      <ContentWrapper>
        <SectionTitle id="gallery-title">{t("artistTabs.galleryTitle")}</SectionTitle>
        <Grid $cols={4} $gap="10px">
          {GALLERY_VIDEOS.map((video) => (
            <VideoCard
              key={video.title}
              href={video.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open video preview for ${video.title}`}
            >
              <img src={video.img} alt={video.title} />
              <svg className="play-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10,8 16,12 10,16" fill="white" stroke="none" />
              </svg>
              <div className="title">{video.title}</div>
            </VideoCard>
          ))}
        </Grid>
      </ContentWrapper>
    </FullWidthDarkSection>
  );
};
