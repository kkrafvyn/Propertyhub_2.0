import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button, Input, Select, Checkbox } from '../../components/UI'

describe('UI Components', () => {
  describe('Button', () => {
    it('renders button with text', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByText(/Click me/i)).toBeInTheDocument()
    })

    it('calls onClick handler', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)

      fireEvent.click(screen.getByText(/Click me/i))
      expect(handleClick).toHaveBeenCalledOnce()
    })

    it('applies variant class', () => {
      render(<Button variant="secondary">Button</Button>)
      expect(screen.getByText(/Button/i)).toHaveClass('btn-secondary')
    })

    it('disables when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByText(/Loading/i).closest('button')).toBeDisabled()
    })

    it('renders with icon', () => {
      render(<Button icon="favorite">Favorite</Button>)
      expect(screen.getByText('favorite')).toBeInTheDocument()
    })
  })

  describe('Input', () => {
    it('renders input field', () => {
      render(<Input type="text" />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('displays label', () => {
      render(<Input label="Email" />)
      expect(screen.getByText(/Email/i)).toBeInTheDocument()
    })

    it('shows error message', () => {
      render(<Input error="This field is required" />)
      expect(screen.getByText(/This field is required/i)).toBeInTheDocument()
    })

    it('shows required indicator', () => {
      render(<Input label="Email" required />)
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('updates value on change', () => {
      render(<Input type="text" />)
      const input = screen.getByRole('textbox')

      fireEvent.change(input, { target: { value: 'test' } })
      expect(input.value).toBe('test')
    })
  })

  describe('Select', () => {
    const options = [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
    ]

    it('renders select field', () => {
      render(<Select options={options} />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('renders options', () => {
      render(<Select options={options} />)
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('changes value on selection', () => {
      render(<Select options={options} />)
      const select = screen.getByRole('combobox')

      fireEvent.change(select, { target: { value: '1' } })
      expect(select.value).toBe('1')
    })
  })

  describe('Checkbox', () => {
    it('renders checkbox', () => {
      render(<Checkbox label="Accept" />)
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('displays label', () => {
      render(<Checkbox label="Accept Terms" />)
      expect(screen.getByText(/Accept Terms/i)).toBeInTheDocument()
    })

    it('toggles checked state', () => {
      render(<Checkbox label="Accept" />)
      const checkbox = screen.getByRole('checkbox')

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })
  })
})
