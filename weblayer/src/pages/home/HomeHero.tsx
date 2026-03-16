import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";

const HeroSection = styled.section`
  background: linear-gradient(135deg, #026cdf 0%, #013e80 100%);
  color: white;
  padding: 4rem 2rem;
  border-radius: 12px;
  margin-bottom: 3rem;
  text-align: center;

  h1 {
    margin-top: 0;
    font-size: 2.8rem;
    margin-bottom: 0.5rem;
  }

  p {
    font-size: 1.2rem;
    opacity: 0.9;
    margin-bottom: 0;
  }
`;

export const HomeHero = () => {
  const { t } = useI18n();

  return (
    <HeroSection aria-labelledby="home-hero-title">
      <h1 id="home-hero-title">{t("homePage.heroTitle")}</h1>
      <p>{t("homePage.heroSubtitle")}</p>
    </HeroSection>
  );
};
