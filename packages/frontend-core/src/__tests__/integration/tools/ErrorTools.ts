import { screen } from '@testing-library/react'

export interface GlobalError {
  title: string
  message: string
  element: HTMLElement
}

/**
 * Find the global error on page.
 *
 * Checks for:
 * 1. Our custom DefaultErrorComponent (role="alert" with "Ooops!")
 * 2. TanStack Router's built-in error boundary ("Something went wrong!")
 *
 * Throws with page content dump if no error is found — makes debugging easier.
 */
export function getGlobalError(): GlobalError {
  // Check our custom error component first
  const alertElement = screen.queryByRole('alert')
  if (alertElement) {
    const messageEl = alertElement.querySelector('i')
    return {
      title: 'Ooops!',
      message: messageEl?.textContent ?? alertElement.textContent,
      element: alertElement,
    }
  }

  // Check TanStack Router's built-in error boundary
  const bodyText = document.body.textContent
  if (bodyText.includes('Something went wrong')) {
    const codeEl = document.querySelector('code')
    const errorContainer =
      document.querySelector('[style*="padding"]') ?? document.body
    return {
      title: 'Something went wrong!',
      message: codeEl?.textContent ?? bodyText,
      element: errorContainer as HTMLElement,
    }
  }

  // No error found — dump page for debugging
  const body = document.body.innerHTML
  const snippet = body.length > 2000 ? body.slice(0, 2000) + '...' : body
  throw new Error(
    `No global error found on page. Expected a role="alert" or "Something went wrong" element.\n\nPage content:\n${snippet}`,
  )
}
