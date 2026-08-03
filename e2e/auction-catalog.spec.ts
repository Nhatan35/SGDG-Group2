import { expect, test } from '@playwright/test'

test.describe('PUB-002 auction catalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    await page.goto('/auctions')
  })

  test('supports public catalog search, sort, actions, and empty state', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Khám phá các phiên đấu giá' })).toBeVisible()
    const primaryNavigation = page.getByRole('navigation', { name: 'Điều hướng chính' })
    await expect(primaryNavigation.getByRole('link', { name: 'Sắp diễn ra', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Đã kết thúc', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Đã hủy', exact: true })).toHaveCount(0)
    await expect(page.locator('.catalog-auction-grid .auction-card')).toHaveCount(3)
    const decisionCard = page.locator('.catalog-auction-grid .auction-card').first()
    const titleBox = await decisionCard.locator('h3').boundingBox()
    const priceBox = await decisionCard.locator('.auction-price').boundingBox()
    const timeBox = await decisionCard.locator('.auction-time').boundingBox()
    const actionBox = await decisionCard.locator('.auction-card-action').boundingBox()
    const metricsBox = await decisionCard.locator('.auction-metrics').boundingBox()
    expect(titleBox).not.toBeNull()
    expect(priceBox).not.toBeNull()
    expect(timeBox).not.toBeNull()
    expect(actionBox).not.toBeNull()
    expect(metricsBox).not.toBeNull()
    expect(titleBox!.y).toBeLessThan(priceBox!.y)
    expect(priceBox!.y).toBeLessThan(timeBox!.y)
    expect(timeBox!.y).toBeLessThan(actionBox!.y)
    expect(actionBox!.y).toBeLessThan(metricsBox!.y)
    for (const card of await page.locator('.catalog-auction-grid .auction-card').all()) {
      expect(await card.locator('.button.primary').count()).toBeLessThanOrEqual(1)
      expect(await card.locator('a a, a button, button a').count()).toBe(0)
    }

    await page.getByRole('button', { name: 'Đang mở đăng ký' }).click()
    await expect(page.locator('.catalog-auction-grid').getByRole('link', { name: 'Đăng ký tham gia', exact: true }).first()).toHaveAttribute('href', /\/register$/)
    await page.getByRole('button', { name: 'Đang diễn ra' }).click()
    await expect(page.locator('.catalog-auction-grid').getByRole('link', { name: 'Vào phòng đấu giá' }).first()).toHaveAttribute('href', /\/live$/)

    await page.goto('/auctions')
    await page.getByRole('textbox', { name: 'Tìm kiếm phiên đấu giá' }).fill('rolex')
    await page.getByRole('button', { name: 'Tìm kiếm' }).click()
    await expect(page).toHaveURL(/\?q=rolex/)
    await expect(page.locator('.catalog-auction-grid .auction-card h3').first()).toContainText('Rolex')
    await expect(page.getByRole('heading', { name: 'Chọn theo tiêu chí' })).toBeVisible()
    await page.getByRole('button', { name: 'Đang diễn ra' }).click()
    await expect(page).toHaveURL(/status=live/)
    await expect(page.getByRole('button', { name: 'Đang diễn ra', exact: true })).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/auctions')
    await expect(page.locator('.catalog-auction-grid .auction-card')).toHaveCount(3)
    await page.goto('/auctions?status=cancelled')
    await expect(page.locator('.catalog-auction-grid .auction-card')).toHaveCount(3)
    await expect(page.getByRole('button', { name: 'Đã hủy', exact: true })).toHaveCount(0)
    await page.goto('/auctions')
    await page.getByRole('button', { name: 'Giá cao – thấp' }).click()
    await expect(page).toHaveURL(/sort=price-desc/)
    const visiblePrices = await page.locator('.catalog-auction-grid .auction-price').allTextContents()
    const numericPrices = visiblePrices.map((value) => Number(value.replace(/\D/g, '')))
    expect(numericPrices).toEqual([...numericPrices].sort((left, right) => right - left))

    await page.getByRole('textbox', { name: 'Tìm kiếm phiên đấu giá' }).fill('không-có-fixture')
    await page.getByRole('button', { name: 'Tìm kiếm' }).click()
    await expect(page.getByRole('heading', { name: 'Không tìm thấy phiên đấu giá phù hợp' })).toBeVisible()
    await page.getByRole('button', { name: 'Xóa tất cả bộ lọc' }).click()
    await expect(page.locator('.catalog-auction-grid .auction-card')).toHaveCount(3)

    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })

  test('exposes deterministic loading and projection error states', async ({ page }) => {
    await page.goto('/auctions?projection=loading')
    await expect(page.getByRole('status')).toBeVisible()
    await page.goto('/auctions?projection=error')
    await expect(page.getByRole('heading', { name: 'Chưa thể tải danh sách phiên đấu giá' })).toBeVisible()
    await page.getByRole('button', { name: 'Thử lại' }).click()
    await expect(page).toHaveURL('/auctions')

    await page.goto('/auctions?projection=empty')
    await expect(page.getByRole('heading', { name: 'Chưa có phiên đấu giá' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Không tìm thấy phiên đấu giá phù hợp' })).toHaveCount(0)
  })

  test('keeps filters and card hierarchy usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/auctions')

    await expect(page.locator('.catalog-auction-grid .auction-card')).toHaveCount(3)
    const firstCardBox = await page.locator('.catalog-auction-grid .auction-card').first().boundingBox()
    const secondCardBox = await page.locator('.catalog-auction-grid .auction-card').nth(1).boundingBox()
    expect(firstCardBox).not.toBeNull()
    expect(secondCardBox).not.toBeNull()
    expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y + firstCardBox!.height)
    await expect(page.locator('.catalog-filter-chips')).toHaveCSS('overflow-x', 'auto')
    await page.getByRole('button', { name: 'Đang diễn ra' }).click()
    await expect(page.getByRole('button', { name: 'Đang diễn ra', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true)
  })
})
