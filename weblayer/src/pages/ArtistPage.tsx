import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { useI18n } from "../i18n/I18nProvider";
import { useArtistStore } from "../store/useArtistStore";
import {
  AboutTab,
  ExperienceTab,
  FansAlsoViewedTab,
  FaqsTab,
  GalleryTab,
  ReviewsTab,
  SetlistsTab,
} from "./ArtistTabs";
import { ArtistConcertsSection } from "./artist-page/ArtistConcertsSection";
import { ArtistHero } from "./artist-page/ArtistHero";
import { ArtistSectionNav } from "./artist-page/ArtistSectionNav";
import { MENU_ITEM_KEYS, type MenuItemKey } from "./artist-page/constants";

const PageContainer = styled.div`
  width: 100%;
  background-color: var(--color-white);
  min-height: 100vh;
`;

const ScrollSection = styled.section`
  scroll-margin-top: 88px;
`;

const renderSection = (key: MenuItemKey) => {
  switch (key) {
    case "concerts":
      return <ArtistConcertsSection />;
    case "experience":
      return <ExperienceTab />;
    case "gallery":
      return <GalleryTab />;
    case "about":
      return <AboutTab />;
    case "setlists":
      return <SetlistsTab />;
    case "faqs":
      return <FaqsTab />;
    case "reviews":
      return <ReviewsTab />;
    case "fansAlsoViewed":
      return <FansAlsoViewedTab />;
    default:
      return null;
  }
};

export const ArtistPage = () => {
  const { artistId } = useParams();
  const [activeTab, setActiveTab] = useState<MenuItemKey>("concerts");
  const { t } = useI18n();
  const { artist, isLoading, fetchArtistData } = useArtistStore();

  useEffect(() => {
    if (artistId) {
      fetchArtistData(artistId);
    }
  }, [artistId, fetchArtistData]);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = 120;

      for (let index = MENU_ITEM_KEYS.length - 1; index >= 0; index -= 1) {
        const key = MENU_ITEM_KEYS[index];
        const element = document.getElementById(key);

        if (element && element.getBoundingClientRect().top <= threshold) {
          setActiveTab((current) => (current === key ? current : key));
          return;
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToSection = (sectionId: MenuItemKey) => {
    const element = document.getElementById(sectionId);

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTab(sectionId);
  };

  if (isLoading || !artist) {
    return (
      <PageContainer style={{ padding: "4rem", textAlign: "center" }} aria-live="polite">
        {t("artistPage.loading")}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ArtistHero artist={artist} />
      <ArtistSectionNav activeTab={activeTab} items={MENU_ITEM_KEYS} onSelect={scrollToSection} />

      {MENU_ITEM_KEYS.map((key) => (
        <ScrollSection key={key} id={key} aria-labelledby={`${key}-nav-item`}>
          {renderSection(key)}
        </ScrollSection>
      ))}
    </PageContainer>
  );
};
