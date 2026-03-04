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

let socket = io("http://localhost:5500",
  { transports: ['websocket'] });
function App() {

  const [connected, setConnected] = useState(false);
  const [speech, setSpeech] = useState<speechData[]>([]);


  socket.on("connect", () => {
    console.log("connected to websocket!");
    setConnected(true);
    socket.emit("get_all_speech");
  });

  socket.on("all_speech_data", (data) => {
    console.log("Speech:", data);
    setSpeech(data);
  });

  // socket.on("speech_chunk", (chunk) => {
  //   console.log("Realtime chunk:", chunk);
  // });

  return (
    <>
      <div className="content">
        <h1>{connected ? "Connected!" : "Not connected"}</h1>

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
          </div>

        </div>

      </div>
    </>
  )
}

export default App
