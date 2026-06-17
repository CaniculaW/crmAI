import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules\/(react|react-dom|react-router-dom)\//
            },
            {
              name: "antd-vendor",
              test: /node_modules\/(antd|@ant-design|rc-|@rc-component)\//
            },
            {
              name: "icon-vendor",
              test: /node_modules\/lucide-react\//
            }
          ]
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
