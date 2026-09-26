import { type Browser, chromium, type Locator, type Page } from "playwright"
import { expect } from "@playwright/test"

const products = [
    { id: 2224, option: "Duo pack" },
    { id: 2789, option: "Stage bundle" },
    { id: 2235, option: "1-pack" },
    { id: 2111, option: "Regular" }
]

const maxRetries = 4

async function init(url: string, selectedOption: string, maxRetries: number) {
    const browser = await chromium.launch({ headless: false })
    await scrape(browser, url, selectedOption, maxRetries)
    await browser.close()
}

async function scrape(browser: Browser, url: string, selectedOption: string, maxRetries: number) {
    const browserCtx = await browser.newContext()
    const page = await browserCtx.newPage()
    await page.goto(url)

    // Deal with cookie popup

    await page.addLocatorHandler(page.getByLabel("Reject cookies"), async () => {
        await page.getByLabel("Reject cookies").click()
    }, { times: 1 })

    try {
        // Select the option
        const optionBtn = page.getByRole("button", { name: selectedOption })
        await expect(optionBtn).toBeAttached()
        await optionBtn.click()
        await expect(optionBtn).toHaveAttribute("aria-pressed", "true")

        // Hover over the button to enable it
        const priceBtn = page.getByLabel("Check today’s price")
        await expect(priceBtn).toBeAttached()
        await enablePriceButtonWitHover(page, priceBtn)

        // Try scraping with max retries
        const [done, price] = await getPriceWithRetry(page, maxRetries)

        if (done) console.log(`Price ${price} scraped for option ${selectedOption}`)
        else throw Error("Scraping failed")
    }
    catch (e) {
        if (e instanceof Error) console.error(e.message)
        else console.error("Unknown error occured")
    }
    finally {
        await browserCtx.close()
    }
}

async function enablePriceButtonWitHover(page: Page, priceBtn: Locator) {
    /*
    We do a humanlike hover over the price button to enable it. We do a minimum of 8 movements and staty for atleast 600ms.
    Playwright's hover doesn't work.
     */
    await expect(priceBtn).toBeAttached()

    const box = await priceBtn.boundingBox();

    if (!box) throw new Error('No bounding box');

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    for (let i = 0; i < 10; i++) {
        await page.mouse.move(
            x - 40 + i * 8,
            y - 20 + i * 4
        );

        await page.waitForTimeout(50);
    }

    await page.waitForTimeout(700);
}


async function getPriceWithRetry(page: Page, maxRetries: number) {
    /*
    Try scraping the price with a automatic retries & exponential backoff
     */
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const priceBtn = page.getByLabel("Check today’s price")
    const retryBtn = page.getByRole("button", { name: "Retry" })

    await priceBtn.click()

    try { await expect(priceBtn).not.toBeAttached() }


    for (let i = 0; i < maxRetries; i++) {
        try {
            const [done, price] = await getPrice(page)
            if (done) return [true, price];

            await expect(retryBtn).toBeAttached()

            await sleep(Math.pow(2, i) * 1000)
            await retryBtn.click()
        }
        catch (e) { }
    }
    return [false, -1]
}

async function getPrice(page: Page) {
    const offerPanel = page.locator('div.offer-panel')
    // Wait for it show success or fail
    await expect(offerPanel).toHaveClass(/(?:^|\s)(?:offer-ready|offer-failed|offer-locked)(?:\s|$)/, { timeout: 15000 })
    const classes = await offerPanel.getAttribute("class")
    if (classes?.includes("offer-ready")) {
        const offerRow = page.locator("div.offer-row")
        const price = await cleanPrice(offerRow)
        return [true, price]
    }
    else if (classes?.includes("offer-failed")) {
        console.warn("[FAILURE] Retrying...\n\n")
    }
    else if (classes?.includes("offer-locked")) {
        console.warn("[FAILURE] Price Button not clicked...")
    }
    else {
        console.warn("[FAILURE] Unreachable")
    }
    return [false, -1]
}

async function cleanPrice(offerRow: Locator) {
    const children = offerRow.locator(":scope > *").visible() // Only find children that are visible
    for (let i = 0; i < await children.count(); i++) {
        const el = children.nth(i)
        const classes = await el.getAttribute("style")
        const innerText = await el.innerText()

        if (classes?.includes("line-through")) continue; // Strike through prices
        if (innerText.includes("%")) continue; // Ignore X% Savings
        if (/[a-z]/i.test(innerText)) continue // Ignore other alphabetical text
        return innerText
    }
}

Promise.allSettled(products.map(
    (product) => {
        init(`https://demo.inelabteamdev.com/item/${product.id}`, product.option, maxRetries)
    }
))