import express from 'express'
import { chromium } from 'playwright'
import { getProductName, scrapeProducts } from "./main.ts"
import type { ProductFullDetails, ScrapeRequestProduct } from './types.ts'
import { supabase } from './db.ts'

const app = express()
const port = 3000
const baseURL = "https://demo.inelabteamdev.com"

const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' })

app.use(express.json())

app.post("/api/test", async (req, res) => {
    try {
        const productsToScrape: ScrapeRequestProduct[] = req.body
        const results = await scrapeProducts(browser, productsToScrape, 3, 4)
        const { error } = await supabase.from("scraped_data").insert(
            results.map(result => ({
                product_id: result.product_id,
                option: result.option,
                name: result.name,
                price: result.price,
                stock: result.stock,
                scraped_at: result.scraped_at,
                outcome: result.outcome
            }))
        )
        if (error) throw error
        res.status(200).json(results)
    }
    catch (e) {
        res.status(500).json({
            error: e instanceof Error ? e.message : "Unknown Error occured in scraping products"
        })
    }
})

app.get("/api/scrape", async (req, res) => {
    try {
        const { data: products, error: selectError } = await supabase.from("tracked").select("product_id, option")
        if (selectError) throw selectError
        if (!products) res.status(200).json({
            "message": "No products to scrape"
        })
        const results = await scrapeProducts(browser, products, 3, 4)
        const { error: insertError } = await supabase.from("scraped_data").insert(
            results.map(result => ({
                product_id: result.product_id,
                option: result.option,
                name: result.name,
                price: result.price,
                stock: result.stock,
                scraped_at: result.scraped_at,
                outcome: result.outcome
            }))
        )
        if (insertError) throw insertError
        res.status(200).json(results)
    }
    catch (e) {
        res.status(500).json({
            error: e instanceof Error ? e.message : "Unknown Error occured in scraping products"
        })
    }
})

app.get("/api/products", async (req, res) => {
    const limit = Number(req.query.limit ?? 20)
    const page = Number(req.query.page ?? 1)

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
        else res.status(500).json({ error: "Unknown Error Occured in fetching products" })
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