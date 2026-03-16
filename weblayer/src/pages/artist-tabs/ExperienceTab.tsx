import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import { EXPERIENCE_FEATURES } from "./content";
import {
  ContentWrapper,
  FullWidthDarkSection,
  Grid,
  SectionTitle,
  TextLinkButton,
} from "./shared";

const ExperienceCard = styled.article`
  background-color: #111;
  border: 1px solid #333;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ExperienceHeader = styled.div`
  background-color: #111;
  color: white;
  padding: 2rem;
  text-align: center;
  border-bottom: 4px solid #026cdf;

  h3 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
  }
`;

const ExperienceBody = styled.div`
  background-color: white;
  color: #111;
  padding: 2rem;
  flex: 1;

  h4 {
    font-size: 1.1rem;
    margin-top: 0;
    margin-bottom: 1rem;
  }

  ul {
    padding-left: 1.2rem;
    margin-bottom: 2rem;
    font-size: 0.9rem;
    color: #444;
    line-height: 1.5;
  }
`;

const splitTitle = (title: string) => {
  const words = title.split(" ");

  return {
    firstLine: words.slice(0, 2).join(" "),
    secondLine: words.slice(2).join(" "),
  };
};

export const ExperienceTab = () => {
  const { getObject, t } = useI18n();
  const cards = getObject<Array<{ title: string; subtitle: string }>>(
    "artistTabs.experienceCards",
  );

  return (
    <FullWidthDarkSection aria-labelledby="experience-title">
      <ContentWrapper>
        <SectionTitle id="experience-title">
          {t("artistTabs.experienceTitle")}
        </SectionTitle>
        <Grid>
          {cards.map((card, index) => {
            const titleLines = splitTitle(card.title);

            return (
              <ExperienceCard key={card.title}>
                <ExperienceHeader>
                  <h3>
                    {titleLines.firstLine}
                    <span aria-hidden="true">
                      {" "}
                      &<br />
                    </span>
                    {titleLines.secondLine}
                  </h3>
                </ExperienceHeader>
                <ExperienceBody>
                  <h4>{card.subtitle}</h4>
                  <ul>
                    {EXPERIENCE_FEATURES[index]?.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <TextLinkButton href="#about">
                    {t("common.readMore")}
                  </TextLinkButton>
                </ExperienceBody>
              </ExperienceCard>
            );
          })}
        </Grid>
      </ContentWrapper>
    </FullWidthDarkSection>
  );
};
