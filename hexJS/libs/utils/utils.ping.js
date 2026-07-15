import ping from "ping";

export async function net() {
  const res = await ping.promise.probe("8.8.8.8", {
    timeout: 1,
    extra: ["-c", "1"],
  });
  if (res.alive) {
    return `${res.time} ms`;
  }
  return "offline";
}
