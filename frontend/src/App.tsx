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
      socket.emit("get_all_speech");
      socket.emit("get_all_summaries");
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onStatusChange(data: string) {
      console.log(data)
      setStatus(data);
    }

    function onAllSpeechData(data: speechData[]) {
      console.log(data)
      setSpeech(data);
    }

    function onAllSummaryData(data: summaryData[]) {
      console.log(data)
      setSummaries(data);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('app_status', onStatusChange);
    socket.on('all_speech', onAllSpeechData);
    socket.on('all_summaries', onAllSummaryData);


    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('app_status', onStatusChange);
      socket.off('all_speech', onAllSpeechData);
      socket.off('all_summaries', onAllSummaryData);

    };
  }, []);

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
