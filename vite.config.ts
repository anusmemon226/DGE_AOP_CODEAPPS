import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), powerApps()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (normalizedId.includes('/node_modules/')) {
            if (normalizedId.includes('/xlsx/')) return 'excel'
            if (normalizedId.includes('/jspdf') || normalizedId.includes('/jspdf-autotable')) return 'pdf'
            if (normalizedId.includes('/lucide-react/')) return 'icons'
            if (normalizedId.includes('/@microsoft/power-apps')) return 'powerapps'
            return 'vendor'
          }

          if (normalizedId.includes('/src/generated/')) return 'dataverse-generated'
          if (normalizedId.includes('/src/pages/editActivity/')) return 'edit-activity-support'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
