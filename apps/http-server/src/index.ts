import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prismaClient } from "@repo/db/client";
import {
  CreateRoomSchema,
  SignInSchema,
  SignUpSchema,
} from "@repo/common/types";
import { JWT_SECRET } from "@repo/be-common/config";
import { AuthMiddleware } from "./middleware/auth";

const app = express();
app.use(express.json());

app.post("/api/v1/signup", async (req, res) => {
  try {
    const data = req.body;
    const { success } = SignUpSchema.safeParse(data);

    if (!success) {
      res.status(403).json({
        message: "Invalid Data",
      });
      return;
    }

    const hashedPass = await bcrypt.hash(data.password, 10);

    const user = await prismaClient.user.create({
      data: {
        username: data.username,
        password: hashedPass,
        name: data.name,
      },
    });

    res.json({
      message: `User Created ${user.id}`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something went wrong while Signup",
    });
  }
});

app.post("/api/v1/signin", async (req, res) => {
  try {
    const data = req.body;
    const { success } = SignInSchema.safeParse(data);

    if (!success) {
      res.status(403).json({
        message: "Invalid Data",
      });
      return;
    }

    const userFound = await prismaClient.user.findFirst({
      where: {
        username: data.username,
      },
    });

    if (!userFound) {
      res.status(403).json({ message: "User Not Found!" });
      return;
    }

    const passwordMatch = await bcrypt.compare(
      data.password,
      userFound.password
    );

    if (passwordMatch) {
      const token = jwt.sign(
        {
          id: userFound.id,
        },
        JWT_SECRET
      );

      res.json({
        token,
      });
    } else {
      res.status(403).json({
        message: "Invalid Password, Try Again",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(403).json({
      message: "Failed to SignIn",
    });
  }
});

app.post("/api/v1/create-room", AuthMiddleware, async (req, res) => {
  console.log("reache created room");
  try {
    const data = req.body;
    const parsedData = CreateRoomSchema.safeParse(data);

    if (!parsedData.success) {
      res.status(403).json({
        message: "Invalid Data",
      });
      return;
    }

    const userId = req.userId as string;

    const room = await prismaClient.room.create({
      data: {
        slug: parsedData.data.name,
        adminId: userId,
      },
    });

    res.json({
      roomId: room.id,
    });
  } catch (err) {
    console.log(err);
    res.status(403).json({
      message: "Failed to Create a Room",
    });
  }
});

app.get("/api/v1/chats/:roomId", AuthMiddleware, async (req, res) => {
  const roomId = Number(req.params.roomId);
  try {
    const chats = await prismaClient.chat.findMany({
      where: {
        roomId: roomId,
      },
      orderBy: { id: "desc" },
      take: 50,
    });

    res.json({
      chats,
    });
  } catch (err) {
    console.log(err);
    res.status(403).json({
      message: "Failed to get chats",
    });
  }
});

app.listen(3001);
