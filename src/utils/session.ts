import type { UserSession } from "../types/session.js";
import { User } from "../models/User.js";
import { SESSION_STATES } from "../config/constants.js";

// Get or create user session
export async function getSession(
  chatId: string,
  userName: string = "Unknown"
): Promise<UserSession> {
  let user = await User.findOne({ chatId });

  if (!user) {
    user = await User.create({
      chatId,
      name: userName,
      session: {
        state: SESSION_STATES.WELCOME,
      },
    });
  }

  return user.session as UserSession;
}

// Update user session (merge updates into existing session)
export async function updateSession(
  chatId: string,
  updates: Partial<UserSession>
): Promise<UserSession> {
  let user = await User.findOne({ chatId });

  if (!user) {
    // Create if missing (fallback)
    user = await User.create({
      chatId,
      name: "Unknown",
      session: { state: SESSION_STATES.WELCOME, ...updates },
    });
    return user.session as UserSession;
  }

  user.session = { ...user.session, ...updates };
  user.markModified("session");
  await user.save();

  return user.session as UserSession;
}

// Clear user session
export async function clearSession(chatId: string): Promise<void> {
  await User.deleteOne({ chatId });
}

// Reset session to main menu (clears all previous state fields)
export async function resetToMainMenu(chatId: string): Promise<UserSession> {
  let user = await User.findOne({ chatId });

  if (!user) {
    user = await User.create({
      chatId,
      name: "Unknown",
      session: {
        state: SESSION_STATES.MAIN_MENU,
      },
    });
    return user.session as UserSession;
  }

  user.session = {
    state: SESSION_STATES.MAIN_MENU,
  };
  user.markModified("session");
  await user.save();

  return user.session as UserSession;
}
