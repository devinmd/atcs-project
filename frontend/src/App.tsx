import { useEffect, useState, useCallback } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket';
import './App.css'

import { io } from "socket.io-client";

interface speechData {
  timestamp: string;
  text: string;
  id: number;
  session_id: number;
}

interface summaryData {
  id: number;
  type: string;
  text: string;
  timestamp: string;
  session_id: number;
}

let socket = io("http://localhost:5500",
  { transports: ['websocket'] });
function App() {

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("");
  const [speech, setSpeech] = useState<speechData[]>([]);
  const [summaries, setSummaries] = useState<summaryData[]>([]);

  socket.on("connect", () => {
    console.log("connected to websocket");
    setConnected(true);
    socket.emit("get_all_speech");
    socket.emit("get_all_summaries");
  });

  socket.on("all_speech_data", (data) => {
    setSpeech(data);
  });
  socket.on("all_summaries", (data) => {
    setSummaries(data);
  });

  socket.on("app_status", (data) => {
    console.log(data);
    setStatus(data.app_status);
  });

  return (
    <>
      <div className="content">
        <h1>{connected ? "Connected" : "Not connected"}</h1>
        <h1>{status}</h1>

        <div className='split'>

          <div className='col card'  >
            <h2>Speech</h2>
            {speech.slice().reverse().map((item, index) => (
              <div key={index} className="card">
                <span>{item.timestamp}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className='col card' >
            <h2>Summary</h2>
            {summaries.slice().reverse().map((item, index) => (
              <div key={index} className="card">
                <span>{item.timestamp}</span>
                <span>{item.type}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

        </div>

      </div>
    </>
  )
}

export default App
