import { type Browser, chromium, type Locator, type Page } from "playwright"
import { expect } from "@playwright/test"
import { fixPrice, retryUntil, validate } from "./utils.ts"

const tracingEnabled = process.env.TRACE === "1"
if (tracingEnabled) console.log("===== Starting TRACING =====")

const products = [
    { id: 2121, option: "Oak" },
    { id: 2789, option: "Stage bundle" },
    { id: 2235, option: "1-pack" },
    { id: 2111, option: "Regular" }
]

const maxRetries = 4
const BASEURL = "https://demo.inelabteamdev.com/item"

async function init() {
    const browser = await chromium.launch({ headless: false })
    await Promise.allSettled(products.map(
        (product) => scrape(browser, product.id, product.option, maxRetries)
    ))
    await browser.close()
}

async function scrape(browser: Browser, id: number, selectedOption: string, maxRetries: number) {
    let shouldTrace = false
    const url = `${BASEURL}/${id}`
    const browserCtx = await browser.newContext()
    if (tracingEnabled) {
        await browserCtx.tracing.start({
            screenshots: true,
            snapshots: true,
        })
    }
    const page = await browserCtx.newPage()
    await page.goto(url)

    const cookieRejectLabel = page.getByLabel("Reject cookies")

    const printer = (msg: string) => `[FAILURE] Product ID:  ${id}\tReason: ` + msg

    // Deal with cookie popup
    await page.addLocatorHandler(cookieRejectLabel, async () => {
        await retryUntil(() => cookieRejectLabel.click(), () => expect(cookieRejectLabel).not.toBeAttached(), maxRetries, "Cannot close cookie popup.")
    })

    try {
        //Check if product exists
        const pageError = page.getByText("Error: product 404")
        await validate(() => expect(pageError).not.toBeAttached(), "Product does not exist")

        // Check if selected option is present
        const optionBtn = page.getByRole("button", { name: selectedOption })
        await validate(() => expect(optionBtn).toBeAttached(), "Selected option is not present")

        // Click the selected option & validate
        await retryUntil(() => optionBtn.click(), () => expect(optionBtn).toHaveAttribute("aria-pressed", "true"), maxRetries, "Option cannot be selected")

        // Hover over the button to enable it
        const priceBtn = page.getByLabel("Check today’s price")
        await validate(() => expect(priceBtn).toBeAttached(), "Check price button is not present")
        await retryUntil(() => enablePriceButtonWitHover(page, priceBtn), () => expect(priceBtn).toBeEnabled(), maxRetries, "Cannot enable Check Price button")

        // Try scraping with max retries
        const [done, price] = await getPriceWithRetry(page, maxRetries)
        shouldTrace = true

        if (done) console.log(`Product ID: ${id}\t\tPrice: ${price}\t\tOption: ${selectedOption}`)
        else throw new Error("Scraping was unsuccesful. ");
    }
    catch (e) {
        if (e instanceof Error) console.error(printer(e.message))
        else console.error("Unknown error occured")
    }
    finally {
        if (tracingEnabled) {
            if (shouldTrace) {
                await browserCtx.tracing.stop()
            } else {
                await browserCtx.tracing.stop({
                    path: `traces/${id}.zip`
                })
            }
        }
    }
    await browserCtx.close()
}

async function enablePriceButtonWitHover(page: Page, priceBtn: Locator) {
    /*
    We do a humanlike hover over the price button to enable it. We do a minimum of 8 movements and staty for atleast 600ms.
    Playwright's hover doesn't work.
     */
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

    await retryUntil(() => priceBtn.click(), () => expect(priceBtn).not.toBeAttached({ timeout: 2000 }), maxRetries, "Check today's price Button cannot be clicked.")

    for (let i = 0; i < maxRetries; i++) {
        const [done, price] = await getPrice(page)
        if (done) return [true, price];

        await validate(() => expect(retryBtn).toBeAttached({ timeout: 2000 }), "Retry Button not found")

        await sleep(Math.pow(2, i) * 1000)
        await retryUntil(() => retryBtn.click(), () => expect(retryBtn).not.toBeAttached({ timeout: 2000 }), maxRetries, "Could not retry the price check")
    }
    return [false, -1]
}

async function getPrice(page: Page) {
    const offerPanel = page.locator('div.offer-panel')
    // Wait for it show success or fail
    await expect(offerPanel).toHaveClass(/(?:^|\s)(?:offer-ready|offer-failed)(?:\s|$)/, { timeout: 15000 })

    const classes = await offerPanel.getAttribute("class")

    if (classes?.includes("offer-ready")) {
        const offerRow = page.locator("div.offer-row")
        const price = await cleanPrice(offerRow)
        return [true, price]
    }
    else if (classes?.includes("offer-failed")) {
        console.warn("Price check failed upstream. Retrying...")
    }
    else {
        console.warn("Unreachable code")
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
        return fixPrice(innerText)
    }
}


await init()