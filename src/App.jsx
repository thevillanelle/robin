import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Robin from './pages/Robin'
import AuthCallback from './pages/AuthCallback'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Robin />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  )
}
