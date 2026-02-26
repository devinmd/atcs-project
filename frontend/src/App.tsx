import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {

  const [speech, setSpeech] = useState<any[]>([])
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    fetch("http://127.0.0.1:5000/speech")
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to fetch")
        }
        return res.json()
      })
      .then(data => {
        setSpeech(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
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
      {loading && <h2>Loading</h2>}
      {error && <h2>Error</h2>}

      <div className='split'>
        <div className='col' >
          <h2>Speech</h2>
          <div></div>
          {speech.map((item, index) => (
            <div key={index} className="card">
              {item.text}
            </div>
          ))}
        </div>
        <div className='col' >
          <h2>Summary</h2>
          <div></div>
          {summaries.map((item, index) => (
            <div key={index} className="card">
              {item.text}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default App
