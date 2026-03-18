import styled from "styled-components";

const Bar = styled.div`
  background: #048851;
  color: var(--color-white);
  padding: 0.5rem 1.5rem;
  font-size: 0.85rem;
  line-height: 1.4;
  cursor: pointer;

  strong {
    font-weight: 700;
    margin-right: 0.35rem;
  }

  &:hover {
    background: #037743;
  }

  @media (max-width: 640px) {
    padding: 0.7rem 1rem;
    font-size: 0.8rem;
    line-height: 1.5;
  }
`;

const MoreLink = styled.span`
  text-decoration: underline;
  margin-left: 0.25rem;
  font-weight: 600;
`;

interface EventInfoBarProps {
  label: string;
  text: string;
  onExpand?: () => void;
}

export const EventInfoBar = ({ label, text, onExpand }: EventInfoBarProps) => {
  const truncated = text.length > 160 ? `${text.substring(0, 160)}...` : text;

  return (
    <Bar
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => e.key === "Enter" && onExpand?.()}
    >
      <strong>{label}:</strong>
      {truncated}
      {text.length > 160 && <MoreLink>mer</MoreLink>}
    </Bar>
  );
};
