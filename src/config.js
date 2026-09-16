export async function loadConfig() {
  const response = await fetch(new URL('../config.json?v=20260916-opitdev-toe-1', import.meta.url), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar config.json (${response.status})`);
  }
  return response.json();
}
