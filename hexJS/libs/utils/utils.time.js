export function now() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const date = `${day}/${month}`;
  const time = `${hours}:${minutes}`;
  return {date,time};
}
