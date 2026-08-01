import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './features/counterSlice';
import themeReducer from './features/themeSlice';
import localeReducer from './features/localeSlice';

/**
 * Build a fresh store. The app uses the singleton below; tests and Storybook
 * call this for an isolated instance, so adding a slice only means editing here.
 */
export function makeStore() {
  return configureStore({
    reducer: {
      counter: counterReducer,
      theme: themeReducer,
      locale: localeReducer,
    },
  });
}

export const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
