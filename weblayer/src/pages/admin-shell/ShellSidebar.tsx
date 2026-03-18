import styled from "styled-components";
import type { ShellNavGroup } from "../../repositories/shellNavbarRepository";

const Sidebar = styled.aside<{ $visible: boolean }>`
  min-height: calc(100vh - 52px);
  padding-top: 4px;
  overflow: auto;
  min-width: 0;
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
  transition: opacity 0.14s ease;

  @media (max-width: 900px) {
    position: fixed;
    top: 46px;
    left: 10px;
    bottom: 10px;
    width: min(248px, calc(100vw - 20px));
    padding: 8px 10px 12px;
    background: rgba(6, 6, 6, 0.98);
    border-radius: 10px;
    z-index: 20;
    transform: ${(props) =>
      props.$visible ? "translateX(0)" : "translateX(-112%)"};
    transition:
      transform 0.18s ease,
      opacity 0.14s ease;
  }
`;

const Search = styled.input`
  width: 100%;
  height: 28px;
  border: none;
  outline: none;
  border-radius: 6px;
  background: #121212;
  color: rgba(255, 255, 255, 0.88);
  padding: 0 10px;
  font: inherit;
  font-size: 0.76rem;

  &::placeholder {
    color: rgba(255, 255, 255, 0.28);
  }
`;

const NavSection = styled.section`
  margin-top: 12px;
`;

const NavSectionHeader = styled.div`
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.61rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.52);
  padding: 0 4px 0 2px;
`;

const GroupToggle = styled.button`
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.42);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  width: 18px;
  text-align: center;
`;

const NavItems = styled.ul<{ $open: boolean }>`
  display: ${(props) => (props.$open ? "flex" : "none")};
  flex-direction: column;
  gap: 1px;
  margin-top: 4px;
  padding: 0 0 0 10px;
  position: relative;
  list-style: none;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.08);
  }
`;

const NavItem = styled.button<{ $active?: boolean }>`
  min-height: 28px;
  border: none;
  border-radius: 4px;
  background: ${(props) => (props.$active ? "#151515" : "transparent")};
  color: ${(props) => (props.$active ? "#f4f4f4" : "rgba(255, 255, 255, 0.68)")};
  text-align: left;
  padding: 4px 8px 4px 10px;
  font: inherit;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  position: relative;
  width: 100%;

  ${(props) =>
    props.$active
      ? `
    &::before {
      content: "";
      position: absolute;
      left: -10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #2f7df6;
    }
  `
      : ""}

  &:hover {
    color: #fff;
    background: #111;
  }
`;

const SearchLabel = styled.label`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

interface ShellSidebarProps {
  activeItem: string;
  ariaLabel?: string;
  filteredGroups: ShellNavGroup[];
  isSidebarVisible: boolean;
  openGroups: Record<string, boolean>;
  searchId?: string;
  searchPlaceholder?: string;
  searchQuery: string;
  sidebarId?: string;
  onSearchChange: (value: string) => void;
  onSelectItem: (item: string) => void;
  onToggleGroup: (groupTitle: string) => void;
}

export const ShellSidebar = ({
  activeItem,
  ariaLabel = "Shell navigation",
  filteredGroups,
  isSidebarVisible,
  openGroups,
  searchId = "admin-shell-search",
  searchPlaceholder = "Find module...",
  searchQuery,
  sidebarId = "admin-shell-sidebar",
  onSearchChange,
  onSelectItem,
  onToggleGroup,
}: ShellSidebarProps) => {
  return (
    <Sidebar id={sidebarId} $visible={isSidebarVisible} aria-label={ariaLabel}>
      <SearchLabel htmlFor={searchId}>Find module</SearchLabel>
      <Search
        id={searchId}
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
      />

      {filteredGroups.map((group) => {
        const isOpen = Boolean(openGroups[group.title]) || Boolean(searchQuery);
        const groupId = `shell-group-${group.title.toLowerCase().replace(/\s+/g, "-")}`;

        return (
          <NavSection key={group.title}>
            <NavSectionHeader>
              <span>{group.title}</span>
              <GroupToggle
                type="button"
                aria-expanded={isOpen}
                aria-controls={groupId}
                aria-label={`Toggle ${group.title}`}
                onClick={() => onToggleGroup(group.title)}
              >
                {isOpen ? "⌄" : "›"}
              </GroupToggle>
            </NavSectionHeader>

            <NavItems id={groupId} $open={isOpen}>
              {group.items.map((item) => (
                <li key={item}>
                  <NavItem
                    type="button"
                    $active={item === activeItem}
                    aria-current={item === activeItem ? "page" : undefined}
                    onClick={() => onSelectItem(item)}
                  >
                    {item}
                  </NavItem>
                </li>
              ))}
            </NavItems>
          </NavSection>
        );
      })}
    </Sidebar>
  );
};
