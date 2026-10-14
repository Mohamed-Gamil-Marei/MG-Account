import { checkEntityAccess } from "./src/server/access";
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { GoogleGenAI } from "@google/genai";
import { etaMiddleware } from "./server/etaMiddleware.ts";
import { whatsappServerEngine } from "./server/whatsappServerEngine.ts";
import helmet from "helmet";

dotenv.config();

export async function createApp() {
  const app = express();
