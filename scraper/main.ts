import { chromium } from "playwright"

async function scrape(url: string) {
    const browser = await chromium.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto(url)

    await page.addLocatorHandler(page.getByLabel("Reject cookies"), async () => {
        await page.getByLabel("Reject cookies").click()
    }, { times: 1 })


    await page.waitForTimeout(5000)
    await browser.close()
}

scrape("https://demo.inelabteamdev.com/item/2507")