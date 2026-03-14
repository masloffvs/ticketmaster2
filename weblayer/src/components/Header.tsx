import { Link } from "react-router-dom";
import styled from "styled-components";

const HeaderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const UtilityBar = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 48px;
  padding: 0 2rem;
  background-color: var(--color-black);
  color: var(--color-white);
  font-size: 0.9rem;
  gap: 2rem;
`;

const CountrySelect = styled.button`
  background: transparent;
  border: none;
  color: var(--color-white);
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 0.6rem;
  font-family: inherit;
  font-weight: 500;
  padding: 0;
  margin-right: auto;

  &:hover {
    text-decoration: underline;
  }
`;

const UtilNav = styled.nav`
  ul {
    list-style: none;
    display: flex;
    margin: 0;
    padding: 0;
    gap: 1.5rem;
  }
  li {
    display: flex;
    align-items: center;
  }
  a {
    display: flex;
    align-items: center;
    color: var(--color-white);
    text-decoration: none;
    gap: 0.4rem;
    font-weight: 500;

    svg {
      fill: currentColor;
    }

    &:hover {
      text-decoration: underline;
    }
  }
`;

const PayPalAd = styled.a`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 1rem;
  background-color: rgba(255, 255, 255, 0.05); /* Легкий фон у PayPal кнопки *//
  margin-right: -2rem; /* Компенсируем паддинг контейнера, чтобы упиралось в край */
  
  img {
    height: 18px;
    opacity: 0.9;
  }
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const MainHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--color-header-blue); /* Основной синий TM */
  color: var(--color-white);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const Logo = styled(Link)`
  font-size: 1.8rem;
  font-weight: 800;
  font-style: italic;
  cursor: pointer;
  color: var(--color-white);
  text-decoration: none;
  letter-spacing: -0.5px;
`;

const NavLinks = styled.nav`
  display: flex;
  gap: 1.5rem;

  a {
    color: var(--color-white);
    text-decoration: none;
    font-weight: 600;
    font-size: 1.05rem;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
`;

const SignInOutButton = styled(Link)`
  background: transparent;
  border: none;
  color: var(--color-white);
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const Header = () => {
  return (
    <HeaderWrapper>
      <UtilityBar>
        <CountrySelect title="United States" aria-expanded="false">
          <svg
            fill="none"
            viewBox="0 0 512 512"
            width="1.2em"
            height="1.2em"
            aria-hidden="true"
          >
            <path
              fill="#FFF"
              d="M503.2 322.8c5.7-21.3 8.8-43.7 8.8-66.8l-8.8-66.8a254.6 254.6 0 0 0-28.8-66.8l-59-66.7A255 255 0 0 0 256 0h-.2A255 255 0 0 0 96.6 55.7l-59 66.7a254.6 254.6 0 0 0-28.8 66.8L0 256v.1c0 23 3 45.4 8.8 66.7l28.8 66.8a257.3 257.3 0 0 0 59 66.7L256 512l159.4-55.7a257.3 257.3 0 0 0 59-66.7z"
            />
            <path
              fill="#D80027"
              d="M503.2 189.2c5.7 21.3 8.8 43.7 8.8 66.8H0c0-23.1 3-45.5 8.8-66.8zM415.4 55.7a257.3 257.3 0 0 1 59 66.7H37.6a257.3 257.3 0 0 1 59-66.7zm59 333.9c12.6-20.6 22.4-43 28.8-66.8H8.8a254.6 254.6 0 0 0 28.8 66.8zm-59 66.7H96.6A255 255 0 0 0 255.8 512h.4a255 255 0 0 0 159.2-55.7"
            />
            <path fill="#084ede" d="M0 245.6A256 256 0 0 1 256 0v256H0z" />
            <path
              fill="#FFF"
              fillRule="evenodd"
              d="M109.5 46a256 256 0 0 1 26.2-16l1 3h27.8L142 49.2l8.7 26.6L128 59.5l-22.6 16.4 8.6-26.6zm-80 90.4c6-11.1 12.7-21.8 20.1-32l3.8 11.7h28l-22.7 16.4 8.7 26.6-22.6-16.4L22.2 159l7.4-22.7Zm181.7-130 8.6 26.5h28L225 49.3l8.7 26.6-22.6-16.4-22.6 16.4 8.7-26.6L174.7 33h27.9l8.6-26.5ZM128 89.6l8.6 26.5h28l-22.7 16.4 8.7 26.6-22.6-16.4-22.6 16.4 8.6-26.6-22.5-16.4h27.9zm91.8 26.5-8.6-26.5-8.6 26.5h-28l22.7 16.4-8.7 26.6 22.6-16.4 22.6 16.4-8.7-26.6 22.6-16.4zm-175 56.7 8.6 26.5h28l-22.7 16.4 8.7 26.6-22.6-16.4-22.6 16.4 8.7-26.6-22.6-16.4h27.9zm91.8 26.5-8.6-26.5-8.6 26.5h-28l22.6 16.4-8.6 26.6 22.6-16.4 22.6 16.4-8.7-26.6 22.6-16.4zm74.6-26.5 8.6 26.5h28L225 215.7l8.7 26.6-22.6-16.4-22.6 16.4 8.7-26.6-22.6-16.4h27.9l8.6-26.5Z"
              clipRule="evenodd"
            />
          </svg>
          <span aria-hidden="true">US</span>
        </CountrySelect>

        <UtilNav aria-label="Additional Links">
          <ul>
            <li>
              <Link to="/#hotels">
                <svg
                  viewBox="0 0 24 24"
                  width="1.2em"
                  height="1.2em"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M18.5 10H17V7.22L16.1 6H7.9L7 7.22V10H5.5V4.58l.74-1.08h11.52l.74 1.08zM17 11.5h3.38l1.12 1.12v4.88h-19v-4.88l1.12-1.12zM15.5 10h-7V7.72l.16-.22h6.68l.16.22zM4 4.11V10H3l-2 2v10h1.5v-3h19v3H23V12l-2-2h-1V4.11L18.55 2H5.45z"></path>
                </svg>
                Hotels
              </Link>
            </li>
            <li>
              <Link to="/sell">Sell</Link>
            </li>
            <li>
              <Link to="/giftcards">
                <svg
                  viewBox="0 0 24 24"
                  width="1.2em"
                  height="1.2em"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M1 3.25h22v14.32l-3.08 3.18H1zm1.5 1.5v4.64H4v-2.3l1.56-1.03 2.19 1.9V4.74zm4.62 4.64L5.5 7.99v1.4zm2.13-4.64v3.6l2.7-2.29L13.5 7.1v2.29h8V4.75zM12 9.39v-1.4l-1.66 1.4zm-5.13 1.5H2.5v8.36h5.25v-6.82l-2.09 3.92-1.32-.7zm2.38 8.36h10.03l2.22-2.3V10.9H10.13l2.53 4.76-1.32.7-2.09-3.92z"></path>
                </svg>
                Gift Cards
              </Link>
            </li>
            <li>
              <Link to="/help">Help</Link>
            </li>
            <li>
              <Link to="/vip">VIP</Link>
            </li>
          </ul>
        </UtilNav>

        <PayPalAd
          href="https://www.paypal.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://uk.tmconst.com/rc-51677358/images/ads/paypal_small.svg"
            alt="PayPal Preferred Payments Partner"
          />
        </PayPalAd>
      </UtilityBar>

      {/* Основная шапка (пока без поисковой формы) */}
      <MainHeader>
        <HeaderLeft>
          <Logo to="/">ticketmaster®</Logo>
          <NavLinks>
            <Link to="/#concerts">Concerts</Link>
            <Link to="/#sports">Sports</Link>
            <Link to="/#arts">Arts, Theater & Comedy</Link>
            <Link to="/#family">Family</Link>
            <Link to="/#cities">Cities</Link>
          </NavLinks>
        </HeaderLeft>

        <HeaderRight>
          <SignInOutButton to="/as/authorization.oauth2">
            <svg
              viewBox="0 0 24 24"
              width="1.4em"
              height="1.4em"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <title>User account</title>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
            Sign In/Register
          </SignInOutButton>
        </HeaderRight>
      </MainHeader>
    </HeaderWrapper>
  );
};
