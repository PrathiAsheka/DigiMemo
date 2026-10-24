"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { createTranslator } from "./translator";

const LocaleContext = createContext<Locale>("en");

/** Makes the request's language available to client components. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useT() {
  const locale = useContext(LocaleContext);
  return useMemo(() => createTranslator(locale), [locale]);
}
