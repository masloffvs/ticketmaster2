import type React from "react";
import styled, { css } from "styled-components";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "text";
  fullWidth?: boolean;
}

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-weight: 600;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  padding: 0.8rem 1.5rem;
  width: ${(props) => (props.fullWidth ? "100%" : "auto")};

  ${(props) =>
    props.variant === "primary" &&
    css`
      background-color: var(--color-primary);
      color: var(--color-white);
      border: 1px solid var(--color-primary);

      &:hover:not(:disabled) {
        background-color: var(--color-header-blue);
        border-color: var(--color-header-blue);
      }

      &:disabled {
        background-color: #f1f2f4;
        border-color: #f1f2f4;
        color: #767676;
        cursor: not-allowed;
      }
    `}

  ${(props) =>
    props.variant === "secondary" &&
    css`
      background-color: transparent;
      color: var(--color-primary);
      border: 1px solid var(--color-primary);

      &:hover:not(:disabled) {
        background-color: rgba(2, 108, 223, 0.05);
      }
    `}

  ${(props) =>
    props.variant === "text" &&
    css`
      background-color: transparent;
      color: var(--color-primary);
      border: none;
      padding: 0.5rem 1rem;

      &:hover:not(:disabled) {
        text-decoration: underline;
      }
    `}
`;

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      role="button"
      aria-disabled={props.disabled}
      {...props}
    />
  );
};
