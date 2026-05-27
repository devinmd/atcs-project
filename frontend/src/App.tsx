import { useEffect, useRef, useState } from "react";
import "./App.css";
import { socket } from "./socket";
import { formatDate } from "./helpers";

interface entryData {
  id: number;
  content: string;
  created_at: string;
  session_id: number;
}

interface queryData {
  id: number;
  query: string;
  response: string | null;
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
  version: string;
  microphone: string;
  model: string;
}

function App() {
  const date = new Date();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [entries, setEntries] = useState<entryData[]>([]);
  const [queries, setQueries] = useState<queryData[]>([]);
  const [entities, setEntities] = useState<allEntities>({ todo: [], note: [] });
  const [appData, setAppData] = useState<appData>();
  const [entryInputValue, setEntryInputValue] = useState("");
  const [queryInputValue, setQueryInputValue] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [overviewStr, setOverviewStr] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(false);

  function getSortedEntities(items: entityData[]) {
    return [...items].sort((a, b) => {
      const priorityDiff = (b.priority_rank || 0) - (a.priority_rank || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  function deleteEntity(id: number) {
    socket.emit("delete_entity", id);
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
      setQueries(data.slice(-10));
    }

    // receive query response
    function onQueryResponse(data: queryResponse) {
      setQueries((prev) => {
        let updated = false;
        const next = prev.map((item) => {
          if (!updated && item.query === data.query && !item.response) {
            updated = true;
            return { ...item, response: data.response };
          }
          return item;
        });

        if (updated) {
          return next;
        }

        return [...prev, { id: Date.now(), query: data.query, response: data.response, created_at: new Date().toISOString(), session_id: 0 }].slice(-10);
      });
    }

    // receive all entities
    function onAllEntities(data: entityResponse) {
      setEntities(
        (prev) =>
          ({
            ...prev,
            [data.type]: data.data,
          }) as allEntities,
      );
    }

    // receive app data
    function onAppData(data: appData) {
      setAppData(data);
    }

    // add to entry list
    function onUpdateEntries(data: entryData) {
      setEntries((prev) => [...prev, data]);
    }

    // add to query list
    function onUpdateQueries(data: queryData) {
      setQueries((prev) => [...prev, data].slice(-10));
    }

    // add to entity list
    function onUpdateEntities(data: entityData) {
      setEntities((prev) => {
        const key = data.type;
        return {
          ...prev,
          [key]: [...(prev[key] || []), data],
        };
      });
    }

    // on receive overview
    function onOverviewResponse(data: string) {
      console.log(data);
      setOverviewStr(data);
      setOverviewLoading(false);
    }

    socket.onAny((event, ...args) => {
      console.log("socket event:", event, args);
    });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("status", onStatusChange);
    socket.on("all_entries", onAllEntries);
    socket.on("all_queries", onAllQueries);
    socket.on("query_response", onQueryResponse);
    socket.on("all_entities", onAllEntities);
    socket.on("app_data", onAppData);
    socket.on("update_entries", onUpdateEntries);
    socket.on("update_queries", onUpdateQueries);
    socket.on("update_entities", onUpdateEntities);
    socket.on("overview_response", onOverviewResponse);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("overview_response", onOverviewResponse);
      socket.off("status", onStatusChange);
      socket.off("all_entries", onAllEntries);
      socket.off("all_queries", onAllQueries);
      socket.off("query_response", onQueryResponse);
      socket.off("all_entities", onAllEntities);
      socket.off("app_data", onAppData);
      socket.off("update_entries", onUpdateEntries);
      socket.off("update_queries", onUpdateQueries);
      socket.off("update_entities", onUpdateEntities);
      socket.offAny();
    };
  }, []);

  useEffect(() => {
    if (connected) {
      setOverviewLoading(true);
      socket.emit("generate_overview");
    }
  }, [connected]);

  return (
    <>
      <div className="topnav">
        <img src="./wordmark.svg" alt="" />
        <div className="center">
          <input value={entryInputValue} onChange={(e) => setEntryInputValue(e.target.value)} className="message-input" type="text" placeholder="Type data here" />
          <button
            style={{ backgroundImage: `url(./${micOn ? "mic" : "mic-off"}.svg)`, backgroundColor: `${micOn ? "var(--orange)" : ""}` }}
            onClick={() => {
              toggleMic();
            }}
          ></button>
          <button className="accent" onClick={() => sendEntry(entryInputValue)} style={{ backgroundImage: "url(./arrow-up.svg)" }}></button>
        </div>
      </div>
      <div className="main">
        <div className="section">
          <h2>Today is {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>
          <p>{overviewLoading ? "Loading..." : overviewStr}</p>
          <button
            className="small"
            onClick={() => {
              setOverviewLoading(true);
              socket.emit("generate_overview");
            }}
          >
            Generate Overview
          </button>
        </div>

        <div className="section">
          <h2>Chat</h2>
          <div style={{ overflow: "auto", maxHeight: "30vh" }}>
            {queries && (
              <div className="col">
                {queries.slice().map((item, index) => (
                  <div key={index}>
                    <span style={{ backgroundColor: "var(--bg-d1)", padding: "0.25rem 0.5rem", borderRadius: "0.5rem" }}> {item.query} </span>
                    <p> {item.response} </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input value={queryInputValue} onChange={(e) => setQueryInputValue(e.target.value)} className="message-input" type="text" placeholder="Type question here" />
            <button style={{ backgroundImage: "url(./arrow-up.svg)" }} className="accent" onClick={() => sendQuery(queryInputValue)}></button>
          </div>
        </div>

        <div className="section">
          <h2>Tasks</h2>
          {entities && (
            <div className="col">
              {getSortedEntities(entities.todo).map((item, index) => (
                <div key={index} className="item">
                  <div>
                    <input type="checkbox" />
                  </div>
                  <div className="content">
                    <p>{formatDate(item.created_at)}</p>
                    <p className="priority-label">{item.priority_rank ?? 0}/5 Priority</p>
                    <button onClick={() => deleteEntity(item.id)} style={{ backgroundImage: "url(./x.svg)", backgroundSize: "1rem" }}></button>
                    <p>{item.content}</p>
                    <p>Due: {item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="section">
          <h2>Notes</h2>
          {entities && (
            <div className="col">
              {getSortedEntities(entities.note).map((item, index) => (
                <div key={index} className="item">
                  <div className="content">
                    <span>{formatDate(item.created_at)}</span>
                    <button style={{ backgroundImage: "url(./x.svg)", backgroundSize: "1rem" }} onClick={() => deleteEntity(item.id)}></button>
                    <p>{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* <div className="bottom-nav">
        <span className={connected ? "online" : "offline"}>• {connected ? "Connected" : "Not connected"}</span>
        {status.map((s, index) => (
          <span key={index} className={s.toLowerCase().replaceAll(" ", "-")}>
            • {s}
          </span>
        ))}
        {appData && (
          <>
            <span>v{appData.version}</span>
            <span>{appData.model}</span>
            <span>{appData.microphone}</span>
          </>
        )}
      </div> */}
    </>
  );
}

export default App;
