/** Reads server/.env when there is one (local use). On a host, set these values in its settings instead. */
try {
  process.loadEnvFile();
} catch {
  // No .env file: the host provides the settings.
}
