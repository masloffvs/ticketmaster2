import React from 'react';
import styled from 'styled-components';
import { useI18n } from '../../../i18n/I18nProvider';

const Panel = styled.div`
  width: 320px;
  background-color: var(--color-black);
  color: var(--color-white);
  padding: 3rem 2.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0; /* Prevent from shrinking */
`;

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Underline = styled.div`
  height: 4px;
  width: 100%;
  background-color: var(--color-header-blue);
  margin-top: 0.5rem;
  margin-bottom: 2rem;
`;

const Description = styled.p`
  font-size: 0.95rem;
  line-height: 1.5;
  font-weight: 500;
  margin: 0;
`;

const BottomLogo = styled.div`
  margin-top: auto;
  align-self: flex-end;
  font-family: 'Times New Roman', serif;
  font-size: 3rem;
  font-weight: bold;
  font-style: italic;
`;

export const WelcomePanel = () => {
  const { t } = useI18n();

  return (
    <Panel>
      <Title>{t('auth.welcome')}</Title>
      <Underline />
      <Description>
        {t('auth.welcomeDescription')}
      </Description>
      <BottomLogo>t</BottomLogo>
    </Panel>
  );
};
