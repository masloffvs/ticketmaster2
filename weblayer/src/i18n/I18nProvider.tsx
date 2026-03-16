import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultLocale,
  translations,
  type Locale,
  type TranslationDictionary,
} from "./translations";

const STORAGE_KEY = "tm-weblayer-locale";

type TranslateParams = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslateParams) => string;
  getObject: <T>(key: string) => T;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const getNestedValue = (dictionary: TranslationDictionary, key: string) => {
  return key.split(".").reduce<unknown>((accumulator, segment) => {
    if (
      accumulator &&
      typeof accumulator === "object" &&
      segment in (accumulator as Record<string, unknown>)
    ) {
      return (accumulator as Record<string, unknown>)[segment];
    }

    return undefined;
  }, dictionary);
};

const interpolate = (template: string, params?: TranslateParams) => {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? `{{${token}}}` : String(value);
  });
};

const detectInitialLocale = (): Locale => {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ru") {
    return stored;
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith("ru") ? "ru" : defaultLocale;
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = translations[locale];

    return {
      locale,
      setLocale,
      t: (key, params) => {
        const match = getNestedValue(dictionary, key);
        if (typeof match !== "string") {
          return key;
        }

        return interpolate(match, params);
      },
      getObject: <T,>(key: string) => {
        const localValue = getNestedValue(dictionary, key);
        if (localValue !== undefined) {
          return localValue as T;
        }

        return getNestedValue(translations[defaultLocale], key) as T;
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
};
