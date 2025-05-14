import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/be-common/config";
import { NextFunction, Request, Response } from "express";

export const AuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = await req.headers["authorization"]!;
  const decode = jwt.verify(token, JWT_SECRET) as JwtPayload;

  if (decode) {
    req.userId = decode.id;
    next();
  } else {
    res.status(403).json({
      message: "Unauthorized",
    });
  }
};
