import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-vitest",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
};

export default config;
