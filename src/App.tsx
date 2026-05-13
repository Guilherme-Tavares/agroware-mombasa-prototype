import { RouterProvider } from 'react-router-dom'
import { router } from './routes.tsx'
import { ToastContainer } from '@/components/ui/Toast.tsx'

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  )
}
