import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import styled from "styled-components";
import "./styles/global.less";

import { Header } from "./components/Header";
import { ArtistPage } from "./pages/ArtistPage";
import { EventPage } from "./pages/EventPage";
import { Home } from "./pages/Home";
import { AuthPage } from "./pages/Auth/AuthPage";

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const MainLayout = () => {
  return (
    <AppContainer>
      <Header />
      <Outlet /> {/* This will render the child routes */}
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
          <Route path=":eventSlug/event/:eventId" element={<EventPage />} />
        </Route>

        {/* Layout WITHOUT Header - specifically auth page */}
        <Route path="/as/authorization.oauth2" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
