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

async function getProjectMetadata(slug) {
  try {
    const endpoint = new URL('https://wowosbdyhpxgwatrwlvo.supabase.co/functions/v1/share-metadata')
    endpoint.searchParams.set('slug', slug)
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    return await response.json()
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
    const project = await getProjectMetadata(slug)
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
