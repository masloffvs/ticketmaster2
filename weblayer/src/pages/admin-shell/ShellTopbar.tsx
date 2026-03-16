import styled from "styled-components";

const Topbar = styled.header`
  height: 42px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  color: rgba(255, 255, 255, 0.88);
`;

const TopbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const Brand = styled.div`
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1;
`;

const ToggleSidebarButton = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: #101010;
  color: rgba(255, 255, 255, 0.76);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font: inherit;
  font-size: 0.92rem;

  &:hover {
    background: #151515;
    color: #fff;
  }
`;

const ProductTag = styled.div`
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 640px) {
    display: none;
  }
`;

interface ShellTopbarProps {
  activeItem: string;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
}

export const ShellTopbar = ({
  activeItem,
  isSidebarVisible,
  onToggleSidebar,
}: ShellTopbarProps) => {
  return (
    <Topbar>
      <TopbarLeft>
        <Brand>Shell</Brand>
        <ToggleSidebarButton
          type="button"
          aria-expanded={isSidebarVisible}
          aria-controls="admin-shell-sidebar"
          aria-label={isSidebarVisible ? "Hide navigation" : "Show navigation"}
          onClick={onToggleSidebar}
        >
          {isSidebarVisible ? "←" : "→"}
        </ToggleSidebarButton>
        <ProductTag>{activeItem || "Workspace"}</ProductTag>
      </TopbarLeft>
    </Topbar>
  );
};
