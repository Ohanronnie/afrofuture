export function getWalletBalanceMessage(balance: number): string {
  return `💰 *AfroFuture Wallet Balance*

Your balance: GH₵${balance.toFixed(2)}

Choose how to use it:
1️⃣ AfroFuture 2026
2️⃣ AfroFuture Weekender
3️⃣ Donate to AfroFuture Foundation

Reply 1, 2, or 3.`;
}

export function getWalletTransferConfirmationMessage(
  amount: number,
  destination: string,
  isDonation: boolean
): string {
  const thankYouMessage = isDonation
    ? "🙏 Thank you for your generous donation to the AfroFuture Foundation!"
    : `🎉 Your balance is reserved for ${destination}. You'll be notified when tickets go on sale!`;

  return `✅ *Transfer Complete!*

💰 GH₵${amount.toFixed(2)} has been transferred to *${destination}*

${thankYouMessage}

Type *menu* to return to main menu.`;
}

export function getEmptyWalletMessage(): string {
  return "Your wallet balance is GH₵0.00\n\nType *menu* to see all options.";
}
