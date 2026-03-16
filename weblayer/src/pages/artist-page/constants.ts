export const MENU_ITEM_KEYS = [
  "concerts",
  "experience",
  "gallery",
  "about",
  "setlists",
  "faqs",
  "reviews",
  "fansAlsoViewed",
] as const;

export type MenuItemKey = (typeof MENU_ITEM_KEYS)[number];
