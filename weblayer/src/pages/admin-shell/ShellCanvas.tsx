import styled from "styled-components";
import { EmailWidget } from "./EmailWidget";
import { EventInspectorWidget } from "./EventInspectorWidget";
import { LoggerWidget } from "./LoggerWidget";
import { ProxySegmentsWidget } from "./ProxySegmentsWidget";
import { ProxyTrafficWidget } from "./ProxyTrafficWidget";
import { RecentRequestsWidget } from "./RecentRequestsWidget";
import { TopologyWidget } from "./TopologyWidget";

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

interface ShellCanvasProps {
  activeItem: string;
}

export const ShellCanvas = ({ activeItem }: ShellCanvasProps) => {
  return (
    <CanvasWrap>
      <Canvas>
        <CanvasHeader>
          <span>{activeItem || "Workspace"}</span>
          <span>Shell canvas</span>
        </CanvasHeader>
        <CanvasSurface aria-label="Shell workspace canvas">
          {activeItem === "Proxy Traffic" && <ProxyTrafficWidget />}
          {activeItem === "Recent Requests" && <RecentRequestsWidget />}
          {activeItem === "Proxy Segments" && <ProxySegmentsWidget />}
          {activeItem === "Logger" && <LoggerWidget />}
          {activeItem === "Topology API" && <TopologyWidget />}
          {activeItem === "Event Inspector" && <EventInspectorWidget />}
          {activeItem === "Email" && <EmailWidget />}
        </CanvasSurface>
      </Canvas>
    </CanvasWrap>
  );
};
