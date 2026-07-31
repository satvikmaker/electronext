import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './features/counterSlice';
import themeReducer from './features/themeSlice';
import localeReducer from './features/localeSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    theme: themeReducer,
    locale: localeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
