import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { 
  type User, 
  type InsertUser,
  type Score,
  type InsertScore,
  type EmailCapture,
  type InsertEmailCapture,
  users,
  scores,
  emailCaptures
} from "@shared/schema";
import { desc, eq, and } from "drizzle-orm";

const { Pool } = pg;

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Score methods
  createScore(score: InsertScore): Promise<Score>;
  getTopScores(limit: number): Promise<Score[]>;
  
  // Email capture methods
  captureEmail(email: InsertEmailCapture): Promise<EmailCapture>;
  
  deleteAllScores(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Score methods
  async createScore(insertScore: InsertScore): Promise<Score> {
    const existing = await db
      .select()
      .from(scores)
      .where(
        and(
          eq(scores.playerEmail, insertScore.playerEmail),
          eq(scores.score, insertScore.score),
          eq(scores.shotsTaken, insertScore.shotsTaken),
          eq(scores.shotsMade, insertScore.shotsMade)
        )
      );
    if (existing.length > 0) {
      return existing[0];
    }
    const result = await db.insert(scores).values(insertScore).returning();
    return result[0];
  }

  async getTopScores(limit: number = 10): Promise<Score[]> {
    return await db
      .select()
      .from(scores)
      .orderBy(desc(scores.score))
      .limit(limit);
  }

  // Email capture methods
  async captureEmail(insertEmail: InsertEmailCapture): Promise<EmailCapture> {
    const result = await db.insert(emailCaptures).values(insertEmail).returning();
    return result[0];
  }

  async deleteAllScores(): Promise<void> {
    await db.delete(scores);
  }
}

export const storage = new DatabaseStorage();
