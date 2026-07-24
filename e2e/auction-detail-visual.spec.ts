import { expect, test } from '@playwright/test'

test('PUB-003 live auction detail desktop visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.clock.setFixedTime(new Date('2026-07-18T10:00:00.000Z'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/auctions/rolex-126610lv')
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  await expect(page.getByRole('heading', { level: 1, name: 'Rolex Submariner Date 126610LV' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0))
  await expect(page).toHaveScreenshot('PUB-003-auction-detail-live-desktop-1440.png', { fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' })
})

test('PUB-003 live auction detail mobile visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.setFixedTime(new Date('2026-07-18T10:00:00.000Z'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/auctions/rolex-126610lv')
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  await expect(page.getByRole('heading', { level: 1, name: 'Rolex Submariner Date 126610LV' })).toBeVisible()
  await expect(page.locator('.detail-primary-action-anchor .button.primary')).toBeVisible()
  await expect(page.locator('.detail-mobile-sticky-action')).toHaveCount(0)
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0))
  await expect(page).toHaveScreenshot('PUB-003-auction-detail-live-mobile-390.png', { fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' })
})
