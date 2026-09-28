export function verifiedDatabaseUrl(connectionString) {
  const url = new URL(connectionString);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("Database URL must use postgres or postgresql protocol");
  }

  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  url.searchParams.set("sslmode", loopback ? "disable" : "verify-full");
  return url.toString();
}
