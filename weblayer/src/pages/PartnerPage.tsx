import styled from "styled-components";
import { MailDashboard } from "../components/mail/MailDashboard";

const Page = styled.main`
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 24px 40px;
`;

const Header = styled.section`
  margin-bottom: 20px;
`;

const Eyebrow = styled.div`
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #475569;
`;

const Title = styled.h1`
  margin: 8px 0 0;
  font-size: 2rem;
  color: #0f172a;
`;

const Copy = styled.p`
  margin: 10px 0 0;
  max-width: 760px;
  color: #475569;
  line-height: 1.6;
`;

export const PartnerPage = () => {
  return (
    <Page>
      <Header>
        <Eyebrow>Partner</Eyebrow>
        <Title>Email Operations</Title>
        <Copy>
          Партнёрская страница для оценки работы почтового клиента: объём отправок,
          acceptance rate, ответы провайдера и последние ошибки по каждому письму.
        </Copy>
      </Header>
      <MailDashboard mode="partner" initialTab="activity" />
    </Page>
  );
};
