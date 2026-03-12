import { useEffect, useState } from 'react'
import './App.css'

import { socket } from './socket';
import { relativeDateTime } from './helpers';

interface speechData {
  timestamp: string;
  text: string;
  id: number;
  session_id: number;
}

interface summaryResponse {
  type: string;
  data: summaryData[]
}

interface summaryData {
  id: number;
  type: string;
  text: string;
  timestamp: string;
  session_id: number;
}

interface appData {
  version: string,
  microphone: string,
  model: string
}

function App() {

  const date = new Date();

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Not connected");
  const [speech, setSpeech] = useState<speechData[]>([]);
  const [summaries, setSummaries] = useState<summaryData[]>([]);
  const [appData, setAppData] = useState<appData>();

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

    function onAllSummaryData(data: summaryResponse) {
      setSummaries(data.data);
    }
    function onAppData(data: appData) {
      setAppData(data);
    }

    socket.onAny((event, ...args) => {
      console.log("socket event:", event, args);
    });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('status', onStatusChange);
    socket.on('all_speech', onAllSpeechData);
    socket.on('all_summaries', onAllSummaryData);
    socket.on('app_data', onAppData);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('status', onStatusChange);
      socket.off('all_speech', onAllSpeechData);
      socket.off('all_summaries', onAllSummaryData);
      socket.off('app_data', onAppData);
    };
  }, []);

  return (
    <>
      <div className="topnav">
        <span>ATCS Project Dashboard</span>
        <span>{date.toDateString()}</span>
      </div>

      <div className="main">

        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className='card'>
            <div className="card-title">
              <h3>Welcome</h3>
            </div>
            <div className="card-content" style={{ display: "flex", gap: "0.5rem" }}>
              <input className='message-input' type="text" placeholder='Type a message here' />
              <button className='send-message'>Send</button>
            </div>
          </div>
          <div className="card">

            <div className="card-title">
              <h3>Title</h3>
            </div>
          </div>
        </div>

        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr 1fr", flexGrow: "1" }}>

          <div className='card' >
            <div className="card-title">
              <h3>Reminders & To-do</h3>
            </div>
            <div className="card-content">
              <div className="col" >
                {summaries.slice().reverse().map((item, index) => (
                  <div key={index} className="card">
                    <span>{relativeDateTime(item.timestamp)}</span>
                    <span>{item.type}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><h3>Notes & Summaries</h3></div>
            <div className="card-content"></div>
          </div>

          <div className="card">
            <div className="card-title"><h3>
              Other</h3></div>
            <div className="card-content"></div>
          </div>
        </div>

        <div className='card'  >
          <div className="card-title">
            <h3>Speech</h3>
          </div>
          <div className="card-content">
            <div className="col">
              {speech.slice().reverse().map((item, index) => (
                <div key={index}>
                  <span>{relativeDateTime(item.timestamp)}<br />{item.text}</span>
                  <span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div className="bottom-nav">
        <span className={connected ? "online" : "offline"}>• {connected ? "Connected" : "Not connected"}</span>
        {connected && (<span className={status.toString().toLowerCase().replaceAll(" ", '-')}>• {status ? status : "Not connected"}</span>)}
        {appData && (<>
          <span>v{appData.version}</span>
          <span>{appData.model}</span>
          <span>{appData.microphone}</span>
        </>)}
      </div>
    </>
  )
}

export default App
