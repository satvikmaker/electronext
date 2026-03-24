import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '@/lib/features/counterSlice';
import themeReducer from '@/lib/features/themeSlice';
import Counter from '@/components/Counter';

function createMockStore() {
  return configureStore({
    reducer: { counter: counterReducer, theme: themeReducer },
  });
}

const meta: Meta<typeof Counter> = {
  title: 'Components/Counter',
  component: Counter,
  decorators: [
    (Story) => (
      <Provider store={createMockStore()}>
        <Story />
      </Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Counter>;

export const Default: Story = {};
