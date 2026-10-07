import { io } from "socket.io-client";
const [room, name = "Bot"] = process.argv.slice(2);
const s = io("http://localhost:3001", { transports: ["websocket"] });
let me = null;
s.on("connect", () => s.emit("room:join", { roomId: room, name, anonId: "bot-" + name, avatarId: "robot" }));
s.on("room:state", ({ room }) => { me = s.id; });
s.on("word:choices", ({ words }) => setTimeout(() => s.emit("word:choose", { word: words[0] }), 800));
s.on("turn:start", async ({ turn }) => {
  if (turn.drawerId !== s.id) { setTimeout(() => s.emit("chat:message", { text: "is it a cat?" }), 1500); return; }
  for (let k = 0; k < 6; k++) {
    const id = "st" + Date.now() + k;
    const pts = Array.from({ length: 40 }, (_, i) => ({ x: 0.2 + 0.6 * i / 40, y: 0.2 + 0.1 * k + 0.05 * Math.sin(i / 3), pressure: 0.5, t: i * 16 }));
    s.emit("draw:strokeStart", { strokeId: id, tool: k % 2 ? "brush" : "pencil", color: ["#000000", "#ef4444", "#3b82f6"][k % 3], size: 6 + k * 3, point: pts[0] });
    for (let i = 1; i < 40; i += 4) { s.emit("draw:strokePoint", { strokeId: id, points: pts.slice(i, i + 4) }); await new Promise(r => setTimeout(r, 16)); }
    s.emit("draw:strokeEnd", { strokeId: id });
  }
  const r = "rect" + Date.now();
  const rp = [[0.1,0.7],[0.4,0.7],[0.4,0.95],[0.1,0.95],[0.1,0.7]].map(([x,y])=>({x,y,pressure:0.5,t:0}));
  s.emit("draw:strokeStart", { strokeId: r, tool: "rect", color: "#22c55e", size: 8, point: rp[0] });
  s.emit("draw:strokePoint", { strokeId: r, points: rp });
  s.emit("draw:strokeEnd", { strokeId: r });
});
