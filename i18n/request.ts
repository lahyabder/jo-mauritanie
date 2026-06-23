import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Use a switch statement to avoid dynamic import issues in Turbopack/Edge runtime
  let messages;
  switch (locale) {
    case 'fr':
      messages = (await import('../messages/fr.json')).default;
      break;
    case 'en':
      messages = (await import('../messages/en.json')).default;
      break;
    case 'ar':
    default:
      messages = (await import('../messages/ar.json')).default;
      break;
  }
 
  return {
    locale,
    messages
  };
});
