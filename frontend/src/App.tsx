import { useEffect, useState, useCallback } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket';
import './App.css'

import { socket } from './socket';


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

function App() {

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("");
  const [speech, setSpeech] = useState<speechData[]>([]);
  const [summaries, setSummaries] = useState<summaryData[]>([]);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
      setStatus("");
    }

    function onStatusChange(data: { status: string }) {
      setStatus(data.status);
    }

    function onAllSpeechData(data: speechData[]) {
      setSpeech(data);
    }

    function onAllSummaryData(data: summaryData[]) {
      setSummaries(data);
    }

    socket.onAny((event, ...args) => {
      console.log("socket event:", event, args);
    });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('status', onStatusChange);
    socket.on('all_speech', onAllSpeechData);
    socket.on('all_summaries', onAllSummaryData);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('status', onStatusChange);
      socket.off('all_speech', onAllSpeechData);
      socket.off('all_summaries', onAllSummaryData);
    };
  }, []);

  return (
    <>
      <div className="content">

        <div className='card'>
          <h2>Status</h2>
          <span className={connected ? "connected" : "not-connected"}>• {connected ? "Connected" : "Not connected"}</span>
          <span>• {status}</span>
        </div>

        <div className="split">

          <div className='card'  >
            <h2>Speech</h2>
            <div className="col">
              {speech.slice().reverse().map((item, index) => (
                <div key={index} className="card">
                  <span>{item.timestamp}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className='card' >
            <h2>Summary</h2>
            <div className="col">
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

      </div>
    </>
  )
}

export default App
