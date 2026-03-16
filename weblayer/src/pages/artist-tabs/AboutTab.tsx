import { useState } from "react";
import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import { SOCIAL_LINKS, TOUR_DATES } from "./content";
import {
  ButtonOutline,
  ContentWrapper,
  FullWidthLightSection,
  SectionTitleLight,
  TextLinkButton,
} from "./shared";

const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 1fr);
  gap: 4rem;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const AboutText = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: #333;

  h4 {
    color: #111;
    margin-top: 2rem;
    margin-bottom: 0.5rem;
  }

  ul {
    padding-left: 1.2rem;
    margin-bottom: 2rem;
  }
`;

const TourDateList = styled.ul`
  list-style: none;
  padding-left: 0;
  font-size: 0.85rem;
`;

const AboutImage = styled.img`
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
`;

const ABOUT_COPY =
  "For more than 20 years, multi-platinum rock band Shinedown have dominated the charts with their melodic hard rock sound. Featuring Brent Smith (vocals), Zach Myers (guitar), Eric Bass (bass/production) and Barry Kerch (drums), Shinedown have achieved a record-breaking 24 No. 1 rock hits, 15 platinum and gold singles, with platinum or gold certifications for all of their albums. Shinedown are also the No. 1 artist on Billboard's Greatest of All Time Mainstream Rock Artists list after notching the most-ever No.1s (21) on the Mainstream Rock Airplay chart. Their third album, 2008's The Sound of Madness, spawned four No. 1 singles on the Mainstream Rock chart and spent 120 consecutive weeks on the Billboard 200 albums chart, with the crossover hit Second Chance landing in the Top 10 on the Billboard Hot 100. Shinedown has sold over 10 million albums worldwide and is a high-octane touring juggernaut, playing countless sold-out arena tours. Shinedown will release their eighth studio album, Eight, in May 2026.";

const COLLAPSED_TOUR_COUNT = 5;

export const AboutTab = () => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleTourDates = isExpanded
    ? TOUR_DATES
    : TOUR_DATES.slice(0, COLLAPSED_TOUR_COUNT);

  return (
    <FullWidthLightSection aria-labelledby="about-title">
      <ContentWrapper>
        <SectionTitleLight id="about-title">{t("artistTabs.aboutTitle")}</SectionTitleLight>
        <AboutGrid>
          <AboutText>
            <p>{ABOUT_COPY}</p>

            <h4>{t("artistTabs.aboutConnect")}</h4>
            <ul>
              {SOCIAL_LINKS.map((linkLabel) => (
                <li key={linkLabel}>
                  <TextLinkButton href="#about">{linkLabel}</TextLinkButton>
                </li>
              ))}
            </ul>

            <h4>{t("artistTabs.aboutTourDates")}</h4>
            <TourDateList id="artist-tour-dates">
              {visibleTourDates.map((date) => (
                <li key={date}>• {date}</li>
              ))}
            </TourDateList>
            <ButtonOutline
              type="button"
              aria-expanded={isExpanded}
              aria-controls="artist-tour-dates"
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? t("common.showLess") : t("common.loadMore")}
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d={isExpanded ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </ButtonOutline>
          </AboutText>
          <AboutImage
            src="https://wallpapers.com/images/hd/shinedown-music-band-q5pdw4h0ow84d8ee.jpg"
            alt={t("artistTabs.aboutImageAlt")}
          />
        </AboutGrid>
      </ContentWrapper>
    </FullWidthLightSection>
  );
};
