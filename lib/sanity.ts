// Lectura del catálogo de todopolis.online.
//
// El dataset `production` es público, así que basta la API HTTP de Sanity: sin
// token y sin el cliente de `next-sanity`. Es la MISMA fuente que usa la tienda,
// de modo que el juego nunca muestra un precio distinto al de la web.

const PROJECT_ID = process.env.SANITY_PROJECT_ID || 'whkjmhyp'
const DATASET = process.env.SANITY_DATASET || 'production'
const API_VERSION = 'v2024-01-01'

export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  opts: { revalidate?: number } = {}
): Promise<T> {
  const url = new URL(`https://${PROJECT_ID}.apicdn.sanity.io/${API_VERSION}/data/query/${DATASET}`)
  url.searchParams.set('query', query)
  url.searchParams.set('perspective', 'published')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v))

  const res = await fetch(url, { next: { revalidate: opts.revalidate ?? 600 } })
  if (!res.ok) throw new Error(`Sanity respondió ${res.status}`)
  const json = (await res.json()) as { result: T }
  return json.result
}
