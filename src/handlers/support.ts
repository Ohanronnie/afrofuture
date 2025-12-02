import type { Message } from "whatsapp-web.js";
import { getHelpMessage } from "../messages/support.js";

export async function showHelpSupport(message: Message): Promise<void> {
  const msg = getHelpMessage();
  await message.reply(msg);
}
