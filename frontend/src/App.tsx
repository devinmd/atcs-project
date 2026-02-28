import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {

  const [speech, setSpeech] = useState<any[]>([{ text: "hello world", timestamp: "2026" }])
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResource = async (path: string, setter: (data: any[]) => void) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/${path}`)
      if (!res.ok) {
        throw new Error("Failed to fetch")
      }
      const data = await res.json()
      console.log(data)
      setter(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([
        fetchResource("speech", setSpeech),
        fetchResource("summaries", setSummaries),
      ])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="content">
      <h1>Hello</h1>
      {loading && <h2>Loading</h2>}
      {error && <h2 style={{ color: "red" }}>Error</h2>}

      <div className='split'>
        <div className='col card'  >
          <h2>Speech</h2>
          <div></div>
          {speech.slice().reverse().map((item, index) => (
            <div key={index} className="card">
              <span>{item.timestamp}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
        <div className='col card' >
          <h2>Summary</h2>
          <div></div>
          {summaries.slice().reverse().map((item, index) => (
            <div key={index} className="card">
              <span>{item.timestamp}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default App
