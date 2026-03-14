import React from 'react';
import styled from 'styled-components';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

const Wrapper = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  cursor: pointer;
  margin-bottom: 1.5rem;
`;

const StyledCheckbox = styled.input`
  appearance: none;
  background-color: #fff;
  margin: 0;
  margin-top: 0.15rem; /* align correctly with text */
  font: inherit;
  color: currentColor;
  min-width: 1.5rem;
  min-height: 1.5rem;
  border: 1px solid #bebebe;
  border-radius: 4px;
  display: grid;
  place-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &::before {
    content: "";
    width: 0.85em;
    height: 0.85em;
    transform: scale(0);
    transition: 120ms transform ease-in-out;
    background-color: white;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }

  &:checked {
    background-color: var(--color-black);
    border-color: var(--color-black);
  }

  &:checked::before {
    transform: scale(1);
  }
`;

const LabelText = styled.div`
  font-size: 0.85rem;
  color: #333;
  line-height: 1.4;
  a {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
    &:hover {
      text-decoration: underline;
    }
  }
`;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, ...props }, ref) => {
    return (
      <Wrapper>
        <StyledCheckbox type="checkbox" ref={ref} {...props} />
        <LabelText>{label}</LabelText>
      </Wrapper>
    );
  }
);
Checkbox.displayName = 'Checkbox';
