import { lazy, type ReactNode, Suspense } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import styled from "styled-components";
import "./styles/global.less";

import { Header } from "./components/Header";

const Home = lazy(() =>
  import("./pages/Home").then((module) => ({ default: module.Home })),
);
const ArtistPage = lazy(() =>
  import("./pages/ArtistPage").then((module) => ({
    default: module.ArtistPage,
  })),
);
const EventPage = lazy(() =>
  import("./pages/EventPage").then((module) => ({ default: module.EventPage })),
);
const AuthPage = lazy(() =>
  import("./pages/Auth/AuthPage").then((module) => ({
    default: module.AuthPage,
  })),
);
const AdminShellPage = lazy(() =>
  import("./pages/AdminShellPage").then((module) => ({
    default: module.AdminShellPage,
  })),
);

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const RouteFallback = styled.div`
  width: 100%;
  min-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #475569;
`;

const RouteLoader = () => {
  return <RouteFallback aria-live="polite">Loading...</RouteFallback>;
};

const LazyRoute = ({ children }: { children: ReactNode }) => {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
};

const MainLayout = () => {
  return (
    <AppContainer>
      <Header />
      <Suspense fallback={<RouteLoader />}>
        <Outlet />
      </Suspense>
    </AppContainer>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout WITH Header */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path=":artistSlug/artist/:artistId" element={<ArtistPage />} />
          <Route path="event/:eventId" element={<EventPage />} />
          <Route path=":eventSlug/event/:eventId" element={<EventPage />} />
          <Route path="event/:eventSlug/:eventId" element={<EventPage />} />
        </Route>

        {/* Layout WITHOUT Header - specifically auth page */}
        <Route
          path="/sign-in"
          element={
            <LazyRoute>
              <AuthPage />
            </LazyRoute>
          }
        />
        <Route
          path="/as/authorization.oauth2"
          element={
            <LazyRoute>
              <AuthPage />
            </LazyRoute>
          }
        />
        <Route
          path="/shell"
          element={
            <LazyRoute>
              <AdminShellPage />
            </LazyRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
