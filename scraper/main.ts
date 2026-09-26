import { chromium } from "playwright"
import { expect } from "@playwright/test"

async function scrape(url: string, selectedOption: string) {
    const browser = await chromium.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto(url)

    // Deal with cookie popup

    await page.addLocatorHandler(page.getByLabel("Reject cookies"), async () => {
        await page.getByLabel("Reject cookies").click()
    }, { times: 1 })

    const optionBtn = page.getByRole("button", { name: selectedOption })

    // Select the option

    await expect(optionBtn).toBeAttached()
    await optionBtn.click()
    await expect(optionBtn).toHaveAttribute("aria-pressed", "true")

    await page.waitForTimeout(10000)
    await browser.close()
}

scrape("https://demo.inelabteamdev.com/item/2507", "Regular")