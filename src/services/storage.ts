import type { UserSession } from "../types/session.js";

// In-memory session storage (use database in production)
export const userSessions = new Map<string, UserSession>();

// Storage operations
export const storage = {
  // Get session
  get(chatId: string): UserSession | undefined {
    return userSessions.get(chatId);
  },

  // Set session
  set(chatId: string, session: UserSession): void {
    userSessions.set(chatId, session);
  },

  // Delete session
  delete(chatId: string): boolean {
    return userSessions.delete(chatId);
  },

  // Check if session exists
  has(chatId: string): boolean {
    return userSessions.has(chatId);
  },

  // Get all sessions
  getAll(): Map<string, UserSession> {
    return userSessions;
  },

  // Clear all sessions
  clear(): void {
    userSessions.clear();
  },

  // Get session count
  count(): number {
    return userSessions.size;
  },
};
