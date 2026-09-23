const DEFAULT_TITLE = 'Damargaleri Organizer — Wedding Planner'
const DEFAULT_DESCRIPTION = 'Wedding planner digital untuk membantu persiapan pernikahan bersama Damargaleri Organizer.'

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function replaceMeta(html, attribute, key, value) {
  const escaped = escapeHtml(value)
  const pattern = new RegExp(`<meta\\s+${attribute}=["']${key}["'][^>]*>`, 'i')
  const tag = `<meta ${attribute}="${key}" content="${escaped}" />`
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n  </head>`)
}

async function getProjectMetadata(env, slug) {
  const supabaseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return null

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_project_share_metadata`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_slug: slug }),
    })
    if (!response.ok) return null
    const rows = await response.json()
    return Array.isArray(rows) ? rows[0] ?? null : rows
  } catch {
    return null
  }
}

export async function onRequest(context) {
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''
  if (context.request.method !== 'GET' || !contentType.includes('text/html')) return response

  const url = new URL(context.request.url)
  const slug = url.pathname.replace(/^\/+|\/+$/g, '').split('/')[0]
  const isProjectPage = Boolean(slug && slug !== 'admin')
  const fallbackImage = `${url.origin}/damargaleri-organizer-logo.png`

  let title = DEFAULT_TITLE
  let description = DEFAULT_DESCRIPTION
  let image = fallbackImage

  if (isProjectPage) {
    const project = await getProjectMetadata(context.env, slug)
    if (project) {
      const couple = `${project.bride_name} & ${project.groom_name}`
      title = `${couple} — Damargaleri Organizer`
      description = `Wedding planner digital untuk pernikahan ${couple}, dikelola oleh Damargaleri Organizer.`
      image = project.cover_image_url || fallbackImage
    }
  }

  let html = await response.text()
  html = replaceMeta(html, 'property', 'og:title', title)
  html = replaceMeta(html, 'property', 'og:description', description)
  html = replaceMeta(html, 'property', 'og:image', image)
  html = replaceMeta(html, 'property', 'og:url', url.href)
  html = replaceMeta(html, 'name', 'description', description)
  html = replaceMeta(html, 'name', 'twitter:title', title)
  html = replaceMeta(html, 'name', 'twitter:description', description)
  html = replaceMeta(html, 'name', 'twitter:image', image)

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}
