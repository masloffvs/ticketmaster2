import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input } from '../../../design-system';
import { useI18n } from '../../../i18n/I18nProvider';

const FormContainer = styled.div`
  flex: 1;
  background-color: var(--color-white);
  padding: 3rem 4rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* in case of smaller screens */
`;

const Title = styled.h2`
  font-size: 1.3rem;
  font-weight: 800;
  margin-top: 0;
  margin-bottom: 1rem;
  text-transform: uppercase;
`;

const Subtitle = styled.p`
  font-size: 0.95rem;
  color: #333;
  margin-bottom: 2rem;
  line-height: 1.4;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: #333;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #bebebe;
  }

  &::before {
    margin-right: 1.5rem;
  }

  &::after {
    margin-left: 1.5rem;
  }
`;

const TermsText = styled.div`
  margin-top: 2rem;
  font-size: 0.7rem;
  color: #767676;
  line-height: 1.5;

  a {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;
    
    &:hover { 
      text-decoration: underline; 
    }
  }

  p {
    margin-bottom: 1rem;
  }
`;

export const AuthForm = () => {
  const [email, setEmail] = useState('');
  const { t } = useI18n();

  return (
    <FormContainer>
      <Title>{t('auth.title')}</Title>
      <Subtitle>{t('auth.subtitle')}</Subtitle>

      <Input 
        label={t('auth.emailAddress')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder=""
      />

      <Button fullWidth disabled={!email.includes('@')}>
        {t('auth.continue')}
      </Button>

      <Divider>{t('auth.or')}</Divider>

      <Button variant="secondary" fullWidth>
        {t('auth.addPasskey')}
      </Button>

      <TermsText>
        <p>
          {t('auth.termsIntro')} <a href="#">{t('auth.termsOfUse')}</a>, {t('auth.termsMiddle')} <a href="#">{t('auth.privacyPolicy')}</a>.
        </p>
        <p>
          {t('auth.marketing')}
        </p>
      </TermsText>
    </FormContainer>
  );
};
