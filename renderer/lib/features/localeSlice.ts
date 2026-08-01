import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** Locales with translations. Add one here and in lib/i18n/index.ts together. */
export type Locale = 'en' | 'es';

interface LocaleState {
  locale: Locale;
}

const initialState: LocaleState = {
  locale: 'en',
};

const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
  },
});

export const { setLocale } = localeSlice.actions;
export default localeSlice.reducer;
