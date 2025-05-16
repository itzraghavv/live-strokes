import WebSocket, { WebSocketServer } from "ws";
import jwt, { JsonWebTokenError, JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/be-common/config";
import { prismaClient } from "@repo/db/client";

const wss = new WebSocketServer({ port: 8080 });

interface User {
  ws: WebSocket;
  userId: string;
  rooms: string[];
}

const users: User[] = [];

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (typeof decoded == "string") return null;

    if (!decoded || !decoded.id) return null;

    return decoded.id;
  } catch (err) {
    console.log(err);
    return null;
  }
}

wss.on("connection", (ws, request) => {
  const url = request.url;

  if (!url) return;

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";

  const userId = checkUser(token);

  if (userId == null) {
    ws.close();
    return;
  }

  users.push({
    userId,
    rooms: [],
    ws,
  });

  ws.on("message", async (data) => {
    try {
      let parsedData;

      if (typeof data !== "string") {
        parsedData = JSON.parse(data.toString());
      } else {
        parsedData = JSON.parse(data);
      }

      if (parsedData.type === "join-room") {
        const user = users.find((u) => u.ws === ws);
        user?.rooms.push(parsedData.roomId);
      }

      if (parsedData.type === "leave-room") {
        const user = users.find((u) => u.ws === ws);

        if (!user) return;
        user.rooms = user.rooms.filter((u) => u !== parsedData.roomId);
      }

      if (parsedData.type === "chat") {
        const roomId = parsedData.roomId;
        const message = parsedData.message;

        try {
          await prismaClient.chat.create({
            data: {
              roomId,
              message,
              userId,
            },
          });
        } catch (err) {
          console.log(err, "Something went wrong, while chats");
        }

        users.forEach((user) => {
          if (user.rooms.includes(roomId)) {
            user.ws.send(
              JSON.stringify({
                type: "chat",
                message: message,
                roomId,
              })
            );
          }
        });
      }
    } catch (err) {
      console.log(err);
    }
  });
});
