/**
 * Records the real Scenar app for the demo film: one mp4 per clip in public/footage/, plus
 * src/footage.json with frame marks and element rects (in VIDEO pixels) for every clip.
 *
 *   node scripts/capture.mjs                    every clip
 *   CLIP=take2 node scripts/capture.mjs         one clip (comma-separated list works too)
 *   BASE=https://scenar.app node scripts/capture.mjs
 *
 * Needs playwright-core (default: video/.cache/capture/node_modules, override with PLAYWRIGHT),
 * Google Chrome (override with CHROME) and ffmpeg/ffprobe on PATH.
 *
 * Frames come from a CDP screencast (jpeg q92, every frame) and are resampled to a constant
 * 30fps by timestamp. Dead waits (LLM/report latency) are cut out; marks are remapped so they
 * stay accurate after the cut. The `live` clip stops at RevenueCat's checkout: no card data is
 * ever typed.
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const BASE = (process.env.BASE || 'http://localhost:3100').replace(/\/$/, '')
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PW = process.env.PLAYWRIGHT || path.join(ROOT, '.cache/capture/node_modules/playwright-core/index.mjs')
const OUT = path.join(ROOT, 'public/footage')
const TMP = path.join(ROOT, '.cache/frames')
const JSON_PATH = path.join(ROOT, 'src/footage.json')
const FPS = 30
const HEADLESS = process.env.HEADED ? false : true

const DESKTOP = { viewport: { width: 1600, height: 900 }, dpr: 2 }
const PHONE = { viewport: { width: 393, height: 852 }, dpr: 3 }

const TAKE2_MESSAGE =
  "Thanks Dana, I'm genuinely excited about the team. Based on market data for this role in the city, the range is $82k to $88k, so I'd be comfortable at $85,000. Is there flexibility on the base?"

const { chromium } = await import(pathToFileURL(PW).href)
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(TMP, { recursive: true })

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = () => Date.now() / 1000
const jitter = (a, b) => a + Math.random() * (b - a)

/* ------------------------------------------------------------------ */
/* Page overlays                                                        */
/* ------------------------------------------------------------------ */

/** A monochrome pointer + click ring. The OS cursor never appears in a screencast. */
const pointerScript = (touch) => `
(() => {
  const css = document.createElement('style')
  css.textContent = \`
    #__cur{position:fixed;left:0;top:0;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;
      background:#0a0a0a;box-shadow:0 0 0 2px rgba(255,255,255,.95),0 3px 10px rgba(0,0,0,.28);
      z-index:2147483647;pointer-events:none;opacity:0;transition:opacity .25s,transform .12s ease-out}
    #__cur.down{transform:scale(.72)}
    .__ring{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;
      border:2px solid rgba(10,10,10,.55);z-index:2147483646;pointer-events:none;
      animation:__ring .55s cubic-bezier(.16,1,.3,1) forwards}
    @keyframes __ring{from{transform:scale(.6);opacity:.9}to{transform:scale(3.4);opacity:0}}
  \`
  const dot = document.createElement('div'); dot.id = '__cur'
  const add = () => { if (!document.body) return; if (!css.isConnected) document.head.appendChild(css); if (!dot.isConnected && !${touch}) document.body.appendChild(dot) }
  document.addEventListener('DOMContentLoaded', add); add()
  window.__cur = { x: -50, y: -50 }
  window.__moveCursor = (x, y) => { add(); window.__cur = { x, y }; dot.style.opacity = '1'; dot.style.left = x + 'px'; dot.style.top = y + 'px' }
  window.__clickCursor = (x, y) => {
    add(); const p = x == null ? window.__cur : { x, y }
    dot.classList.add('down'); setTimeout(() => dot.classList.remove('down'), 150)
    const r = document.createElement('div'); r.className = '__ring'; r.style.left = p.x + 'px'; r.style.top = p.y + 'px'
    document.body.appendChild(r); setTimeout(() => r.remove(), 700)
  }
  window.__hideCursor = () => { dot.style.opacity = '0' }
})();
`

/** Hide the Next dev overlay and (unless asked) the floating RC inspector chip. */
const tidyScript = (keepChip) => `
(() => {
  const s = document.createElement('style')
  s.textContent = 'nextjs-portal,[data-nextjs-toast],[data-next-badge-root]{display:none!important}' +
    ${keepChip ? "''" : "'button[aria-label^=\"Open RevenueCat inspector\"]{display:none!important}'"} +
    'html{scrollbar-width:none}::-webkit-scrollbar{display:none}'
  const add = () => { if (document.head && !s.isConnected) document.head.appendChild(s) }
  document.addEventListener('DOMContentLoaded', add); add()
})();
`

/* ------------------------------------------------------------------ */
/* Browser + session                                                    */
/* ------------------------------------------------------------------ */

let browser
async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      executablePath: CHROME,
      headless: HEADLESS,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
    })
  }
  return browser
}

async function newSession({ phone = false, keepChip = false, init = [] } = {}) {
  const b = await getBrowser()
  const dev = phone ? PHONE : DESKTOP
  const ctx = await b.newContext({
    viewport: dev.viewport,
    deviceScaleFactor: dev.dpr,
    isMobile: phone,
    hasTouch: phone,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    permissions: ['microphone'],
    userAgent: phone
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
      : undefined,
  })
  await ctx.addInitScript(pointerScript(phone))
  await ctx.addInitScript(tidyScript(keepChip))
  for (const s of init) await ctx.addInitScript(s)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => log('   pageerror:', String(e).slice(0, 140)))
  const s = { ctx, page, phone, dpr: dev.dpr, vw: dev.viewport.width, vh: dev.viewport.height }
  return s
}

/* ------------------------------------------------------------------ */
/* Recording                                                            */
/* ------------------------------------------------------------------ */

/**
 * CDP screencast with wall-clock timestamps. `mark()` stores wall times, `rect()` stores boxes
 * (scaled to video pixels), `cut(from,to)` drops a stretch of dead time from the final clip.
 */
async function startRecording(s, name) {
  const client = await s.ctx.newCDPSession(s.page)
  const frames = []
  const marks = {}
  const rects = {}
  const cuts = []
  client.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
    frames.push({ data, t: metadata.timestamp ?? now() })
    await client.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    everyNthFrame: 1,
    maxWidth: s.vw * s.dpr,
    maxHeight: s.vh * s.dpr,
  })
  // Nudge a repaint so the very first frame arrives immediately.
  await s.page.evaluate(() => { document.body.style.outline = '0 solid transparent'; requestAnimationFrame(() => { document.body.style.outline = '' }) })
  await sleep(250)
  const t0 = now()
  const rec = {
    name,
    t0,
    mark(k, t = now()) { marks[k] = t; log(`   mark ${k}`) },
    async rect(k, selOrFn) {
      const box = await boxOf(s, selOrFn)
      if (!box) { log(`   (no rect for ${k})`); return null }
      rects[k] = { x: Math.round(box.x * s.dpr), y: Math.round(box.y * s.dpr), w: Math.round(box.w * s.dpr), h: Math.round(box.h * s.dpr) }
      return rects[k]
    },
    cut(from, to) { if (to - from > 0.1) cuts.push([from, to]) },
    async stop() {
      await client.send('Page.stopScreencast').catch(() => {})
      await sleep(150)
      const end = now()
      if (frames.length) frames.push({ data: frames[frames.length - 1].data, t: end })
      return { frames, marks, rects, cuts, t0, end }
    },
  }
  return rec
}

/** Box of a selector (first visible match) or of a function returning a DOMRect-like, in CSS px. */
async function boxOf(s, selOrFn) {
  if (typeof selOrFn === 'function') return selOrFn()
  return s.page.evaluate((sel) => {
    const els = window.__q ? window.__q(sel) : Array.from(document.querySelectorAll(sel))
    const el = els.find((e) => e.getClientRects().length && e.getBoundingClientRect().width > 0)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const x = Math.max(0, r.left), y = Math.max(0, r.top)
    const w = Math.min(window.innerWidth, r.right) - x, h = Math.min(window.innerHeight, r.bottom) - y
    return { x, y, w, h }
  }, selOrFn)
}

/** Maps output time (s from clip start) to source wall time, skipping cuts. */
function buildTimeline(t0, end, cuts) {
  const sorted = cuts.filter(([a, b]) => b > t0 && a < end).map(([a, b]) => [Math.max(a, t0), Math.min(b, end)]).sort((a, b) => a[0] - b[0])
  const removed = sorted.reduce((n, [a, b]) => n + (b - a), 0)
  const outDur = end - t0 - removed
  const toSource = (o) => {
    let t = t0 + o
    for (const [a, b] of sorted) if (t >= a) t += b - a
    return t
  }
  const toOutput = (t) => {
    let o = t - t0
    for (const [a, b] of sorted) {
      if (t >= b) o -= b - a
      else if (t > a) o -= t - a
    }
    return o
  }
  return { outDur, toSource, toOutput }
}

function encode(name, s, result) {
  const { frames, marks, rects, cuts, t0, end } = result
  if (!frames.length) throw new Error(`${name}: no frames`)
  const dir = path.join(TMP, name)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const tl = buildTimeline(t0, end, cuts)
  const total = Math.max(1, Math.round(tl.outDur * FPS))
  let cursor = 0
  let lastWritten = -1
  let lastPath = null
  for (let i = 0; i < total; i++) {
    const want = tl.toSource(i / FPS)
    while (cursor + 1 < frames.length && frames[cursor + 1].t <= want) cursor++
    const target = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`)
    if (cursor === lastWritten && lastPath) fs.linkSync(lastPath, target)
    else { fs.writeFileSync(target, Buffer.from(frames[cursor].data, 'base64')); lastWritten = cursor; lastPath = target }
  }
  // yuv420p needs even dimensions: 1179-wide phone frames get a 1px white column on the right.
  const SW = s.vw * s.dpr, SH = s.vh * s.dpr
  const W = SW + (SW % 2), H = SH + (SH % 2)
  const file = path.join(OUT, `${name}.mp4`)
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.jpg'),
    '-vf', `scale=${SW}:${SH}:flags=lanczos,pad=${W}:${H}:0:0:color=white,scale=out_range=tv,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-an', '-movflags', '+faststart', file,
  ])
  fs.rmSync(dir, { recursive: true, force: true })
  const outMarks = {}
  for (const [k, t] of Object.entries(marks)) outMarks[k] = Math.max(0, Math.min(total - 1, Math.round(tl.toOutput(t) * FPS)))
  log(`   -> ${name}.mp4  ${(total / FPS).toFixed(2)}s  ${total} frames  (${frames.length} source frames, ${cuts.length} cuts)`)
  return { file: `footage/${name}.mp4`, width: W, height: H, durationFrames: total, marks: outMarks, rects }
}

/* ------------------------------------------------------------------ */
/* Interaction helpers                                                  */
/* ------------------------------------------------------------------ */

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

async function centerOf(s, locator) {
  await locator.waitFor({ state: 'visible', timeout: 30000 })
  const box = await locator.boundingBox()
  if (!box) throw new Error('no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

async function moveTo(s, locator, ms = s.moveMs || 650) {
  const { x, y } = await centerOf(s, locator)
  if (s.phone) return { x, y }
  const from = await s.page.evaluate(() => window.__cur)
  const fx = from && from.x > 0 ? from.x : s.vw * 0.62
  const fy = from && from.y > 0 ? from.y : s.vh * 0.72
  const steps = Math.max(8, Math.round(ms / 16))
  for (let i = 1; i <= steps; i++) {
    const p = ease(i / steps)
    const cx = fx + (x - fx) * p, cy = fy + (y - fy) * p
    await s.page.evaluate(([a, b]) => window.__moveCursor(a, b), [cx, cy])
    await s.page.mouse.move(cx, cy)
    await sleep(ms / steps)
  }
  return { x, y }
}

async function click(s, locator, { settle = 500, pre = 220, move = s.moveMs || 650 } = {}) {
  const { x, y } = await moveTo(s, locator, move)
  await sleep(pre)
  await s.page.evaluate(([a, b]) => window.__clickCursor(a, b), [x, y])
  if (s.phone) await locator.tap({ timeout: 15000 })
  else await locator.click({ timeout: 15000 })
  await sleep(settle)
}

async function typeHuman(s, text, [min, max] = [60, 90]) {
  for (const ch of text) {
    await s.page.keyboard.type(ch)
    let d = jitter(min, max)
    if (ch === ' ' && Math.random() < 0.05) d += jitter(40, 90)
    if (/[,.?]/.test(ch)) d += jitter(40, 90)
    await sleep(d)
  }
}

async function parkCursor(s, x, y, ms = 500) {
  if (s.phone) return
  const from = await s.page.evaluate(() => window.__cur)
  const steps = Math.round(ms / 16)
  for (let i = 1; i <= steps; i++) {
    const p = ease(i / steps)
    const cx = from.x + (x - from.x) * p, cy = from.y + (y - from.y) * p
    await s.page.evaluate(([a, b]) => window.__moveCursor(a, b), [cx, cy])
    await s.page.mouse.move(cx, cy)
    await sleep(ms / steps)
  }
}

/** querySelector helper for CSS-module classes: `mod:coach` matches `…__coach` exactly. */
const modHelper = `
window.__q = (sel) => {
  if (!sel.startsWith('mod:')) return Array.from(document.querySelectorAll(sel))
  const [name, scope] = sel.slice(4).split('@')
  const root = scope ? document.querySelector(scope) : document
  if (!root) return []
  return Array.from(root.querySelectorAll('[class]')).filter((e) => Array.from(e.classList).some((c) => c === name || c.endsWith('__' + name)))
}
`
const mod = (name) => `mod:${name}`

async function waitMod(s, name, timeout = 60000) {
  await s.page.waitForFunction((n) => window.__q(n).some((e) => e.getClientRects().length), mod(name), { timeout })
}

async function gotoApp(s, p, settle = 1500) {
  await s.page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' })
  await s.page.waitForLoadState('load').catch(() => {})
  await sleep(settle)
}

/** Waits until RevenueCat has loaded (the Upgrade/Pro badge is interactive). */
async function waitReady(s) {
  await s.page.waitForFunction(() => {
    const b = Array.from(document.querySelectorAll('header button')).find((e) => /Upgrade|Pro/.test(e.textContent || ''))
    return b && !b.disabled
  }, null, { timeout: 30000 }).catch(() => {})
  await sleep(400)
}

/** Off-camera Sandbox Test Store purchase of Monthly, then wait until the app is Pro. */
async function buyProOffCamera(s) {
  const { page } = s
  await waitReady(s)
  if (s.phone) {
    throw new Error('buyProOffCamera is desktop-only')
  }
  await page.getByRole('button', { name: /Upgrade/ }).first().click()
  await page.getByRole('radio', { name: /Monthly/ }).waitFor({ timeout: 20000 })
  await page.getByRole('radio', { name: /Monthly/ }).click()
  await page.getByRole('button', { name: /Start free trial/ }).click()
  await page.getByRole('button', { name: 'Test valid purchase' }).click({ timeout: 30000 })
  await page.getByText("You're Pro").first().waitFor({ timeout: 30000 })
  await page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-modal="true"]'), null, { timeout: 15000 })
  await sleep(800)
}

async function startScenario(s, id = 'salary-offer') {
  await gotoApp(s, `/play/${id}`, 1200)
  const startBtn = s.page.getByRole('button', { name: /Start conversation/ })
  await s.page.waitForFunction(() => {
    const b = Array.from(document.querySelectorAll('button')).find((e) => /Start conversation/.test(e.textContent || ''))
    return b && !b.disabled
  }, null, { timeout: 30000 })
  return startBtn
}

/** Sends a message without filming it (for setup) and waits for the reply. */
async function sendQuick(s, text) {
  const box = s.page.locator('#composer')
  await box.fill(text)
  await s.page.keyboard.press('Enter')
  await waitReply(s)
}

async function waitReply(s, timeout = 90000) {
  await s.page.waitForFunction(() => {
    const typing = document.querySelector('[aria-label$="is typing"]')
    const ta = document.querySelector('#composer')
    return !typing && ta && !ta.disabled
  }, null, { timeout })
}

/* ------------------------------------------------------------------ */
/* Clips                                                                */
/* ------------------------------------------------------------------ */

const results = {}

/** take2: typing a data-anchored offer, reply, tension drop, coach tip and progress update. */
async function clipTake2() {
  const s = await newSession({ init: [modHelper] })
  const { page } = s
  const start = await startScenario(s)
  await start.click()
  await page.locator('#composer').waitFor()
  await sleep(1500)
  await page.evaluate(() => window.__moveCursor(1180, 560))
  const rec = await startRecording(s, 'take2')
  await sleep(900)
  await rec.rect('meter', mod('meterDesktop'))
  await rec.rect('chat', mod('chat'))
  await rec.rect('coach', mod('coach'))
  await rec.rect('progress', mod('progressBlock'))
  await rec.rect('composer', 'form' + '')
  await rec.rect('composer', mod('composer'))
  await rec.rect('side', mod('side'))
  await rec.rect('log', mod('log'))
  await click(s, page.locator('#composer'), { settle: 300 })
  await page.evaluate(() => window.__hideCursor())
  rec.mark('typed_start')
  await typeHuman(s, TAKE2_MESSAGE, [55, 72])
  rec.mark('typed_end')
  await sleep(450)
  await click(s, page.getByRole('button', { name: 'Send message' }), { settle: 0, move: 500 })
  rec.mark('sent')
  const sentAt = now()
  await parkCursor(s, 980, 700, 600)
  await waitReply(s)
  const replyAt = now()
  // Keep ~1.4s of the typing dots, cut the rest of the LLM wait.
  if (replyAt - sentAt > 2.2) rec.cut(sentAt + 1.4, replyAt - 0.3)
  rec.mark('reply_in', replyAt)
  rec.mark('tension_drop', replyAt + 0.25)
  rec.mark('coach_in', replyAt + 0.1)
  rec.mark('progress_up', replyAt + 0.2)
  await sleep(2600)
  const tension = await page.evaluate(() => window.__q('mod:value')[0]?.textContent).catch(() => null)
  log('   tension now', tension)
  await rec.rect('reply', () => page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('[class*="theirs"] p')).pop()
    if (!b) return null
    const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }
  }))
  await rec.rect('mine', () => page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('[class*="mine"] p')).pop()
    if (!b) return null
    const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }
  }))
  await rec.rect('coach', mod('coach'))
  await rec.rect('metrics', mod('metrics'))
  await rec.rect('meter', mod('meterDesktop'))
  await sleep(600)
  const res = await rec.stop()
  results.take2 = encode('take2', s, res)
  results.take2.notes = { tensionAfter: tension }
  return s // keep for reveal
}

/** reveal → paywall → inspector share one session (the same report, then the purchase). */
async function clipRevealPaywallInspector(only) {
  const s = await newSession({ init: [modHelper], keepChip: false })
  const { page } = s
  const start = await startScenario(s)
  await start.click()
  await page.locator('#composer').waitFor()
  await sleep(600)
  await sendQuick(s, TAKE2_MESSAGE)
  await sleep(1200)
  await page.evaluate(() => window.__moveCursor(1100, 600))

  // ---- reveal
  {
    const rec = await startRecording(s, 'reveal')
    await sleep(700)
    await click(s, page.getByRole('button', { name: /End/ }), { settle: 0 })
    const endAt = now()
    rec.mark('end_click', endAt)
    await parkCursor(s, 1530, 860, 700)
    await page.locator('#report-title').waitFor({ timeout: 120000 })
    const shown = now()
    // Keep ~1.6s of "Analysing your conversation…", then jump to the report.
    if (shown - endAt > 2.4) rec.cut(endAt + 1.6, shown - 0.15)
    rec.mark('report_in', shown)
    await sleep(1600)
    rec.mark('score_done', now())
    await rec.rect('score', mod('hero'))
    await rec.rect('ring', mod('ring'))
    await rec.rect('radar', () => page.evaluate(() => {
      const svg = document.querySelector('[class*="Report-module"][class*="card"] svg, [class*="__card"] svg')
      const card = svg?.closest('[class*="__card"]')
      const r = (card || svg)?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
    }))
    // Bring the truth card fully into view if it sits below the fold.
    const truthBottom = await page.evaluate(() => window.__q('mod:truth')[0]?.getBoundingClientRect().bottom)
    if (truthBottom && truthBottom > s.vh - 30) {
      await smoothScroll(s, truthBottom - s.vh + 60, 900)
      await sleep(300)
    }
    await rec.rect('radar', () => page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg')).find((e) => e.closest('[class*="__card"]') && e.querySelector('polygon'))
      const card = svg?.closest('[class*="__card"]')
      const r = (card || svg)?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
    }))
    await rec.rect('score', mod('hero'))
    await rec.rect('truth', mod('truth'))
    await sleep(500)
    await click(s, page.getByRole('button', { name: /Reveal what they were hiding/ }), { settle: 0 })
    rec.mark('truth_revealed')
    await parkCursor(s, 1530, 860, 500)
    await sleep(2600)
    await rec.rect('truth', mod('truth'))
    await rec.rect('truthText', mod('truthText'))
    const res = await rec.stop()
    results.reveal = encode('reveal', s, res)
    results.reveal.notes = { truth: await page.evaluate(() => window.__q('mod:truthText')[0]?.textContent) }
  }

  // ---- paywall (off-camera: frame the Pro coaching card)
  {
    const cta = page.getByRole('button', { name: /Unlock with Scenar Pro/ })
    await cta.scrollIntoViewIfNeeded()
    const y = await page.evaluate(() => {
      const el = window.__q('mod:pro@section[aria-labelledby="report-title"]')[0]; const r = el.getBoundingClientRect()
      return window.scrollY + r.top - 110
    })
    await page.evaluate((y) => window.scrollTo(0, y), y)
    await sleep(700)
    await page.evaluate(() => window.__moveCursor(1250, 780))
    const rec = await startRecording(s, 'paywall')
    await sleep(700)
    await rec.rect('coaching_locked', 'mod:pro@section[aria-labelledby="report-title"]')
    await click(s, cta, { settle: 0 })
    rec.mark('paywall_open')
    await page.getByRole('radio', { name: /Monthly/ }).waitFor({ timeout: 30000 })
    await sleep(1100)
    await rec.rect('plans', mod('segment'))
    await rec.rect('sheet', '[role="dialog"][aria-modal="true"]')
    await click(s, page.getByRole('radio', { name: /Monthly/ }), { settle: 0 })
    rec.mark('monthly_selected')
    await sleep(900)
    await rec.rect('timeline', mod('timeline'))
    await rec.rect('plans', mod('segment'))
    await rec.rect('cta', () => page.getByRole('button', { name: /Start free trial/ }).boundingBox().then((b) => b && { x: b.x, y: b.y, w: b.width, h: b.height }))
    await sleep(700)
    await click(s, page.getByRole('button', { name: /Start free trial/ }), { settle: 0 })
    rec.mark('cta_click')
    const t0 = now()
    const valid = page.getByRole('button', { name: 'Test valid purchase' })
    await valid.waitFor({ timeout: 30000 })
    const dlgAt = now()
    if (dlgAt - t0 > 1.6) rec.cut(t0 + 0.9, dlgAt - 0.2)
    rec.mark('teststore_open', dlgAt)
    await sleep(900)
    await rec.rect('teststore', () => page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((e) => e.textContent.trim() === 'Test valid purchase')
      let el = b; while (el && el.parentElement && el.getBoundingClientRect().height < 300) el = el.parentElement
      const r = el?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
    }))
    await click(s, valid, { settle: 0 })
    rec.mark('purchase_click')
    await page.getByText("You're Pro").first().waitFor({ timeout: 30000 })
    rec.mark('purchase_done')
    await page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-modal="true"]'), null, { timeout: 15000 })
    rec.mark('paywall_closed')
    await parkCursor(s, 1530, 860, 500)
    const w0 = now()
    await page.waitForFunction(() => {
      const el = window.__q('mod:pro@section[aria-labelledby="report-title"]')[0]
      return el && Array.from(el.classList).some((c) => c.endsWith('__proOpen'))
    }, null, { timeout: 60000 })
    const openAt = now()
    if (openAt - w0 > 2.5) rec.cut(w0 + 1.4, openAt - 0.2)
    rec.mark('unlocked', openAt)
    await page.getByText('What worked').first().waitFor({ timeout: 10000 })
    await sleep(900)
    const top = await page.evaluate(() => window.__q('mod:pro@section[aria-labelledby="report-title"]')[0].getBoundingClientRect().top)
    if (top > 140) { await smoothScroll(s, (await page.evaluate(() => window.scrollY)) + top - 110, 1000); await sleep(200) }
    rec.mark('coaching_visible')
    await sleep(1600)
    await rec.rect('coaching', 'mod:pro@section[aria-labelledby="report-title"]')
    const res = await rec.stop()
    results.paywall = encode('paywall', s, res)
  }

  // ---- inspector (Shift+I after the Sandbox purchase)
  {
    await page.evaluate(() => { document.activeElement?.blur?.() })
    await page.evaluate(() => window.__hideCursor())
    const rec = await startRecording(s, 'inspector')
    await sleep(700)
    await page.keyboard.press('Shift+I')
    rec.mark('drawer_open')
    await sleep(600)
    let rows = await drawerRows(s)
    for (const k of ['drawer', 'entitlement']) if (rows[k]) await recRect(rec, s, k, rows[k])
    rec.mark('entitlement_hold')
    await sleep(1200)
    await scrollDrawerTo(s, /^Offering/, 1000)
    rec.mark('offering_hold')
    rows = await drawerRows(s)
    for (const k of ['offering', 'placement']) if (rows[k]) await recRect(rec, s, k, rows[k])
    await sleep(1200)
    await scrollDrawerTo(s, /Server verification/, 1000)
    await page.waitForFunction(() => /Server agrees/i.test(document.body.innerText), null, { timeout: 30000 }).catch(() => log('   (no "Server agrees" text)'))
    rec.mark('server_agrees')
    rows = await drawerRows(s)
    for (const k of ['server', 'server_agrees']) if (rows[k]) await recRect(rec, s, k, rows[k])
    await sleep(1400)
    const scrolled = await scrollDrawerTo(s, /Webhook/i, 1000)
    rec.mark('webhooks')
    rows = await drawerRows(s)
    if (rows.webhooks) await recRect(rec, s, 'webhooks', rows.webhooks)
    await sleep(1300)
    const res = await rec.stop()
    results.inspector = encode('inspector', s, res)
    results.inspector.notes = { scrolledToWebhooks: scrolled }
  }
  await s.ctx.close()
}

function recRect(rec, s, k, b) {
  return rec.rect(k, async () => b)
}

async function drawerInfo(s) {
  return s.page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('[role="dialog"], aside')).find((e) => /inspector|RevenueCat/i.test(e.getAttribute('aria-label') || e.textContent.slice(0, 200)) && e.getBoundingClientRect().width > 200)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { drawer: { x: r.left, y: r.top, w: r.width, h: r.height } }
  })
}

/** Rows of the inspector: entitlement, offering/placement, server check, webhooks, drawer. */
async function drawerRows(s) {
  return s.page.evaluate(() => {
    const vis = (r) => r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return vis(r) ? { x: r.left, y: Math.max(0, r.top), w: r.width, h: Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top) } : null }
    const panel = Array.from(document.querySelectorAll('[role="dialog"]')).find((e) => /RevenueCat/i.test(e.textContent || '') && e.getBoundingClientRect().left > 500)
    if (!panel) return {}
    const sections = Array.from(panel.querySelectorAll('section'))
    const sec = (re) => sections.find((x) => re.test(x.querySelector('h3')?.textContent || ''))
    const rowOf = (re) => Array.from(panel.querySelectorAll('dt')).find((d) => re.test(d.textContent || ''))?.parentElement
    const agree = Array.from(panel.querySelectorAll('*')).find((e) => e.children.length === 0 && /Server agrees/i.test(e.textContent || ''))
    return {
      drawer: box(panel),
      entitlement: box(sec(/Entitlement/i)),
      offering: box(sec(/Offering|Paywall/i)),
      placement: box(rowOf(/Placement/i)),
      server: box(sec(/Server/i)),
      server_agrees: box(agree?.closest('div,span,p')),
      webhooks: box(sec(/Webhook/i)),
    }
  })
}

async function scrollDrawerTo(s, re, ms) {
  return s.page.evaluate(async ([src, ms]) => {
    const re = new RegExp(src, 'i')
    const panel = Array.from(document.querySelectorAll('[role="dialog"]')).find((e) => /RevenueCat/i.test(e.textContent || '') && e.getBoundingClientRect().left > 500)
    if (!panel) return false
    const target = Array.from(panel.querySelectorAll('section')).find((x) => re.test(x.querySelector('h3')?.textContent || ''))
    let sc = target?.parentElement
    while (sc && sc !== panel.parentElement && !(sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
    if (!target || !sc) return false
    const from = sc.scrollTop
    const to = Math.min(sc.scrollHeight - sc.clientHeight, from + target.getBoundingClientRect().top - sc.getBoundingClientRect().top - 24)
    const t0 = performance.now()
    await new Promise((done) => {
      const step = (t) => {
        const p = Math.min(1, (t - t0) / ms)
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
        sc.scrollTop = from + (to - from) * e
        p < 1 ? requestAnimationFrame(step) : done()
      }
      requestAnimationFrame(step)
    })
    return true
  }, [re.source, ms])
}

async function smoothScroll(s, to, ms = 1000) {
  await s.page.evaluate(([to, ms]) => new Promise((done) => {
    const from = window.scrollY, t0 = performance.now()
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms)
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      window.scrollTo(0, from + (to - from) * e)
      p < 1 ? requestAnimationFrame(step) : done()
    }
    requestAnimationFrame(step)
  }), [to, ms])
}

/** live: Sandbox → Live, Upgrade → Monthly → Start free trial → RevenueCat checkout ($0 due today). */
async function clipLive() {
  const s = await newSession({ init: [modHelper] })
  const { page } = s
  await gotoApp(s, '/app', 800)
  await waitReady(s)
  await sleep(600)
  await page.evaluate(() => window.__moveCursor(1000, 420))
  s.moveMs = 520
  const rec = await startRecording(s, 'live')
  await sleep(400)
  await rec.rect('switch', 'header [role="radiogroup"]')
  await click(s, page.locator('header [role="radio"][data-env="live"]').first(), { settle: 0 })
  rec.mark('switch_click')
  await page.getByRole('button', { name: 'Switch to Live' }).waitFor()
  await sleep(300)
  rec.mark('confirm_open')
  await rec.rect('confirm', '[role="alertdialog"]')
  await sleep(450)
  await click(s, page.getByRole('button', { name: 'Switch to Live' }), { settle: 0 })
  await parkCursor(s, 1250, 170, 450)
  await page.locator('[data-live-strip]').waitFor({ timeout: 20000 })
  rec.mark('switched_live')
  const sw = now()
  await waitReady(s)
  if (now() - sw > 1.4) rec.cut(sw + 0.9, now() - 0.2)
  await sleep(350)
  await rec.rect('strip', '[data-live-strip]')
  await rec.rect('switch', 'header [role="radiogroup"]')
  await click(s, page.getByRole('button', { name: /Upgrade/ }).first(), { settle: 0 })
  rec.mark('paywall_open')
  await page.getByRole('radio', { name: /Monthly/ }).waitFor({ timeout: 30000 })
  await sleep(600)
  await click(s, page.getByRole('radio', { name: /Monthly/ }), { settle: 0 })
  rec.mark('monthly_selected')
  await sleep(500)
  await rec.rect('plans', mod('segment'))
  await rec.rect('timeline', mod('timeline'))
  await rec.rect('liveNotice', mod('liveNotice'))
  await sleep(250)
  await click(s, page.getByRole('button', { name: /Start free trial/ }), { settle: 0 })
  rec.mark('cta_click')
  const c0 = now()
  await page.getByText('Total due today').first().waitFor({ timeout: 45000 })
  // Wait for Stripe's card fields to paint (the right pane spins until then), then cut the spin.
  const t1 = Date.now()
  let painted = false
  while (!painted && Date.now() - t1 < 40000) {
    for (const f of page.frames()) {
      if (!/elements-inner-(payment|authentication)/.test(f.url())) continue
      if (await f.locator('input:visible').count().catch(() => 0)) { painted = true; break }
    }
    if (!painted) await sleep(250)
  }
  if (!painted) log('   (stripe fields not detected)')
  await sleep(900)
  const shownAt = now()
  if (shownAt - c0 > 1.6) rec.cut(c0 + 0.9, shownAt - 0.2)
  rec.mark('checkout_shown', shownAt - 0.15)
  await parkCursor(s, 560, 600, 600)
  await rec.rect('checkout', () => page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('*')).find((e) => e.children.length === 0 && e.textContent.trim() === 'Total due today')
    let el = t; while (el && el.parentElement && el.getBoundingClientRect().height < 380) el = el.parentElement
    const r = el?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
  }))
  await rec.rect('due_today', () => page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('*')).find((e) => e.children.length === 0 && e.textContent.trim() === 'Total due today')
    let row = t; while (row && row.parentElement && !/\$0/.test(row.textContent)) row = row.parentElement
    const r = row?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
  }))
  await rec.rect('trial', () => page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('*')).find((e) => e.children.length === 0 && /Try free for 1 week/.test(e.textContent))
    const r = t?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
  }))
  await sleep(900)
  // Close the checkout (back chevron) - never touch the card fields.
  const back = page.locator('button.rcb-back-button').first()
  if (await back.count()) await click(s, back, { settle: 0 }).catch((e) => log('   back failed', e.message))
  else await page.keyboard.press('Escape')
  rec.mark('checkout_closed')
  await sleep(1000)
  const res = await rec.stop()
  results.live = encode('live', s, res)
  await s.ctx.close()
}

/** builder: /custom → preset → Build → building overlay → new scenario's briefing. */
async function clipBuilder() {
  const s = await newSession({ init: [modHelper] })
  const { page } = s
  await gotoApp(s, '/app', 800)
  await buyProOffCamera(s)
  await gotoApp(s, '/custom', 1500)
  await waitReady(s)
  await page.getByRole('button', { name: /Ask my boss for a raise/ }).waitFor()
  await sleep(800)
  await page.evaluate(() => window.__moveCursor(1100, 300))
  const rec = await startRecording(s, 'builder')
  await sleep(700)
  await rec.rect('presets', () => page.getByRole('button', { name: /Ask my boss for a raise/ }).evaluate((b) => { const r = b.parentElement.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } }))
  await click(s, page.getByRole('button', { name: /Ask my boss for a raise/ }), { settle: 0 })
  rec.mark('preset_click')
  await sleep(1200)
  await rec.rect('form', 'form')
  const build = page.getByRole('button', { name: /Build my scenario/ })
  const formTop = await page.evaluate(() => window.scrollY + document.querySelector('form').getBoundingClientRect().top)
  await smoothScroll(s, formTop - 150, 900)
  await sleep(350)
  await rec.rect('form', 'form')
  await click(s, build, { settle: 0 })
  rec.mark('build_click')
  const b0 = now()
  await page.getByRole('status').filter({ hasText: /./ }).first().waitFor({ timeout: 10000 }).catch(() => {})
  await rec.rect('building', mod('building'))
  rec.mark('building')
  await parkCursor(s, 1450, 820, 600)
  await page.waitForURL(/\/play\/custom/, { timeout: 120000 })
  await page.locator('#brief-title').waitFor({ timeout: 30000 })
  const builtAt = now()
  if (builtAt - b0 > 4.5) rec.cut(b0 + 2.6, builtAt - 1.6)
  rec.mark('built', builtAt)
  await sleep(2400)
  await rec.rect('briefing', 'article')
  await rec.rect('title', '#brief-title')
  const res = await rec.stop()
  results.builder = encode('builder', s, res)
  results.builder.notes = { title: await page.locator('#brief-title').textContent() }
  await s.ctx.close()
}

/** phone: mobile /app → scenario → one exchange → Menu sheet (plan card + Sandbox/Live) → close. */
async function clipPhone() {
  const s = await newSession({ phone: true, init: [modHelper] })
  const { page } = s
  await gotoApp(s, '/app', 800)
  await waitReady(s)
  await page.evaluate(() => window.scrollTo(0, 0))
  // Frame the first scenario card near the top.
  const card = page.getByText('Negotiate Your First Offer').first()
  await card.scrollIntoViewIfNeeded()
  const y = await page.evaluate(() => {
    const h = document.querySelector('#scenarios-title') || document.querySelector('#scenarios')
    return window.scrollY + h.getBoundingClientRect().top - 150
  })
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, y))
  await sleep(800)
  const rec = await startRecording(s, 'phone')
  await sleep(900)
  await click(s, card, { settle: 0 })
  rec.mark('open_scenario')
  const startBtn = page.getByRole('button', { name: /Start conversation/ })
  await page.waitForFunction(() => {
    const b = Array.from(document.querySelectorAll('button')).find((e) => /Start conversation/.test(e.textContent || ''))
    return b && !b.disabled
  }, null, { timeout: 30000 })
  await sleep(1000)
  rec.mark('briefing')
  await startBtn.scrollIntoViewIfNeeded()
  await sleep(300)
  await click(s, startBtn, { settle: 0 })
  rec.mark('started')
  await page.locator('#composer').waitFor()
  await sleep(900)
  await click(s, page.locator('#composer'), { settle: 150 })
  rec.mark('typed_start')
  await typeHuman(s, "Based on market data, I'd be comfortable at $85,000.", [55, 80])
  await sleep(350)
  await click(s, page.getByRole('button', { name: 'Send message' }), { settle: 0 })
  rec.mark('sent')
  const t0 = now()
  await waitReply(s)
  const rAt = now()
  if (rAt - t0 > 2.2) rec.cut(t0 + 1.3, rAt - 0.3)
  rec.mark('reply_in', rAt)
  await page.evaluate(() => document.activeElement?.blur?.())
  await sleep(2200)
  await rec.rect('chat', mod('chat'))
  await rec.rect('meter', mod('meterMobile'))
  await rec.rect('composer', mod('composer'))
  const menu = page.locator('header').getByRole('button', { name: /Menu/ }).first()
  await click(s, menu, { settle: 0 })
  rec.mark('sheet_open')
  await sleep(1300)
  await rec.rect('sheet', '[role="dialog"]')
  await rec.rect('switch', '[role="dialog"] [role="radiogroup"]')
  await rec.rect('plan', () => page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]'); if (!d) return null
    const el = Array.from(d.querySelectorAll('[class]')).find((e) => Array.from(e.classList).some((c) => /__plan/i.test(c)))
    const r = el?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
  }))
  await sleep(1700)
  const close = page.locator('[role="dialog"]').getByRole('button', { name: /Close/ }).first()
  if (await close.count()) await click(s, close, { settle: 0 })
  else await page.keyboard.press('Escape')
  rec.mark('sheet_closed')
  await sleep(750)
  const res = await rec.stop()
  results.phone = encode('phone', s, res)
  await s.ctx.close()
}

/**
 * Stand-in recognizer for headless Chrome, whose real Web Speech service is unreachable: it
 * behaves like webkitSpeechRecognition and streams an interim transcript word by word.
 */
const fakeSpeech = `
(() => {
  const PHRASE = "Based on market data for this role, I'd be comfortable at eighty-five";
  class FakeRec {
    constructor() { this.onresult = null; this.onerror = null; this.onend = null; this.onstart = null; this._t = [] }
    start() {
      const words = PHRASE.split(' ')
      setTimeout(() => this.onstart && this.onstart(new Event('start')), 50)
      words.forEach((_, i) => this._t.push(setTimeout(() => {
        const text = words.slice(0, i + 1).join(' ')
        const alt = { transcript: text, confidence: 0.9 }
        const res = Object.assign([alt], { isFinal: false })
        this.onresult && this.onresult({ resultIndex: 0, results: [res] })
      }, 450 + i * 170)))
    }
    stop() { this._t.forEach(clearTimeout); setTimeout(() => this.onend && this.onend(new Event('end')), 30) }
    abort() { this.stop() }
  }
  window.SpeechRecognition = FakeRec
  window.webkitSpeechRecognition = FakeRec
})();
`

/** voice: close crop on the speaker toggle ("Voice on") and the mic listening state. */
async function clipVoice() {
  const s = await newSession({ init: [modHelper, fakeSpeech] })
  const { page } = s
  await gotoApp(s, '/app', 800)
  await buyProOffCamera(s)
  const start = await startScenario(s)
  await start.click()
  await page.locator('#composer').waitFor()
  await sleep(1400)
  const hasMic = await page.locator('button[aria-label="Dictate your reply"]').count()
  const hasSpeaker = await page.locator('button[aria-label^="Voice off"], button[aria-label^="Voice on"]').count()
  log('   mic', hasMic, 'speaker', hasSpeaker)
  if (!hasMic && !hasSpeaker) { log('   voice controls not rendered - skipping'); await s.ctx.close(); return }
  await page.evaluate(() => window.__moveCursor(1100, 520))
  s.moveMs = 520
  const rec = await startRecording(s, 'voice')
  await sleep(350)
  await rec.rect('speaker', 'button[aria-label^="Voice"]')
  await rec.rect('mic', 'button[aria-label="Dictate your reply"]')
  await rec.rect('composer', mod('composer'))
  await rec.rect('chatHead', mod('chatHead'))
  const speaker = page.locator('button[aria-label^="Voice off"]')
  if (await speaker.count()) {
    await click(s, speaker, { settle: 0 })
    rec.mark('voice_on')
    await sleep(650)
  }
  await rec.rect('speaker', 'button[aria-label^="Voice"]')
  await click(s, page.locator('button[aria-label="Dictate your reply"]'), { settle: 0 })
  rec.mark('mic_on')
  await parkCursor(s, 700, 480, 450)
  await sleep(200)
  await rec.rect('mic', 'button[aria-label="Stop dictation"]')
  await rec.rect('listening', mod('listeningHint'))
  await rec.rect('composer', mod('composer'))
  await sleep(2300)
  rec.mark('transcript')
  await sleep(400)
  const res = await rec.stop()
  results.voice = encode('voice', s, res)
  results.voice.notes = { dictation: 'headless Chrome has no Web Speech service; a stand-in recognizer streamed the interim transcript' }
  await s.ctx.close()
}

/* ------------------------------------------------------------------ */

const CLIPS = {
  take2: async () => { const s = await clipTake2(); await s.ctx.close() },
  reveal: () => clipRevealPaywallInspector(),
  live: clipLive,
  builder: clipBuilder,
  phone: clipPhone,
  voice: clipVoice,
}
const ALIASES = { paywall: 'reveal', inspector: 'reveal' }

const want = (process.env.CLIP || Object.keys(CLIPS).join(',')).split(',').map((c) => ALIASES[c.trim()] || c.trim())
const todo = [...new Set(want)]

let existing = {}
try { existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) } catch { /* first run */ }

try {
  for (const c of todo) {
    if (!CLIPS[c]) { log('unknown clip', c); continue }
    log(`== ${c}`)
    const before = Object.keys(results).length
    try { await CLIPS[c]() } catch (e) { log(`!! ${c} failed:`, e.message) }
    // Save as we go so a later failure keeps earlier clips.
    const merged = { ...existing, ...results }
    fs.writeFileSync(JSON_PATH, JSON.stringify(merged, null, 2) + '\n')
    if (Object.keys(results).length === before) log(`   (${c} produced nothing)`)
  }
} finally {
  await browser?.close()
}
log('wrote', path.relative(ROOT, JSON_PATH))
