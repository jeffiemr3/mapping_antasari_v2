import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PickerView from './components/PickerView.jsx'

// Routing super-sederhana berbasis hash (bukan React Router) supaya tidak
// perlu konfigurasi rewrite apapun di hosting (Vercel dkk selalu serve
// index.html yang sama, hash cuma diproses di browser). Link operator
// berbentuk https://.../#/picker/KODE -> render PickerView (read-only,
// mobile-first) alih-alih App (dispatcher) penuh.
function Root() {
  const hash = window.location.hash // "#/picker/AB12C"
  const match = hash.match(/^#\/picker\/([A-Za-z0-9]+)$/)
  if (match) {
    return <PickerView code={match[1].toUpperCase()} />
  }
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
