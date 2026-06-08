import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.documentElement

root.classList.add('material-icons-loading')

if (document.fonts?.load) {
  Promise.race([
    document.fonts.load('24px "Material Symbols Outlined"'),
    new Promise((resolve) => setTimeout(() => resolve([]), 1200)),
  ])
    .then((fonts) => {
      root.classList.toggle('material-icons-ready', fonts.length > 0)
      root.classList.toggle('material-icons-fallback', fonts.length === 0)
    })
    .catch(() => {
      root.classList.add('material-icons-fallback')
    })
} else {
  root.classList.add('material-icons-fallback')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
