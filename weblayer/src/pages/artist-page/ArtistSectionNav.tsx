import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import type { MenuItemKey } from "./constants";

const StickyNav = styled.nav`
  position: sticky;
  top: 0;
  background-color: var(--color-white);
  border-bottom: 1px solid #e2e8f0;
  z-index: 100;
  display: flex;
  justify-content: center;
`;

const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 2rem;
  display: flex;
  max-width: 1200px;
  width: 100%;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const NavItem = styled.li`
  display: flex;
`;

const NavButton = styled.button<{ $active?: boolean }>`
  padding: 1.5rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: ${(props) => (props.$active ? "var(--color-black)" : "#767676")};
  border: none;
  border-bottom: 3px solid
    ${(props) => (props.$active ? "var(--color-black)" : "transparent")};
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s;
  background: transparent;
  font-family: inherit;

  &:hover {
    color: var(--color-black);
  }
`;

interface ArtistSectionNavProps {
  activeTab: MenuItemKey;
  items: readonly MenuItemKey[];
  onSelect: (item: MenuItemKey) => void;
}

export const ArtistSectionNav = ({
  activeTab,
  items,
  onSelect,
}: ArtistSectionNavProps) => {
  const { t } = useI18n();

  return (
    <StickyNav aria-label="Artist sections">
      <NavList>
        {items.map((item) => (
          <NavItem key={item}>
            <NavButton
              id={`${item}-nav-item`}
              type="button"
              $active={activeTab === item}
              aria-current={activeTab === item ? "location" : undefined}
              aria-controls={item}
              onClick={() => onSelect(item)}
            >
              {t(`artistPage.menu.${item}`)}
            </NavButton>
          </NavItem>
        ))}
      </NavList>
    </StickyNav>
  );
};
