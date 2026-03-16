import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";

const FiltersBox = styled.section`
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const FilterInputs = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 700px) {
    flex-direction: column;
  }
`;

const FilterGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-size: 0.85rem;
    color: #767676;
  }

  input,
  select {
    height: 48px;
    border: 1px solid #bebebe;
    border-radius: 4px;
    padding: 0 1rem;
    font-size: 1rem;
    outline: none;
    font-family: inherit;
  }
`;

interface ConcertFiltersProps {
  dateFilter: string;
  locationQuery: string;
  onDateFilterChange: (value: string) => void;
  onLocationQueryChange: (value: string) => void;
}

export const ConcertFilters = ({
  dateFilter,
  locationQuery,
  onDateFilterChange,
  onLocationQueryChange,
}: ConcertFiltersProps) => {
  const { t } = useI18n();

  return (
    <FiltersBox aria-label="Concert filters">
      <FilterInputs>
        <FilterGroup>
          <label htmlFor="concert-location-filter">{t("concertsList.location")}</label>
          <input
            id="concert-location-filter"
            type="text"
            value={locationQuery}
            placeholder={t("concertsList.cityOrZip")}
            onChange={(event) => onLocationQueryChange(event.target.value)}
          />
        </FilterGroup>
        <FilterGroup>
          <label htmlFor="concert-date-filter">{t("concertsList.dates")}</label>
          <select
            id="concert-date-filter"
            value={dateFilter}
            onChange={(event) => onDateFilterChange(event.target.value)}
          >
            <option value="all">{t("concertsList.allDates")}</option>
            <option value="weekend">{t("concertsList.thisWeekend")}</option>
          </select>
        </FilterGroup>
      </FilterInputs>
    </FiltersBox>
  );
};
