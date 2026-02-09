import type { Preview } from "@storybook/nextjs-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import { handlers } from "../mocks/handlers";
import "../app/globals.css";

initialize();

const preview: Preview = {
  parameters: {
    msw: {
      handlers,
    },
  },
  loaders: [mswLoader],
  decorators: [
    (Story) => {
      // Reset compliance store between stories
      if (typeof window !== "undefined") {
        localStorage.removeItem("compliance-storage");
      }
      return <Story />;
    },
  ],
};

export default preview;
