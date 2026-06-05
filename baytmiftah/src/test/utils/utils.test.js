import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  formatDate,
  validators,
  truncateText,
  debounce,
  storage,
} from '../../utils'

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('formats number as currency', () => {
      expect(formatCurrency(1000)).toMatch(/AED.*1,000/)
      expect(formatCurrency(1000000)).toMatch(/AED.*1,000,000/)
    })

    it('handles zero', () => {
      expect(formatCurrency(0)).toMatch(/AED.*0/)
    })

    it('handles null', () => {
      expect(formatCurrency(null)).toBe('AED 0')
    })
  })

  describe('formatNumber', () => {
    it('formats millions', () => {
      expect(formatNumber(1000000)).toBe('1.0M')
      expect(formatNumber(2500000)).toBe('2.5M')
    })

    it('formats thousands', () => {
      expect(formatNumber(1000)).toBe('1.0K')
      expect(formatNumber(5000)).toBe('5.0K')
    })

    it('returns regular number for small values', () => {
      expect(formatNumber(999)).toBe('999')
    })
  })

  describe('validators', () => {
    describe('email', () => {
      it('validates correct email', () => {
        expect(validators.email('test@example.com')).toBe('')
      })

      it('rejects invalid email', () => {
        expect(validators.email('invalid-email')).not.toBe('')
      })
    })

    describe('password', () => {
      it('validates strong password', () => {
        expect(validators.password('SecurePass123')).toBe('')
      })

      it('rejects short password', () => {
        expect(validators.password('short')).toContain('at least 8')
      })

      it('rejects password without uppercase', () => {
        expect(validators.password('lowercase123')).toContain('uppercase')
      })

      it('rejects password without number', () => {
        expect(validators.password('NoNumbers')).toContain('number')
      })
    })

    describe('required', () => {
      it('validates non-empty string', () => {
        expect(validators.required('value')).toBe('')
      })

      it('rejects empty string', () => {
        expect(validators.required('')).not.toBe('')
      })

      it('rejects whitespace', () => {
        expect(validators.required('   ')).not.toBe('')
      })
    })

    describe('phone', () => {
      it('validates phone number', () => {
        expect(validators.phone('+971501234567')).toBe('')
        expect(validators.phone('050 123 4567')).toBe('')
      })

      it('rejects invalid phone', () => {
        expect(validators.phone('invalid')).not.toBe('')
      })
    })
  })

  describe('truncateText', () => {
    it('truncates long text', () => {
      const text = 'This is a very long text that should be truncated'
      expect(truncateText(text, 10)).toBe('This is a ...')
    })

    it('does not truncate short text', () => {
      const text = 'Short'
      expect(truncateText(text, 10)).toBe('Short')
    })

    it('uses default length', () => {
      const text = 'a'.repeat(150)
      expect(truncateText(text)).toContain('...')
    })
  })

  describe('debounce', () => {
    it('delays function execution', async () => {
      vi.useFakeTimers()
      const callback = vi.fn()
      const debounced = debounce(callback, 100)

      debounced()
      debounced()
      debounced()

      expect(callback).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalledOnce()

      vi.useRealTimers()
    })
  })

  describe('storage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('sets and gets value', () => {
      storage.set('key', 'value')
      expect(storage.get('key')).toBe('value')
    })

    it('handles objects', () => {
      const obj = { name: 'John', age: 30 }
      storage.set('user', obj)
      expect(storage.get('user')).toEqual(obj)
    })

    it('removes value', () => {
      storage.set('key', 'value')
      storage.remove('key')
      expect(storage.get('key')).toBeNull()
    })

    it('returns default value for missing key', () => {
      expect(storage.get('missing', 'default')).toBe('default')
    })

    it('clears all values', () => {
      storage.set('key1', 'value1')
      storage.set('key2', 'value2')
      storage.clear()
      expect(storage.get('key1')).toBeNull()
      expect(storage.get('key2')).toBeNull()
    })
  })
})
