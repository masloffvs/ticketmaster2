import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Checkbox } from '../../../design-system';

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

  return (
    <FormContainer>
      <Title>Sign In Or Create Account</Title>
      <Subtitle>If you don't have an account you will be prompted to create one.</Subtitle>

      <Input 
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder=""
      />

      <Button fullWidth disabled={!email.includes('@')}>
        Continue
      </Button>

      <Divider>Or</Divider>

      <Button variant="secondary" fullWidth>
        How To Add A Passkey
      </Button>

      <TermsText>
        <p>
          By continuing past this page, I acknowledge that I have read
          and agree to the current <a href="#">Terms of Use</a>, including the arbitration
          agreement and class action waiver, updated in August 2025,
          and understand that information will be used as described in
          our <a href="#">Privacy Policy</a>.
        </p>
        <p>
          As set forth in our Privacy Policy, we may use your information
          for email marketing, including promotions and updates on our
          own or third-party products. You can opt out of our marketing
          emails anytime.
        </p>
      </TermsText>
    </FormContainer>
  );
};
