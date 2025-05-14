import express from "express";
import { JsonWebToken } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }

  namespace NodeJs {
    interface ProcessEnv {
      JWT_SECRET: string;
    }
  }
}
