import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja';

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
