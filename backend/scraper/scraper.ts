import { type Browser, type Locator, type Page } from "playwright"
import { expect } from "@playwright/test"
import { fixPrice, retryUntil, validate } from "./utils.ts"
import type { ScrapeRequestProduct, ScrapeResult } from "../types.ts"

const BASEURL = "https://demo.inelabteamdev.com/item"
const baseURL = "https://demo.inelabteamdev.com"

export async function scrapeProducts(browser: Browser, products: ScrapeRequestProduct[], concurrency: number, maxRetries: number) {
    const results: ScrapeResult[] = new Array(products.length)
    let nextIdx = 0
    async function worker() {
        while (true) {
            const index = nextIdx++
            if (index >= products.length) {
                return
            }

            const product = products[index]

            results[index] = await scrapeProduct(
                browser,
                product.product_id,
                product.option,
                maxRetries
            )
        }
    }

    await Promise.all(Array.from(
        { length: Math.min(concurrency, products.length) },
        () => worker()))

    return results
}

async function scrapeProduct(browser: Browser, id: number, selectedOption: string, maxRetries: number): Promise<ScrapeResult> {
    let shouldTrace = false
    const url = `${BASEURL}/${id}`
    const browserCtx = await browser.newContext()


    if (process.env.TRACING === '1') {
        await browserCtx.tracing.start({
            screenshots: true,
            snapshots: true,
        })
    }
    const page = await browserCtx.newPage()

    // A GET request to the api/v2/ui/manifest returns a respons that contains classes for prices
    const manifestPromise = page.waitForResponse(response => response.request().method() === "GET" && response.request().url().includes("ui/manifest"))
    await page.goto(url)
    const manifestResponse = await manifestPromise
    const manifestData = await manifestResponse.json()

    const stockClass: string = manifestData.classes.stock
    const actualPriceClass: string = manifestData.classes.priceValue

    const cookieRejectLabel = page.getByLabel("Reject cookies")

    const printer = (msg: string) => `[FAILURE] Product ID:  ${id}\tReason: ` + msg

    // Deal with cookie popup
    await page.addLocatorHandler(cookieRejectLabel, async () => {
        await retryUntil(() => cookieRejectLabel.click(), () => expect(cookieRejectLabel).not.toBeAttached(), maxRetries, "Cannot close cookie popup.")
    })

    const nameOfProduct = await getProductName(id.toString())
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
        const res = await getPriceWithRetry(page, maxRetries, actualPriceClass, stockClass)
        shouldTrace = true

        if (res.outcome != "FAILED") {
            return { ...res, name: nameOfProduct, product_id: id, option: selectedOption, scraped_at: new Date().toISOString() }
        }
        else throw new Error("Scraping was unsuccesful. ");
    }
    catch (e) {
        if (e instanceof Error) console.error(printer(e.message))
        else console.error("Unknown error occured")
        return {
            outcome: "FAILED",
            price: null,
            stock: null,
            retries: maxRetries,
            name: nameOfProduct,
            product_id: id,
            option: selectedOption,
            scraped_at: new Date().toISOString()
        }
    }
    finally {
        if (process.env.TRACING === '1') {
            if (shouldTrace) {
                await browserCtx.tracing.stop()
            } else {
                await browserCtx.tracing.stop({
                    path: `traces/${id}.zip`
                })
            }
        }
        await browserCtx.close()
    }
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


async function getPriceWithRetry(page: Page, maxRetries: number, actualPriceClass: string, stockClass: string) {
    /*
    Try scraping the price with a automatic retries & exponential backoff
     */
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const priceBtn = page.getByLabel("Check today’s price")
    const retryBtn = page.getByRole("button", { name: "Retry" })

    await retryUntil(() => priceBtn.click(), () => expect(priceBtn).not.toBeAttached({ timeout: 2000 }), maxRetries, "Check today's price Button cannot be clicked.")

    for (let i = 0; i < maxRetries; i++) {
        const data = await getDetails(page, actualPriceClass, stockClass)

        if (data.outcome !== "FAILED") return { ...data, retries: i, outcome: i === 0 ? "SUCCESS" : "RETRIED" };

        await validate(() => expect(retryBtn).toBeAttached({ timeout: 2000 }), "Retry Button not found")

        await sleep(Math.pow(2, i) * 1000)
        await retryUntil(() => retryBtn.click(), () => expect(retryBtn).not.toBeAttached({ timeout: 2000 }), maxRetries, "Could not retry the price check")
    }
    return {
        outcome: "FAILED",
        price: null,
        stock: null,
        retries: maxRetries
    }
}

async function getDetails(page: Page, actualPriceClass: string, stockClass: string) {
    const offerPanel = page.locator('div.offer-panel')

    // Wait for it show success or fail
    try {
        await expect(offerPanel).toHaveClass(/(?:^|\s)(?:offer-ready|offer-failed)(?:\s|$)/, { timeout: 15000 })
    }
    catch (e) {
        throw new Error("Price request took more than 15s", { cause: e })
    }

    const classes = await offerPanel.getAttribute("class")

    if (classes?.includes("offer-ready")) {
        const priceStr = fixPrice(await page.locator(`.${actualPriceClass}`).innerText())
        const price = Number(priceStr)
        const stockEl = await page.locator(`.${stockClass}`).innerText()
        if (stockEl === 'SOLD OUT') return {
            outcome: "SUCCESS",
            price: price,
            stock: 0
        }
        const stockRegex = stockEl.match(/\d+/)
        if (!stockRegex) throw new Error("Stock could not be scraped")
        const stock = Number(stockRegex[0])
        return {
            outcome: "SUCCESS",
            price: price,
            stock: stock
        }
    }
    else if (classes?.includes("offer-failed")) {
        console.warn("Price check failed upstream. Retrying...")
    }
    else {
        console.warn("Unreachable code")
    }
    return {
        outcome: "FAILED",
        price: null,
        stock: null
    }
}

export async function getProductName(id: string) {
    try {
        const response = await fetch(`${baseURL}/api/v2/items/${id}`)
        if (!response.ok) throw new Error("Could not fetch product details")
        const data = await response.json()
        const name: string = data.name
        return name
    }
    catch (e) {
        throw e
    }
}