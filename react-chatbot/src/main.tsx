// import { StrictMode } from 'react' // Temporarily disabled to prevent duplicate API calls
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />,
)
import './styles/MessageInput.css'