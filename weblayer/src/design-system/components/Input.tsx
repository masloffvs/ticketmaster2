import React from 'react';
import styled from 'styled-components';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  fullWidth?: boolean;
}

const InputWrapper = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
  width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label`
  font-size: 0.85rem;
  color: #333;
  margin-bottom: 0.4rem;
  font-weight: 500;
  display: flex;
  gap: 0.3rem;
`;

const StyledInput = styled.input<{ $hasError?: boolean }>`
  height: 48px;
  padding: 0 12px;
  border: 1px solid ${(props) => (props.$hasError ? '#d80027' : '#767676')}; /* TM uses dark gray outline */
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;

  &:focus {
    border-color: ${(props) => (props.$hasError ? '#d80027' : 'var(--color-primary)')};
    box-shadow: 0 0 0 1px ${(props) => (props.$hasError ? '#d80027' : 'var(--color-primary)')};
  }

  &::placeholder {
    color: #a9a9a9;
  }
`;

const ErrorText = styled.span`
  color: #d80027;
  font-size: 0.8rem;
  margin-top: 0.4rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, ...props }, ref) => {
    return (
      <InputWrapper $fullWidth={fullWidth}>
        <Label>
          {label}
          {props.required && <span style={{ color: '#d80027' }}>*</span>}
        </Label>
        <StyledInput ref={ref} $hasError={!!error} {...props} />
        {error && <ErrorText>♦ {error}</ErrorText>}
      </InputWrapper>
    );
  }
);
Input.displayName = 'Input';
