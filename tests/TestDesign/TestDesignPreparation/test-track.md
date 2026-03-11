import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:8090/');
  await page.getByRole('link', { name: ' Schools' }).click();
  await page.getByRole('link', { name: '+ Create New School' }).click();
  await page.getByRole('textbox', { name: 'School Name *' }).click();
  await page.getByRole('textbox', { name: 'School Name *' }).fill('Test School 123');
  await page.getByLabel('School Type').selectOption('Charter');
  await page.getByLabel('Education Level').selectOption('Secondary');
  await page.getByRole('spinbutton', { name: 'Student Capacity' }).click();
  await page.getByRole('spinbutton', { name: 'Student Capacity' }).fill('5');
  await page.getByRole('textbox', { name: 'City *' }).click();
  await page.getByRole('textbox', { name: 'City *' }).fill('Pune');
  await page.getByRole('textbox', { name: 'City *' }).press('Tab');
  await page.getByRole('textbox', { name: 'Country *' }).fill('India');
  await page.getByRole('textbox', { name: 'Address *' }).click();
  await page.getByRole('textbox', { name: 'Address *' }).fill('Somewhere address');
  await page.getByRole('button', { name: ' Create School' }).click();
  await page.getByText('Test School 123').click();
  await page.locator('tr:nth-child(137) > td:nth-child(7) > .btn-group > .btn.btn-sm.btn-outline-info').click();
  await page.getByRole('link', { name: ' Back to List' }).click();
});