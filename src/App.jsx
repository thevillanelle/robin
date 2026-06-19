import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Robin from './pages/Robin'
import AuthCallback from './pages/AuthCallback'
import WealthDashboard from './pages/WealthDashboard'
import RitualwearDashboard from './pages/RitualwearDashboard'
import GlowUpDashboard from './pages/GlowUpDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Robin />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/app/wealth"    element={<WealthDashboard />} />
        <Route path="/app/wear"      element={<RitualwearDashboard />} />
        <Route path="/app/glowup"    element={<GlowUpDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
