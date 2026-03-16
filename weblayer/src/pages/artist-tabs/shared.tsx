import styled from "styled-components";

export const FullWidthDarkSection = styled.section`
  width: 100%;
  background-color: #111111;
  color: #fff;
  padding: 4rem 0;
`;

export const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
`;

export const SectionTitle = styled.h2`
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2rem;
  display: inline-block;

  &::before {
    content: "";
    display: block;
    width: 30px;
    height: 4px;
    background-color: currentColor;
    margin-bottom: 0.5rem;
  }
`;

export const SectionTitleLight = styled(SectionTitle)`
  color: #111;
`;

export const FullWidthLightSection = styled.section`
  width: 100%;
  background-color: #fff;
  color: #111;
  padding: 4rem 0;
`;

export const Grid = styled.div<{ $cols?: number; $gap?: string }>`
  display: grid;
  grid-template-columns: repeat(${(props) => props.$cols || 3}, minmax(0, 1fr));
  gap: ${(props) => props.$gap || "1.5rem"};

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ButtonPrimary = styled.button`
  background-color: #026cdf;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.8rem 1.5rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: #0150a7;
  }
`;

export const ButtonOutline = styled.button`
  background-color: transparent;
  color: #111;
  border: 1px solid #111;
  border-radius: 20px;
  padding: 0.8rem 2rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  margin: 2rem auto 0;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background-color: #f2f2f2;
  }
`;

export const TextLinkButton = styled.a`
  color: #026cdf;
  text-decoration: underline;
  font-size: 0.9rem;
`;
