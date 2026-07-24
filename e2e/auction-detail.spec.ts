import { expect, test } from '@playwright/test'

const rolexRoute = '/auctions/rolex-126610lv'

test.describe('PUB-003 auction detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    await page.clock.setFixedTime(new Date('2026-07-18T10:00:00.000Z'))
    await page.goto(rolexRoute)
  })

  test('renders the live auction, gallery, tabs, and local interactions', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Rolex Submariner Date 126610LV' })).toHaveCount(1)
    await expect(page.getByAltText(/ảnh chính/)).toBeVisible()
    await expect(page.getByText('Giá chính thức hiện tại')).toBeVisible()
    await expect(page.getByText('450.000.000 ₫')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Vào phòng đấu giá' })).toHaveAttribute('href', /\/live$/)
    await expect(page.locator('.detail-summary-card .auction-status')).toHaveCount(1)
    await expect(page.locator('.detail-image-status')).toHaveCount(0)
    await expect(page.getByText('Đủ điều kiện tham gia')).toBeVisible()
    const priceBox = await page.locator('.detail-price').boundingBox()
    const countdownBox = await page.locator('.detail-countdown').boundingBox()
    const eligibilityBox = await page.locator('.detail-eligibility').boundingBox()
    const primaryBox = await page.getByRole('link', { name: 'Vào phòng đấu giá' }).boundingBox()
    const metricsBox = await page.locator('.detail-metrics').boundingBox()
    expect(priceBox).not.toBeNull()
    expect(countdownBox).not.toBeNull()
    expect(eligibilityBox).not.toBeNull()
    expect(primaryBox).not.toBeNull()
    expect(metricsBox).not.toBeNull()
    expect(priceBox!.y).toBeLessThan(countdownBox!.y)
    expect(countdownBox!.y).toBeLessThan(eligibilityBox!.y)
    expect(eligibilityBox!.y).toBeLessThan(primaryBox!.y)
    expect(primaryBox!.y).toBeLessThan(metricsBox!.y)
    const relatedLiveBadge = page.locator('.detail-related-grid .auction-status.live > .badge').first()
    await expect(relatedLiveBadge).toContainText('ĐANG DIỄN RA')
    await expect(relatedLiveBadge).toHaveCSS('color', 'rgb(255, 255, 255)')
    expect(await relatedLiveBadge.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toMatch(/rgb\(255, 255, 255\)|rgb\(255, 253, 249\)/)
    const badgeBox = await relatedLiveBadge.boundingBox()
    expect(badgeBox?.height).toBeGreaterThanOrEqual(32)
    expect(badgeBox?.height).toBeLessThanOrEqual(36)
    expect(badgeBox?.width).toBeLessThan(180)
    await expect(page.getByText('PRODUCT MANAGEMENT MOCK')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Tham chiếu tài sản' })).toHaveCount(0)
    await expect(page.getByText('Reference ID')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Người tham gia' })).toHaveCount(0)

    await page.getByRole('button', { name: /góc nghiêng/ }).click()
    await expect(page.getByAltText(/góc nghiêng/)).toBeVisible()
    await page.getByRole('button', { name: 'Phóng to ảnh tài sản' }).click()
    await expect(page.getByRole('dialog', { name: 'Ảnh tài sản phóng to' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Ảnh tài sản phóng to' })).toHaveCount(0)

    await page.getByRole('tab', { name: 'Tài sản' }).click()
    await expect(page).toHaveURL(/tab=asset/)
    await expect(page.locator('#detail-panel-asset h2')).toHaveText('Thông tin Rolex Submariner Date 126610LV')
    await page.reload()
    await expect(page.getByRole('tab', { name: 'Tài sản' })).toHaveAttribute('aria-selected', 'true')

    await page.getByRole('button', { name: /quy tắc phiên/i }).first().click()
    await expect(page.getByRole('dialog', { name: 'Toàn bộ quy tắc phiên' })).toBeVisible()
    await page.getByRole('button', { name: 'Đóng quy tắc phiên' }).click()
    await page.getByRole('button', { name: 'Chia sẻ phiên' }).click()
    await expect(page.getByRole('status')).toContainText('Đã sao chép liên kết phiên đấu giá')
    const overflowing = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map((element) => `${element.className || element.tagName}:${Math.round(element.getBoundingClientRect().right)}`))
    expect(overflowing).toEqual([])
  })

  test('covers deterministic error, blocked, cancelled, and not-found projections', async ({ page }) => {
    await page.goto(`${rolexRoute}?projection=loading`)
    await expect(page.getByRole('status')).toBeVisible()
    await page.goto(`${rolexRoute}?projection=error`)
    await expect(page.getByRole('heading', { name: 'Chưa thể tải thông tin phiên đấu giá' })).toBeVisible()
    await page.getByRole('button', { name: 'Thử lại' }).click()
    await expect(page).toHaveURL(rolexRoute)

    await page.goto(`${rolexRoute}?scenario=paused`)
    await expect(page.getByRole('button', { name: 'Tạm thời chưa thể đặt giá' })).toBeDisabled()
    await expect(page.getByText('Phiên đang được tạm dừng. Bid mới chưa được xử lý.')).toBeVisible()
    await expect(page.getByText('Giá gần nhất')).toBeVisible()
    await expect(page.getByText('Chờ thông báo tiếp theo')).toBeVisible()
    await page.goto(`${rolexRoute}?scenario=cancelled`)
    await expect(page.getByRole('link', { name: 'Vào phòng đấu giá' })).toHaveCount(0)
    await expect(page.getByText('Phiên không còn hiệu lực')).toBeVisible()
    await expect(page.locator('[role="timer"]')).toHaveCount(0)

    await page.goto(`${rolexRoute}?scenario=registration-open`)
    await expect(page.getByText('Giá khởi điểm', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Đăng ký tham gia' })).toBeVisible()

    await page.goto(`${rolexRoute}?scenario=closed`)
    await expect(page.getByText('Giá đóng phiên')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Xem kết quả' })).toBeVisible()
    await page.goto('/auctions/unknown-auction')
    await expect(page.getByRole('heading', { name: 'Không tìm thấy phiên đấu giá' })).toBeVisible()
  })

  test('keeps the primary decision path visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(rolexRoute)

    const imageBox = await page.locator('.detail-main-image').boundingBox()
    const summaryBox = await page.locator('.detail-summary-card').boundingBox()
    const thumbnailsBox = await page.locator('.detail-thumbnails').boundingBox()

    expect(imageBox).not.toBeNull()
    expect(summaryBox).not.toBeNull()
    expect(thumbnailsBox).not.toBeNull()
    expect(imageBox!.y).toBeLessThan(summaryBox!.y)
    expect(summaryBox!.y).toBeLessThan(thumbnailsBox!.y)
    await expect(page.locator('.detail-primary-action-anchor .button.primary')).toBeVisible()
    await expect(page.locator('.detail-mobile-sticky-action')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Vào phòng đấu giá' })).toHaveCount(1)
    await page.locator('.detail-tabs').scrollIntoViewIfNeeded()
    await expect(page.locator('.detail-mobile-sticky-action')).toBeVisible()
    await expect(page.locator('.detail-primary-action-anchor .button.primary')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Vào phòng đấu giá' })).toHaveCount(1)
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
