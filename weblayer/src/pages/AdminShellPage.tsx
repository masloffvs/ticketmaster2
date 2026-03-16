import styled from "styled-components";
import { useNavbarShell } from "../hooks/useNavbarShell";
import { shellNavbarRepository } from "../repositories/shellNavbarRepository";
import { ShellCanvas } from "./admin-shell/ShellCanvas";
import { ShellSidebar } from "./admin-shell/ShellSidebar";
import { ShellTopbar } from "./admin-shell/ShellTopbar";

const shellGroups = shellNavbarRepository.getAll();

const ShellPage = styled.div`
  min-height: 100vh;
  background: #000;
  color: #f5f5f5;
  font-family: "Work Sans", Averta, Helvetica, Arial, sans-serif;
`;

const Layout = styled.div<{ $sidebarVisible: boolean }>`
  display: grid;
  grid-template-columns: ${(props) => (props.$sidebarVisible ? "158px 1fr" : "0 1fr")};
  gap: ${(props) => (props.$sidebarVisible ? "10px" : "0")};
  padding: 0 10px 10px;
  transition: grid-template-columns 0.18s ease, gap 0.18s ease;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const SidebarBackdrop = styled.button<{ $visible: boolean }>`
  display: none;

  @media (max-width: 900px) {
    display: ${(props) => (props.$visible ? "block" : "none")};
    position: fixed;
    inset: 42px 0 0;
    border: none;
    background: rgba(0, 0, 0, 0.38);
    z-index: 10;
    padding: 0;
    cursor: pointer;
  }
`;

export const AdminShellPage = () => {
  const {
    activeItem,
    closeSidebar,
    filteredGroups,
    isSidebarVisible,
    openGroups,
    searchQuery,
    setActiveItem,
    setSearchQuery,
    toggleGroup,
    toggleSidebar,
  } = useNavbarShell(shellGroups);

  return (
    <ShellPage>
      <ShellTopbar
        activeItem={activeItem}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={toggleSidebar}
      />

      <SidebarBackdrop
        type="button"
        aria-label="Close navigation"
        $visible={isSidebarVisible}
        onClick={closeSidebar}
      />

      <Layout $sidebarVisible={isSidebarVisible}>
        <ShellSidebar
          activeItem={activeItem}
          filteredGroups={filteredGroups}
          isSidebarVisible={isSidebarVisible}
          openGroups={openGroups}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectItem={setActiveItem}
          onToggleGroup={toggleGroup}
        />
        <ShellCanvas activeItem={activeItem} />
      </Layout>
    </ShellPage>
  );
};
