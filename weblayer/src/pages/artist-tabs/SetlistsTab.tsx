import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import { SETLIST_ITEMS } from "./content";
import { ContentWrapper, FullWidthLightSection, SectionTitleLight, TextLinkButton } from "./shared";

const SetlistBoard = styled.div`
  background-color: #f2f2f2;
  border-radius: 4px;
  overflow: hidden;
`;

const SetlistList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const SetlistItem = styled.li`
  border-bottom: 1px solid #e2e8f0;
  padding: 1.5rem 1rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 1rem;
  align-items: center;

  .title {
    font-weight: 600;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .location {
    color: #767676;
    font-size: 0.9rem;
  }

  .date {
    font-size: 0.9rem;
    color: #111;
  }

  svg {
    width: 16px;
    height: 16px;
    fill: #767676;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SetlistMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-top: 1rem;
  color: #767676;
  gap: 1rem;

  @media (max-width: 700px) {
    flex-direction: column;
  }
`;

export const SetlistsTab = () => {
  const { t } = useI18n();

  return (
    <FullWidthLightSection aria-labelledby="setlists-title">
      <ContentWrapper>
        <SectionTitleLight id="setlists-title">{t("artistTabs.setlistsTitle")}</SectionTitleLight>
        <SetlistBoard>
          <SetlistList>
            {SETLIST_ITEMS.map((item) => (
              <SetlistItem key={`${item.title}-${item.date}`}>
                <div className="title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                  {item.title}
                </div>
                <div className="location">{item.loc}</div>
                <div className="date">{item.date}</div>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </SetlistItem>
            ))}
          </SetlistList>
        </SetlistBoard>
        <SetlistMeta>
          <span>
            Powered by <strong style={{ color: "#84c225" }}>setlist</strong>.fm
          </span>
          <TextLinkButton href="#concerts">{t("artistTabs.moreSetlists")}</TextLinkButton>
        </SetlistMeta>
      </ContentWrapper>
    </FullWidthLightSection>
  );
};
