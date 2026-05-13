import { RouterProvider } from 'react-router-dom'
import { router } from './routes.tsx'

export default function App() {
  return <RouterProvider router={router} />
}
