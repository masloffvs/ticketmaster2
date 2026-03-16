import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import { FAQ_ITEMS } from "./content";
import { ContentWrapper, FullWidthLightSection, SectionTitleLight } from "./shared";

const FaqList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const FaqItem = styled.li<{ $highlighted?: boolean }>`
  border-bottom: 1px solid #e2e8f0;
  padding: 1.5rem 1rem;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  justify-content: space-between;
  background-color: ${(props) => (props.$highlighted ? "#e2e8f0" : "transparent")};

  svg {
    width: 16px;
    height: 16px;
    fill: #111;
    flex-shrink: 0;
  }
`;

export const FaqsTab = () => {
  const { t } = useI18n();

  return (
    <FullWidthLightSection aria-labelledby="faqs-title">
      <ContentWrapper>
        <SectionTitleLight id="faqs-title">{t("artistTabs.faqsTitle")}</SectionTitleLight>
        <FaqList>
          {FAQ_ITEMS.map((faq, index) => (
            <FaqItem key={faq} $highlighted={index === FAQ_ITEMS.length - 1}>
              <span>{faq}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </FaqItem>
          ))}
        </FaqList>
      </ContentWrapper>
    </FullWidthLightSection>
  );
};
