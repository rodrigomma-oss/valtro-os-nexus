import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock global APIs if needed
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:8080',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true
});
