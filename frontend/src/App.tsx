import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {

  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("http://127.0.0.1:5000/summaries")
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to fetch")
        }
        return res.json()
      })
      .then(data => {
        setSummaries(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="content">
      <h1>Hello</h1>
      <h2>Recent</h2>
      {loading && <h2>Loading</h2>}
      {error && <h2>Error</h2>}

      <div className='summaries'>
        {summaries.map((item, index) => (
          <div key={index} className="summary-card">
            {item.text}
          </div>
        ))}
      </div>

    </div>
  )
}

export default App
