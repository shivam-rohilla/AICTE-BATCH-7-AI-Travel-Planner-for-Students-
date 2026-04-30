import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:         resolve(__dirname, 'index.html'),
        planner:      resolve(__dirname, 'planner.html'),
        itinerary:    resolve(__dirname, 'itinerary.html'),
        destinations: resolve(__dirname, 'destinations.html'),
        budget:       resolve(__dirname, 'budget.html'),
      }
    }
  }
})
