import React from 'react';
import styled from 'styled-components';
import { WelcomePanel } from './components/WelcomePanel';
import { AuthForm } from './components/AuthForm';

const AuthBackground = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f1f2f4; /* Subtle gray bg from the screenshot body */
`;

const AuthCard = styled.div`
  display: flex;
  width: 920px;
  min-height: 650px;
  max-width: 95vw;
  background-color: var(--color-white);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
`;

export const AuthPage = () => {
  return (
    <AuthBackground>
      <AuthCard>
        <WelcomePanel />
        <AuthForm />
      </AuthCard>
    </AuthBackground>
  );
};
