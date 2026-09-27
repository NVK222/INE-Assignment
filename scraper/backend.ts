import express from 'express'
import { chromium } from 'playwright'
import { scrapeProducts } from "./main.ts"
import type { ProductFullDetails, ScrapeRequestProduct } from './types.ts'

const app = express()
const port = 3000
const baseURL = "https://demo.inelabteamdev.com"

const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' })

app.use(express.json())

app.post("/api/scrape", async (req, res) => {
    try {
        const productsToScrape: ScrapeRequestProduct[] = req.body
        const results = await scrapeProducts(browser, productsToScrape, 3, 4)
        res.status(200).json(results)
    }
    catch (e) {
        res.status(500).json({
            error: "Unknown Error occured"
        })
    }
})

app.get("/api/products", async (req, res) => {
    const limit = Number(req.query.limit) ?? 20
    const page = Number(req.query.page) ?? 1

    const apiURL = `${baseURL}/api/v2/listings?page=${page}&limit=${limit}`
    try {
        const response = await fetch(apiURL)
        if (!response.ok) throw new Error("Error fetching")
        const data = await response.json()
        const products: ProductFullDetails[] = data.results
        res.status(200).json(products)
    }
    catch (e) {
        console.error("Error fetching products")
        if (e instanceof Error) res.status(500).json({ error: e.message })
        else res.status(500).json({ error: "Unknown Error Occured" })
    }
})

app.get("/api/health", (req, res) => {
    res.status(200).json({
        "health": "ok"
    })
})

app.listen(port, () => {
    console.log("Backend started...")
})