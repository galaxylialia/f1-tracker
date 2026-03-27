const BREAKPOINT = 1024

let currentHref = null
const panelRenderers = {}

export function registerPanelRenderer(page, fn) {
  panelRenderers[page] = fn
}

export function initPanel(listEl, panelEl) {
  if (!listEl || !panelEl) return

  listEl.addEventListener('click', e => {
    const link = e.target.closest('a[href]')
    if (!link) return
    const href = link.getAttribute('href')
    if (!href || href.startsWith('http') || href.startsWith('#')) return
    if (window.innerWidth < BREAKPOINT) return // mobile: normal navigation

    e.preventDefault()

    listEl.querySelectorAll('.active').forEach(el => el.classList.remove('active'))
    link.classList.add('active')

    loadPanel(href, panelEl)
  })
}

async function loadPanel(href, panelEl) {
  if (href === currentHref) return
  currentHref = href

  panelEl.classList.remove('hidden')
  showPanelSkeleton(panelEl)

  const basePage = href.split('?')[0]
  const params = new URLSearchParams(href.split('?')[1] || '')
  const renderer = panelRenderers[basePage]

  if (renderer) {
    try {
      panelEl.innerHTML = `<div class="split-panel-inner"></div>`
      await renderer(params, panelEl.querySelector('.split-panel-inner'))
    } catch (err) {
      panelEl.innerHTML = `<div class="split-panel-inner"><p class="text-2">加载失败：${err.message}</p></div>`
    }
  } else {
    // No renderer registered — show a prompt to navigate directly
    panelEl.innerHTML = `<div class="split-panel-inner" style="padding:24px;text-align:center">
      <p class="text-2" style="margin-bottom:12px">点击查看详情</p>
      <a href="${href}" style="font-size:13px;color:var(--color-accent)">在新页面打开 →</a>
    </div>`
  }
}

function showPanelSkeleton(panelEl) {
  panelEl.innerHTML = `<div class="split-panel-inner">
    <div class="skeleton skel-title" style="margin-bottom:16px"></div>
    <div class="skeleton skel-text" style="margin-bottom:8px"></div>
    <div class="skeleton skel-text-sm" style="margin-bottom:24px"></div>
    <div class="skeleton skel-row" style="margin-bottom:8px"></div>
    <div class="skeleton skel-row" style="margin-bottom:8px"></div>
    <div class="skeleton skel-row" style="margin-bottom:8px"></div>
    <div class="skeleton skel-row" style="margin-bottom:8px"></div>
  </div>`
}

export function closePanel(panelEl) {
  panelEl.classList.add('hidden')
  currentHref = null
}
