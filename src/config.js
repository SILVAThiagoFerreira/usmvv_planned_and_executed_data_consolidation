export async function loadConfig() {
  const response = await fetch(new URL('../config.json', import.meta.url), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar config.json (${response.status})`);
  }
  return response.json();
}
