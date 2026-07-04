import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Study Copilot/i);
  });

  test('displays Study Copilot heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Study Copilot' })).toBeVisible();
  });

  test('shows projects section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Projects')).toBeVisible();
  });

  test('shows chat empty state', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText('Select a project to start chatting')
    ).toBeVisible();
  });
});
