import { RouterProvider } from 'react-router-dom'
import { router } from './routes.tsx'
import { ToastContainer } from '@/components/ui/Toast.tsx'
import ErrorBoundary from '@/components/ErrorBoundary.tsx'
import { useDevShortcuts } from '@/hooks/useDevShortcuts.ts'

export default function App() {
  useDevShortcuts()

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <ToastContainer />
    </ErrorBoundary>
  )
}
