import { useMemo } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { getTranslator } from '@/lib/i18n';

/**
 * Returns a translation function `t(key, params?)` for the current locale.
 *
 * @example
 * const t = useTranslation();
 * return <h1>{t('app.title')}</h1>;
 */
export function useTranslation() {
  const locale = useAppSelector((state) => state.locale.locale);
  return useMemo(() => getTranslator(locale), [locale]);
}
