/**
 * index.js — Application entry point.
 *
 * 1. Boots the WhatsApp client (shows QR code for first-time auth).
 * 2. Once authenticated & ready, starts the Express REST API on port 3000.
 * 3. Session is persisted locally via LocalAuth — no QR scan needed on restart.
 */
const WhatsAppClient = require('./src/whatsapp-client');
const startServer = require('./src/server');

const PORT = parseInt(process.env.PORT, 10) || 3000;

// ── Prevent Puppeteer execution-context crashes from killing the process ──
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('Execution context was destroyed')) {
    console.warn('[Main] Puppeteer execution context destroyed (navigation race) — ignoring.');
    return;
  }
  console.error('[Main] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (msg.includes('Execution context was destroyed') ||
      msg.includes('Protocol error') ||
      msg.includes('Target closed') ||
      msg.includes('Session closed')) {
    console.warn('[Main] Suppressed Puppeteer transient error:', msg);
    return;
  }
  console.error('[Main] Unhandled rejection:', reason);
});

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║        WhatsApp Web API — Local Wrapper           ║');
  console.log('║  REST API · Media Download · Session Persistence  ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const wa = new WhatsAppClient();

  // Start the HTTP server immediately so /status is always reachable.
  // Protected endpoints will return 503 until the client is ready.
  const server = startServer(wa, PORT);

  wa.on('ready', () => {
    console.log('[Main] WhatsApp client ready — all API endpoints are now live.\n');
  });

  wa.on('disconnected', (reason) => {
    console.error('[Main] Client disconnected:', reason);
    console.log('[Main] Attempting to re-initialize…');
    setTimeout(() => wa.initialize().catch(console.error), 5000);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Main] Received ${signal} — shutting down…`);
    try {
      await wa.client.destroy();
    } catch { /* ignore */ }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Boot the WhatsApp client
  await wa.initialize();
}

main().catch((err) => {
  console.error('[Main] Fatal error:', err);
  process.exit(1);
});
