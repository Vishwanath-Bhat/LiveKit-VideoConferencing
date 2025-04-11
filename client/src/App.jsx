import React, { useState, useEffect, useRef } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { io } from "socket.io-client";
import axios from "axios";
import "@livekit/components-styles";

function App() {
  const [token, setToken] = useState(null);
  const [url, setUrl] = useState(null);
  const [subtitle, setSubtitle] = useState("");
  const socketRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  useEffect(() => {
    let isMounted = true;
    const connectSocket = () => {
      const newSocket = io('https://localhost:3000', {
        transports: ['websocket'],
        secure: true,
        rejectUnauthorized: false,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on("connect", () => {
        if (isMounted) {
          console.log("Socket connected");
          setConnectionStatus("connected");
        }
      });

      newSocket.on("disconnect", (reason) => {
        if (isMounted) {
          console.log("Socket disconnected:", reason);
          setConnectionStatus("disconnected");
          if (reason === "io server disconnect") {
            // Try to reconnect after a delay
            setTimeout(connectSocket, 1000);
          }
        }
      });

      newSocket.on("connect_error", (err) => {
        if (isMounted) {
          console.error("Connection error:", err);
          setConnectionStatus("error");
          setTimeout(connectSocket, 2000); // Retry after 2 seconds
        }
      });

      newSocket.on("subtitle", (text) => {
        if (isMounted) {
          // console.log('Received subtitle:', text);
          setSubtitle(text);
        }
      });

      socketRef.current = newSocket;
    };

    const joinRoom = async () => {
      try {
        const res = await axios.post("https://localhost:3000/get-token", {
          identity: "user_" + Math.floor(Math.random() * 1000),
          room: "demo-room",
        });
        
        if (isMounted) {
          setToken(res.data.token);
          setUrl(res.data.url);
          connectSocket();
        }
      } catch (error) {
        console.error("Error joining room:", error);
        if (isMounted) setConnectionStatus("error");
      }
    };

    joinRoom();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("subtitle");
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (!token || !url) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        {connectionStatus === "error" ? (
          "Error connecting to server. Retrying..."
        ) : (
          "Joining room..."
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect={true}
        video={true}
        audio={true}
        data-lk-theme="default"
        style={{ height: "100%" }}
      >
        <VideoConference />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: 0,
            right: 0,
            margin: '0 auto',
            maxWidth: '80%',
            textAlign: "center",
            color: "white",
            fontSize: "1.5rem",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "1rem",
            borderRadius: "0.5rem",
            zIndex: 1000
          }}
        >
          {connectionStatus === "connected" ? subtitle : "Connecting to subtitle service..."}
        </div>
      </LiveKitRoom>
    </div>
  );
}

export default App;