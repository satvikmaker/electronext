import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '@/lib/features/counterSlice';
import themeReducer from '@/lib/features/themeSlice';
import ThemeToggle from '@/components/ThemeToggle';

function createMockStore() {
  return configureStore({
    reducer: { counter: counterReducer, theme: themeReducer },
  });
}

const meta: Meta<typeof ThemeToggle> = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <Provider store={createMockStore()}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};
