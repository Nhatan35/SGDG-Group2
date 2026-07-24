import { expect, test, type Page } from '@playwright/test'

async function prepareFullPageImages(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => {
      image.loading = 'eager'
    })
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  )
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map((image) =>
        image.decode().catch(() => undefined),
      ),
    ),
  )
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
}

test('PUB-001 desktop visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.clock.setFixedTime(new Date('2026-07-18T10:00:00.000Z'))
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await page.goto('/')
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  })

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  await prepareFullPageImages(page)

  const overflowingElements = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          selector: [
            element.tagName.toLowerCase(),
            element.id ? `#${element.id}` : '',
            element.classList.length ? `.${Array.from(element.classList).join('.')}` : '',
          ].join(''),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        }
      })
      .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1),
  )
  expect(overflowingElements).toEqual([])

  await expect(page).toHaveScreenshot('PUB-001-homepage-desktop-1440.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  })
})

test('PUB-001 mobile visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.setFixedTime(new Date('2026-07-18T10:00:00.000Z'))
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await page.goto('/')
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  })

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  await prepareFullPageImages(page)

  const overflowingElements = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          selector: [
            element.tagName.toLowerCase(),
            element.id ? `#${element.id}` : '',
            element.classList.length ? `.${Array.from(element.classList).join('.')}` : '',
          ].join(''),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        }
      })
      .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1),
  )
  expect(overflowingElements).toEqual([])

  await expect(page).toHaveScreenshot('PUB-001-homepage-mobile-390.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  })
})
