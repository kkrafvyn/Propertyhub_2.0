import { expect, test } from '@playwright/test'

const demoUser = {
  id: 'qa-user',
  name: 'QA Operator',
  email: 'qa@example.com',
  role: 'platform_admin',
  app_metadata: { role: 'platform_admin' },
}

async function seedAuth(page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('baytmiftah_user', JSON.stringify(user))
  }, demoUser)
}

test.beforeEach(async ({ page }) => {
  await page.route('**/functions/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  page.consoleErrors = consoleErrors
})

test.afterEach(async ({ page }) => {
  expect(page.consoleErrors).toEqual([])
})

test('desktop dashboard and navigation render', async ({ page }) => {
  await seedAuth(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /BaytMiftah Workspace/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Explore/i }).first()).toBeVisible()

  await page.getByRole('link', { name: /Explore/i }).first().click()
  await expect(page).toHaveURL(/\/explore/)
  await expect(page.getByRole('link', { name: /The Obsidian Penthouse/i })).toBeVisible()
})

test('login screen renders public entry form', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByPlaceholder('name@firm.com')).toBeVisible()
  await expect(page.getByPlaceholder('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: /secure login/i })).toBeVisible()
})

test('create listing flow exposes checklist and media staging', async ({ page }) => {
  await seedAuth(page)
  await page.goto('/create-listing')

  await expect(page.getByText('Publishing checklist')).toBeVisible()
  await page.getByPlaceholder('e.g. The Obsidian Penthouse').fill('QA Penthouse')
  await page.getByPlaceholder(/Describe the architecture/i).fill('A bright verified residence with smart access, strong daylight, and premium buyer positioning.')
  await page.getByPlaceholder('City, district, community').fill('Accra, Cantonments')
  await page.locator('input[name="bedrooms"]').fill('3')
  await page.locator('input[name="bathrooms"]').fill('2')
  await page.locator('input[name="sqft"]').fill('2200')
  await page.locator('input[name="price"]').fill('1800000')
  await page.getByText('Smart Home').click()

  await expect(page.getByText(/5 of 6 checks ready|6 of 6 checks ready/)).toBeVisible()
})

test('admin agency verification empty or review state renders', async ({ page }) => {
  await seedAuth(page)
  await page.goto('/admin/agencies')

  await expect(page.getByRole('heading', { name: /Pending Agencies/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /All/i })).toBeVisible()
})

test('unknown route renders recoverable error state', async ({ page }) => {
  await page.goto('/definitely-not-a-route')

  await expect(page.getByText('This page is outside the portfolio.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explore' })).toBeVisible()
})
