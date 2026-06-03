import { useEffect, useRef, useState } from "react";
import "./App.css";
import { socket } from "./socket";
import { formatDate, formatDateRelative, renderMarkdownBold } from "./helpers";

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

function App() {
  const date = new Date();
  const greeting = (() => {
    const hour = date.getHours();
    if (hour >= 4 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 18) return "Good Afternoon";
    return "Good Evening";
  })();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [queries, setQueries] = useState<queryData[]>([]);
  const [entities, setEntities] = useState<allEntities>({ todo: [], note: [] });
  const [entryInputValue, setEntryInputValue] = useState("");
  const [queryInputValue, setQueryInputValue] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [overviewStr, setOverviewStr] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  function getSortedEntities(items: entityData[]) {
    return [...items].sort((a, b) => {
      const priorityDiff = (b.priority_rank || 0) - (a.priority_rank || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  function getSortedTasks(items: entityData[]) {
    return [...items].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : Infinity;
      const dateB = b.date ? new Date(b.date).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      const priorityDiff = (b.priority_rank || 0) - (a.priority_rank || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  function getTaskGroups(items: entityData[]) {
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayAfterTomorrow = new Date(todayMid);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const nextWeekEnd = new Date(todayMid);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 8);

    const groups: { label: string; items: entityData[] }[] = [
      { label: "Urgent", items: [] },
      { label: "Soon", items: [] },
      { label: "Later", items: [] },
    ];

    getSortedTasks(items).forEach((item) => {
      const due = item.date ? new Date(item.date) : null;
      const dueMid = due ? new Date(due.getFullYear(), due.getMonth(), due.getDate()) : null;

      if (!dueMid || dueMid >= nextWeekEnd) {
        groups[2].items.push(item);
      } else if (dueMid >= dayAfterTomorrow) {
        groups[1].items.push(item);
      } else {
        groups[0].items.push(item);
      }
    });

    return groups.filter((group) => group.items.length > 0);
  }

  function deleteEntity(id: number) {
    // remove the entity from local state
    setEntities((prev) => {
      return {
        todo: (prev.todo || []).filter((e) => e.id !== id),
        note: (prev.note || []).filter((e) => e.id !== id),
      } as allEntities;
    });

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
    setQueries((prev) =>
      [
        {
          id: Date.now(),
          query: trimmed,
          response: null,
          created_at: new Date().toISOString(),
          session_id: 0,
        },
        ...prev,
      ].slice(0, 10),
    );
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

        return [{ id: Date.now(), query: data.query, response: data.response, created_at: new Date().toISOString(), session_id: 0 }, ...prev].slice(0, 10);
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

    // add to query list
    function onUpdateQueries(data: queryData) {
      setQueries((prev) => {
        const pendingIndex = prev.findIndex((item) => item.query === data.query && item.response === null);
        if (pendingIndex !== -1) {
          const next = [...prev];
          next[pendingIndex] = data;
          return next;
        }
        return [data, ...prev].slice(0, 10);
      });
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
    socket.on("all_queries", onAllQueries);
    socket.on("query_response", onQueryResponse);
    socket.on("all_entities", onAllEntities);
    socket.on("update_queries", onUpdateQueries);
    socket.on("update_entities", onUpdateEntities);
    socket.on("overview_response", onOverviewResponse);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("overview_response", onOverviewResponse);
      socket.off("status", onStatusChange);
      socket.off("all_queries", onAllQueries);
      socket.off("query_response", onQueryResponse);
      socket.off("all_entities", onAllEntities);
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

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "instant", block: "end" });
    }
  }, [queries]);

  const taskGroups = getTaskGroups(entities.todo);

  return (
    <>
      <div className="topnav">
        <img src="./wordmark.svg" alt="" />
        <div className="center">
          <input
          style={{
            height:"2rem"
          }}
            value={entryInputValue}
            onChange={(e) => setEntryInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendEntry(entryInputValue);
              }
            }}
            className="message-input"
            type="text"
            placeholder="Add a task, note, or idea..."
          />
          <button
            style={{ backgroundImage: `url(./${micOn ? "mic" : "mic-off"}.svg)`, backgroundColor: `${micOn ? "var(--orange)" : ""}` }}
            onClick={() => {
              toggleMic();
            }}
          ></button>
          <button className="accent" onClick={() => sendEntry(entryInputValue)} style={{ backgroundImage: "url(./arrow-up.svg)" }}></button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span className={connected ? "online" : "offline"}>• {connected ? "Connected" : "Not connected"}</span>
          {status.map((s, index) => (
            <span key={index} className={s.toLowerCase().replaceAll(" ", "-")}>
              • {s}
            </span>
          ))}
        </div>
      </div>
      <div className="main">
        <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>
          <div className="section">
            <h2>
              {greeting}, Today is {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h2>
            <div style={{ padding: "1rem", backgroundColor: "var(--bg-d1)", borderRadius: "1rem", minHeight: "4rem" }}>
              <p style={{ whiteSpace: "pre-wrap" }}>{overviewLoading ? "Loading..." : !connected ? "Not connected" : overviewStr ? renderMarkdownBold(overviewStr) : "No overview available"}</p>
            </div>
            <button
              className="small"
              onClick={() => {
                setOverviewLoading(true);
                socket.emit("generate_overview");
              }}
            >
              Generate New Overview
            </button>
          </div>

          <div className="section">
            <h2>Tasks</h2>
            <div
              className="col"
              style={{
                padding: "1rem",
                gap:"2rem",
                minHeight: "4rem",
                borderRadius: "1rem",
                backgroundColor: "var(--bg-d1)",
              }}
            >
              {!connected ? (
                <p>Not connected</p>
              ) : taskGroups.length === 0 ? (
                <p>No tasks</p>
              ) : (
                taskGroups.map((group) => (
                  <div key={group.label} className="col">
                    <h4>{group.label}</h4>
                    {group.items.map((item, index) => (
                      <div key={`${group.label}-${index}`} className="item">
                        <div>
                          <input type="checkbox" />
                        </div>
                        <div className="content">
                          {/* <p>{formatDate(item.created_at)}</p> */}
                          {/* <p className="priority-label">{item.priority_rank ?? 0}/5 Priority</p> */}
                          <button onClick={() => deleteEntity(item.id)} style={{ backgroundImage: "url(./trash.svg)", backgroundSize: "1rem", backgroundColor: "var(--red)" }}></button>
                          <p style={{ marginTop: "-0.25rem" }}>{item.content}</p>
                          <p style={{ fontSize: "0.875rem", color: "var(--text-light" }}>Due {formatDateRelative(item.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="section">
            <h2>Notes</h2>
            <div
              className="col"
              style={{
                padding: "1rem",
                borderRadius: "1rem",
                minHeight: "4rem",
                backgroundColor: "var(--bg-d1)",
              }}
            >
              {!connected ? (
                <p>Not connected</p>
              ) : getSortedEntities(entities.note).length === 0 ? (
                <p>No notes</p>
              ) : (
                getSortedEntities(entities.note).map((item, index) => (
                  <div key={index} className="item">
                    <div className="content">
                      <p style={{ fontSize: "0.875rem", color: "var(--text-light" }}>{formatDate(item.created_at)}</p>
                      <button style={{ backgroundImage: "url(./trash.svg)", backgroundSize: "1rem", backgroundColor: "var(--red)" }} onClick={() => deleteEntity(item.id)}></button>
                      <p>{item.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="section">
            <h2>Chat</h2>
            <div style={{ overflow: "auto", maxHeight: "70vh", backgroundColor: "var(--bg-d1)", borderRadius: "1rem", padding: "1rem", minHeight: "4rem" }}>
              {!connected ? (
                <p>Not connected</p>
              ) : queries.length === 0 ? (
                <p>No chats</p>
              ) : (
                <div className="col" style={{ gap: "2rem", paddingBottom: "8rem", backgroundColor: "var(--bg-d1)" }}>
                  {queries
                    .slice()
                    .reverse()
                    .map((item, index) => (
                      <div key={index} className="col" style={{ gap: "0.25rem" }}>
                        <p style={{ backgroundColor: "var(--accent)", padding: "0 0.5rem", borderRadius: "0.5rem", width: "fit-content" }}> {item.query} </p>
                        <p style={{ whiteSpace: "pre-wrap" }}>{item.response === null ? "Loading..." : renderMarkdownBold(item.response)}</p>
                      </div>
                    ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={queryInputValue}
                onChange={(e) => setQueryInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendQuery(queryInputValue);
                  }
                }}
                className="message-input"
                type="text"
                placeholder="What is due this week?"
              />
              <button style={{ backgroundImage: "url(./arrow-up.svg)" }} className="accent" onClick={() => sendQuery(queryInputValue)}></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
