import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given, magazine } from '@igstack/app-catalog-test-kit'

// Quick Jump (#143): paste an id on the app card, open the matching page.
describe('Quick Jump', () => {
  it('turns a typed id into a working link, one identity shown by default', async () => {
    const { ui } = await given(magazine.full())
    await ui.catalog.openApp('TaskFlow')

    // Default is the first identity only; the rest wait behind Configure.
    expect(screen.getByLabelText('Task Id')).toBeInTheDocument()
    expect(screen.queryByLabelText('Board Id')).not.toBeInTheDocument()
    expect(screen.getByText('Configure (1/2)')).toBeInTheDocument()

    // Both Task Id jumps are dead links until the input has a value.
    expect(screen.getAllByTitle('Fill in Task Id first')).toHaveLength(2)

    fireEvent.change(screen.getByLabelText('Task Id'), {
      target: { value: '  T-42 ' },
    })

    expect(screen.queryByTitle('Fill in Task Id first')).not.toBeInTheDocument()
    expect(
      screen.getByTitle('https://taskflow.example.com/task/T-42'),
    ).toHaveAttribute('target', '_blank')
    expect(
      screen.getByTitle('https://taskflow.example.com/task/T-42/history'),
    ).toBeInTheDocument()
  })
})
