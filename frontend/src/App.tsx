import { useEffect, useState } from 'react'
import './App.css'
import { socket } from './socket';
import { formatDate } from './helpers';

interface entryData {
  id: number;
  content: string;
  created_at: string;
  session_id: number;
}

interface queryData {
  id: number;
  content: string;
  created_at: string;
  session_id: number;
}

interface queryResponse {
  query: string;
  response: string;
}

interface entityResponse {
  type: EntityType;
  data: entityData[];
}

type EntityType = "todo" | "note";

interface entityData {
  id: number;
  type: EntityType;
  content: string;
  status: string;
  date: string;
  priority_rank: number;
  created_at: string;
  session_id: number;
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
  const [queries, setQueries] = useState<queryData[]>([]);
  const [queryResponses, setQueryResponses] = useState<queryResponse[]>([]);
  const [entities, setEntities] = useState<allEntities>({ todo: [], note: [] });
  const [appData, setAppData] = useState<appData>();
  const [entryInputValue, setEntryInputValue] = useState('');
  const [queryInputValue, setQueryInputValue] = useState('');
  const [micOn, setMicOn] = useState(false);

  function getSortedEntities(items: entityData[]) {
    return [...items].sort((a, b) => {
      const priorityDiff = (b.priority_rank || 0) - (a.priority_rank || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  function getHighestPriority(items: entityData[]) {
    return items.reduce((max, item) => Math.max(max, item.priority_rank || 0), 0);
  }

  function deleteEntity(id: number) {
    socket.emit("delete_entity", id)
  }

  function toggleMic() {
    const nextValue = !micOn;
    setMicOn(nextValue);
    socket.emit("toggle_mic", nextValue);
  }

  function sendEntry(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setEntryInputValue("");
    socket.emit("receive_entry", trimmed);
  }

  function sendQuery(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setQueryInputValue("");
    socket.emit("receive_query", trimmed);
  }

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
      setStatus([]);
    }

    // status changes
    function onStatusChange(data: { status: string[] }) {
      setStatus(data.status);
    }

    // receive all entries
    function onAllEntries(data: entryData[]) {
      setEntries(data);
    }

    // receive all queries
    function onAllQueries(data: queryData[]) {
      setQueries(data);
    }

    // receive query response
    function onQueryResponse(data: queryResponse) {
      setQueryResponses(prev => [...prev, data]);
    }

    // receive all entities
    function onAllEntities(data: entityResponse) {
      setEntities(prev => ({
        ...prev,
        [data.type]: data.data
      } as allEntities));
    }

    // receive app data
    function onAppData(data: appData) {
      setAppData(data);
    }

    // add to entry list
    function onUpdateEntries(data: entryData) {
      setEntries(prev => [...prev, data]);
    }

    // add to query list
    function onUpdateQueries(data: queryData) {
      setQueries(prev => [...prev, data]);
    }

    // add to entity list
    function onUpdateEntities(data: entityData) {
      setEntities(prev => {
        const key = data.type;
        return {
          ...prev,
          [key]: [...(prev[key] || []), data]
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
    socket.on('all_queries', onAllQueries);
    socket.on('query_response', onQueryResponse);
    socket.on('all_entities', onAllEntities);
    socket.on('app_data', onAppData);
    socket.on("update_entries", onUpdateEntries);
    socket.on("update_queries", onUpdateQueries);
    socket.on("update_entities", onUpdateEntities);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('status', onStatusChange);
      socket.off('all_entries', onAllEntries);
      socket.off('all_queries', onAllQueries); socket.off('query_response', onQueryResponse); socket.off('all_entities', onAllEntities);
      socket.off('app_data', onAppData);
      socket.off('update_entries', onUpdateEntries);
      socket.off('update_queries', onUpdateQueries);
      socket.off('update_entities', onUpdateEntities);
      socket.offAny();
    };
  }, []);

  return (
    <>
      <div className="topnav">
        <span>AT CS Project Dashboard</span>
        <span>{date.toDateString()}</span>
        <button onClick={() => { toggleMic() }}>{micOn ? "Turn off Microphone" : "Turn on Microphone"}</button>
      </div>
      <div className="main">
        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="card">
            <div className="card-title">
              <h3>Welcome</h3>
            </div>
            <div className="card-content" style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", flexDirection: "row", width: "100%" }}>
                <input
                  value={entryInputValue}
                  onChange={(e) => setEntryInputValue(e.target.value)}
                  className='message-input' type="text" placeholder='Type context/data here' />
                <button className='btn-accent' onClick={() => sendEntry(entryInputValue)}>Capture Entry</button>
              </div>
            </div>
          </div>
          <div className='card'>
            <div className="card-title">
              <h3>Chat</h3>
            </div>
            <div className="card-content" style={{ display: "flex", gap: "1rem", flexDirection: "column", overflow: "hidden" }}>
              {queryResponses && <div className="col" style={{ overflow: "auto" }} >
                {queryResponses.slice().map((item, index) => (
                  <div key={index} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span style={{ backgroundColor: "var(--bg-l1)", padding: "0.25rem 0.5rem", borderRadius: "0.5rem" }} > {item.query} </span>
                    <span > {item.response} </span>
                  </div>
                ))}
              </div>}
              <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>

                <div style={{ display: "flex", gap: "0.5rem", flexDirection: "row" }}>
                  <input
                    value={queryInputValue}
                    onChange={(e) => setQueryInputValue(e.target.value)}
                    className='message-input' type="text" placeholder='Type question here' />
                  <button className='btn-accent' onClick={() => sendQuery(queryInputValue)}>Ask Query</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr", flexGrow: "1" }}>
          <div className='card' >
            <div className="card-title">
              <h3>To-do</h3>
            </div>
            <div className="card-content">
              {entities && <div className="col" >
                {getSortedEntities(entities.todo).map((item, index) => (
                  <div
                    key={index}
                    className={`card ${item.priority_rank === getHighestPriority(entities.todo) && item.priority_rank > 0 ? "priority-highlight" : ""}`}
                    style={{ display: "flex", flexDirection: "row", gap: "1rem" }}
                  >
                    <div style={{ paddingTop: "0.5rem", flexDirection: "column", display: "flex" }} >
                      <input type="checkbox" style={{ width: "1rem", height: "1rem", margin: 0 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                      <div style={{ display: "flex", flexDirection: "row", gap: "1rem", alignItems: "center", width: "100%" }}>
                        <span>{formatDate(item.created_at)}</span>
                        <span className="priority-label">{item.priority_rank ?? 0}/5 Priority</span>
                        <button style={{ width: "1.5rem", height: "1.5rem", padding: "0", marginLeft: "auto" }} onClick={() => deleteEntity(item.id)}>X</button>
                      </div>
                      <span>{item.content}</span>
                      <span>{item.date}</span>
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
                {getSortedEntities(entities.note).map((item, index) => (
                  <div
                    key={index}
                    className={`card ${item.priority_rank === getHighestPriority(entities.note) && item.priority_rank > 0 ? "priority-highlight" : ""}`}
                  >
                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                      <span>{formatDate(item.created_at)}</span>
                      <button style={{ width: "1rem", height: "1rem", padding: "0" }} onClick={() => deleteEntity(item.id)}>X</button>
                    </div>
                    <div>
                      <span className="priority-label">Priority: {item.priority_rank ?? 0}</span>
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
