import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import { FAN_ARTISTS } from "./content";
import { ContentWrapper, FullWidthLightSection, Grid, SectionTitleLight } from "./shared";

const FanCard = styled.article`
  img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .name {
    font-weight: 700;
    font-size: 0.95rem;
  }
`;

export const FansAlsoViewedTab = () => {
  const { t } = useI18n();

  return (
    <FullWidthLightSection aria-labelledby="fans-title">
      <ContentWrapper>
        <SectionTitleLight id="fans-title">{t("artistTabs.fansTitle")}</SectionTitleLight>
        <Grid $cols={4}>
          {FAN_ARTISTS.map((fan) => (
            <FanCard key={fan.name}>
              <img src={fan.img} alt={fan.name} />
              <div className="name">{fan.name}</div>
            </FanCard>
          ))}
        </Grid>
      </ContentWrapper>
    </FullWidthLightSection>
  );
};
