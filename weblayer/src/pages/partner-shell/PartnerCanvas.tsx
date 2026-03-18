import styled from "styled-components";
import type { PartnerSession } from "../../partner/binProtocol";
import { PartnerDomainsWidget } from "./PartnerDomainsWidget";
import { PartnerEventsWidget } from "./PartnerEventsWidget";
import { PartnerSessionWidget } from "./PartnerSessionWidget";
import { PartnerTopologyWidget } from "./PartnerTopologyWidget";

const CanvasWrap = styled.main`
  min-height: calc(100vh - 52px);
  padding-top: 2px;

  @media (max-width: 900px) {
    padding-top: 10px;
  }
`;

const Canvas = styled.section`
  min-height: calc(100vh - 58px);
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0)),
    #090909;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.015);
  padding: 12px;
`;

const CanvasHeader = styled.div`
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.72rem;
  padding: 0 2px 10px;
`;

const CanvasSurface = styled.div`
  min-height: calc(100vh - 108px);
  border-radius: 8px;
  background: #0a0a0a;
`;

interface PartnerCanvasProps {
  activeItem: string;
  session: PartnerSession;
  onLogout: () => void;
  onSessionChange: (session: PartnerSession) => void;
}

export const PartnerCanvas = ({
  activeItem,
  onLogout,
  onSessionChange,
  session,
}: PartnerCanvasProps) => {
  return (
    <CanvasWrap>
      <Canvas>
        <CanvasHeader>
          <span>{activeItem || "Workspace"}</span>
          <span>Partner workspace</span>
        </CanvasHeader>
        <CanvasSurface aria-label="Partner workspace canvas">
          {activeItem === "Session" && (
            <PartnerSessionWidget
              session={session}
              onLogout={onLogout}
              onSessionChange={onSessionChange}
            />
          )}
          {activeItem === "Domains" && <PartnerDomainsWidget session={session} />}
          {activeItem === "Events" && <PartnerEventsWidget session={session} />}
          {activeItem === "Topology" && (
            <PartnerTopologyWidget session={session} />
          )}
        </CanvasSurface>
      </Canvas>
    </CanvasWrap>
  );
};
