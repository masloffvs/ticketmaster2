import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import { ConcertsList } from "../ConcertsList";

const ContentLayout = styled.div`
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
  gap: 2rem;
`;

const MainColumn = styled.div`
  flex: 1;
`;

const AdSidebar = styled.aside`
  width: 300px;
  flex-shrink: 0;
  display: none;

  @media (min-width: 900px) {
    display: block;
  }

  .ad-placeholder {
    width: 300px;
    height: 250px;
    background-color: #1a4d2e;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.5rem;
    text-align: center;
    padding: 1rem;
    cursor: pointer;
  }

  .ad-label {
    text-align: center;
    font-size: 0.75rem;
    color: #767676;
    margin-top: 0.5rem;
    display: block;
  }
`;

export const ArtistConcertsSection = () => {
  const { t } = useI18n();

  return (
    <ContentLayout>
      <MainColumn>
        <ConcertsList />
      </MainColumn>

      <AdSidebar aria-label={t("common.advertisement")}>
        <div className="ad-placeholder" role="img" aria-label="setlist.fm promotional banner">
          <span>setlist.fm</span>
          <br />
          <span style={{ fontSize: "1rem", fontWeight: "normal" }}>
            {t("artistPage.adMessage")}
          </span>
        </div>
        <span className="ad-label">{t("common.advertisement")}</span>
      </AdSidebar>
    </ContentLayout>
  );
};
