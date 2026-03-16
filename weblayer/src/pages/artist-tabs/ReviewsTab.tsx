import { useState } from "react";
import styled from "styled-components";
import { useI18n } from "../../i18n/I18nProvider";
import { REVIEW_ITEMS } from "./content";
import { ButtonOutline, ButtonPrimary, ContentWrapper, FullWidthLightSection, SectionTitleLight } from "./shared";

const ReviewsHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #111;
  border-width: 4px;
  width: 100%;
  gap: 1rem;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const RatingBadgeSmall = styled.span`
  background-color: #111;
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-left: 1rem;

  svg {
    width: 12px;
    height: 12px;
    fill: #ffb400;
    margin-right: 4px;
  }
`;

const ReviewCard = styled.article`
  padding: 2rem 0;
  border-bottom: 1px solid #e2e8f0;

  .stars {
    color: #111;
    font-size: 1.2rem;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .title {
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 0.2rem;
  }

  .meta {
    color: #767676;
    font-size: 0.8rem;
    margin-bottom: 1rem;
  }

  .text {
    color: #333;
    font-size: 0.95rem;
    line-height: 1.5;
  }
`;

const VisibleResultCount = styled.span`
  font-size: 1.2rem;
  margin-left: 1rem;
  font-weight: 300;
`;

const INITIAL_REVIEW_COUNT = 2;

export const ReviewsTab = () => {
  const { t } = useI18n();
  const [visibleReviews, setVisibleReviews] = useState(INITIAL_REVIEW_COUNT);
  const reviews = REVIEW_ITEMS.slice(0, visibleReviews);
  const canLoadMore = visibleReviews < REVIEW_ITEMS.length;

  return (
    <FullWidthLightSection aria-labelledby="reviews-title">
      <ContentWrapper>
        <ReviewsHeaderRow>
          <div>
            <SectionTitleLight id="reviews-title" style={{ marginBottom: 0 }}>
              {t("artistTabs.reviewsTitle")}
            </SectionTitleLight>
            <VisibleResultCount>• 10000 RESULTS</VisibleResultCount>
            <RatingBadgeSmall aria-label="Average rating 4.7 out of 5">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              4.7
            </RatingBadgeSmall>
          </div>
          <ButtonPrimary type="button">{t("artistTabs.writeReview")}</ButtonPrimary>
        </ReviewsHeaderRow>

        {reviews.map((review) => (
          <ReviewCard key={review.meta}>
            <div className="stars" aria-label="5 out of 5 stars">
              ★★★★★
            </div>
            <div className="title">{review.title}</div>
            <div className="meta">{review.meta}</div>
            <div className="text">{review.text}</div>
          </ReviewCard>
        ))}

        {canLoadMore ? (
          <ButtonOutline
            type="button"
            onClick={() =>
              setVisibleReviews((current) =>
                Math.min(current + INITIAL_REVIEW_COUNT, REVIEW_ITEMS.length),
              )
            }
          >
            {t("common.loadMore")}
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 10l5 5 5-5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </ButtonOutline>
        ) : null}
      </ContentWrapper>
    </FullWidthLightSection>
  );
};
