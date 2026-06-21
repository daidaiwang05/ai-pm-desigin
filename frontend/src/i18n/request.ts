import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the locale is supported
  const safeLocale = locales.includes(locale as any) ? locale : defaultLocale;

  return {
    messages: (await import(`./locales/${safeLocale}.json`)).default,
  };
});
