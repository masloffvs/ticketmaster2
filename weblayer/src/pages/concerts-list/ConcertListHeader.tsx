import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Title = styled.h2`
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  span {
    font-weight: 400;
    font-size: 1.1rem;
    color: #333;
  }
`;

const ViewControls = styled.div`
  display: flex;
  background: white;
  border: 1px solid #bebebe;
  border-radius: 24px;
  overflow: hidden;

  button {
    background: transparent;
    border: none;
    padding: 0.5rem 1.2rem;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;

    &.active {
      background: var(--color-black);
      color: white;

      svg {
        fill: white;
      }
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
  }
`;

interface ConcertListHeaderProps {
  resultCount: number;
}

export const ConcertListHeader = ({ resultCount }: ConcertListHeaderProps) => {
  const { t } = useI18n();

  return (
    <ListHeader>
      <Title>
        {t("artistPage.menu.concerts")}
        <span>• {t("common.results", { count: resultCount })}</span>
      </Title>
      <ViewControls role="group" aria-label="Concert view options">
        <button type="button" className="active" aria-pressed="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Calendar view is not available yet"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#767676" aria-hidden="true">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
          </svg>
        </button>
      </ViewControls>
    </ListHeader>
  );
};
