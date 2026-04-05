import { useEffect, useState } from 'react'
import './App.css'
import { socket } from './socket';
import { formatDate } from './helpers';

interface entryData {
  created_at: string;
  content: string;
  id: number;
  session_id: number;
}

interface entityResponse {
  type: EntityType;
  data: entityData[];
}

type EntityType = "todo" | "note" | "query_response";

interface entityData {
  id: number;
  type: EntityType;
  content: string;
  created_at: string;
  session_id: number;
}

interface entityResponse {
  type: EntityType;
  data: entityData[];
}

type allEntities = Record<EntityType, entityData[]>;
interface appData {
  version: string,
  microphone: string,
  model: string
}

function App() {

  const date = new Date();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [entries, setEntries] = useState<entryData[]>([]);
  const [entities, setEntities] = useState<allEntities>({ todo: [], note: [], query_response: [] });
  const [appData, setAppData] = useState<appData>();
  const [inputValue, setInputValue] = useState('');
  const [micOn, setMicOn] = useState(false);

  function processEntries() {
    socket.emit("process_entries", 10)
  }

  function deleteEntity(id: number) {
    socket.emit("delete_entity", id)
  }

  function toggleMic() {
    setMicOn(!micOn);
    socket.emit("toggle_mic", micOn)
  }

  function sendEntry(text: string) {
    setInputValue("")
    if (text.replaceAll(" ", "") == "")
      return
    socket.emit("receive_entry", text)
  }

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
      setStatus([]);
    }

    function onStatusChange(data: { status: string[] }) {
      setStatus(data.status);
    }

    function onAllEntries(data: entryData[]) {
      setEntries(data);
    }

    function onAllEntities(data: entityResponse) {
      setEntities(prev => ({
        ...prev,
        [data.type]: data.data
      } as allEntities));
    }

    function onAppData(data: appData) {
      setAppData(data);
    }

    function onUpdateEntries(data: entryData) {
      setEntries(prev => [...prev, data]);
    }

    function onUpdateEntities(data: entityData) {
      setEntities(prev => {
        const key = data.type;
        return {
          ...prev,
          [key]: [...prev[key], data]
        };
      });
    }

    socket.onAny((event, ...args) => {
      console.log("socket event:", event, args);
    });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('status', onStatusChange);
    socket.on('all_entries', onAllEntries);
    socket.on('all_entities', onAllEntities);
    socket.on('app_data', onAppData);
    socket.on("update_entries", onUpdateEntries);
    socket.on("update_entities", onUpdateEntities);


    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('status', onStatusChange);
      socket.off('all_entries', onAllEntries);
      socket.off('all_entities', onAllEntities);
      socket.off('app_data', onAppData);
      socket.off('update_entries', onUpdateEntries);
      socket.off('update_entities', onUpdateEntities);
      socket.offAny();
    };
  }, []);

  return (
    <>
      <div className="topnav">
        <span>AT CS Project Dashboard</span>
        <span>{date.toDateString()}</span>
      </div>
      <div className="main">
        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className='card'>
            <div className="card-title">
              <h3>Welcome</h3>
            </div>
            <div className="card-content" style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => { toggleMic() }}>{micOn ? "Turn off Microphone" : "Turn on Microphone"}</button>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className='message-input' type="text" placeholder='Type a message here' />
              <button className='btn-accent' onClick={() => sendEntry(inputValue)}>Send</button>
            </div>
          </div>
          <div className="card">
            <div className="card-title">
              <h3>Actions</h3>
            </div>
            <div className="card-content" style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => { processEntries() }}>Process</button>
            </div>
          </div>
        </div>
        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr", flexGrow: "1" }}>
          <div className='card' >
            <div className="card-title">
              <h3>Reminders & To-do</h3>
            </div>
            <div className="card-content">
              {entities && <div className="col" >
                {entities.todo.slice().reverse().map((item, index) => (
                  <div key={index} className="card" style={{ display: "flex", flexDirection: "row", gap: "1rem" }}>
                    <div style={{ paddingTop: "0.5rem", flexDirection: "column", display: "flex" }} >
                      <input type="checkbox" style={{ width: "1rem", height: "1rem", margin: 0 }} />
                      <button style={{ width: "1rem", height: "1rem", padding: "0" }} onClick={() => deleteEntity(item.id)}>X</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{formatDate(item.created_at)}</span>
                      <span>{item.content}</span>
                    </div>
                  </div>
                ))}
              </div>}
            </div>
          </div>
          <div className="card">
            <div className="card-title"><h3>Notes & Summaries</h3></div>
            <div className="card-content">
              {entities && <div className="col" >
                {entities.note.slice().reverse().map((item, index) => (
                  <div key={index} className="card">
                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                      <span>{formatDate(item.created_at)}</span>
                      <button style={{ width: "1rem", height: "1rem", padding: "0" }} onClick={() => deleteEntity(item.id)}>X</button>
                    </div>
                    <div>
                      <span>{item.content}</span>
                    </div>
                  </div>
                ))}
              </div>}
            </div>
          </div>
        </div>
        <div className='card'  >
          <div className="card-title">
            <h3>Log</h3>
          </div>
          <div className="card-content">
            <div className="col">
              {entries.slice().reverse().map((item, index) => (
                <div key={index}>
                  <span>{formatDate(item.created_at)}<br />{item.content}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="bottom-nav">
        <span className={connected ? "online" : "offline"}>• {connected ? "Connected" : "Not connected"}</span>
        {status.map((s, index) => (
          <span key={index} className={s.toLowerCase().replaceAll(" ", "-")}>• {s}</span>
        ))}
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
