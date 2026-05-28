// @ts-nocheck
// HERS365 Sports Data Service
import fetch from "node-fetch";
import { db } from "./db";
import { eq, and, like } from "drizzle-orm";
import * as schema from "./schema";

const MAXPREPS_API = "https://api.maxpreps.com";
const SPORT_SLUG = "girls-flag-football";

const DEFAULT_TIMEOUT = 10000;
const SYNC_INTERVAL_MS = 15 * 60 * 1000;

