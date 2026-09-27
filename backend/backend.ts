import express from 'express'
import { chromium } from 'playwright'
import { scrapeProducts } from "./scraper/scraper.ts"
import type { ProductFullDetails, ScrapeRequestProduct } from './types.ts'
import { supabase } from './db/db.ts'
import { PostgrestError } from '@supabase/supabase-js'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const baseURL = "https://demo.inelabteamdev.com"

const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' })

app.use(express.json())


// Endpoint to scrape products on demand (For Testing)
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
        return res.status(200).json(results)
    }
    catch (e) {
        return res.status(500).json({
            error: e instanceof Error ? e.message : "Unknown Error occured in scraping products"
        })
    }
})

// Endpoint that scrapes products from tracked table
app.get("/api/scrape", async (req, res) => {
    try {
        const { data: products, error: selectError } = await supabase.from("tracked").select("product_id, option")
        if (selectError) throw selectError
        if (!products) return res.status(200).json({
            "message": "No products to scrape"
        })

        res.status(202).json({ message: "Scraping started" })


        const results = await scrapeProducts(browser, products, Number(process.env.CONCURRENCY ?? '1'), 4)
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
    }
    catch (e) {
        if (!res.headersSent)
            if (e instanceof Error || e instanceof PostgrestError) {
                return res.status(500).json({ error: e.message })
            }
            else console.error(e instanceof Error || e instanceof PostgrestError ? e.message : "Unknown Error occured in scraping products")
    }
})

// Fetches products
app.get("/api/products", async (req, res) => {
    const limit = Number(req.query.limit ?? 20)
    const page = Number(req.query.page ?? 1)
    const search = String(req.query.search ?? "").trim().toLowerCase()

    const apiURL = `${baseURL}/api/v2/listings?page=${page}&limit=${limit}`

    try {
        if (!search) {
            const response = await fetch(apiURL)

            if (!response.ok) throw new Error("Error fetching")

            const data = await response.json()
            return res.status(200).json({
                page: data.page,
                totalPages: data.totalPages,
                count: data.count,
                results: data.results,
            })
        }

        const allProductsData = await fetch(
            `${baseURL}/api/v2/listings?page=1&limit=1000`
        )

        if (!allProductsData.ok) {
            throw new Error("Error fetching products")
        }

        const fullData = await allProductsData.json()
        const allProducts = [...fullData.results]

        const filteredProducts = allProducts.filter((product) => {
            return (
                product.name.toLowerCase().includes(search)
            )
        })

        const totalPages = Math.ceil(filteredProducts.length / limit)
        const start = (page - 1) * limit

        return res.status(200).json({
            page,
            totalPages,
            count: filteredProducts.length,
            results: filteredProducts.slice(start, start + limit),
        })
    }
    catch (e) {
        console.error("Error fetching products")

        if (e instanceof Error) {
            return res.status(500).json({ error: e.message })
        }

        return res.status(500).json({
            error: "Unknown Error Occured in fetching products"
        })
    }
})

app.get("/api/product/:id", async (req, res) => {
    const apiURL = `${baseURL}/api/v2/items/${req.params.id}`
    try {
        const response = await fetch(apiURL)
        if (!response.ok) throw new Error("Error fetching product detauls")
        const data: ProductFullDetails = await response.json()
        return res.status(200).json(data)
    }
    catch (e) {
        console.error("Error fetching product details")
        if (e instanceof Error) {
            return res.status(500).json({ error: e.message })
        }
        return res.status(500).json({
            error: "Unknown Error Occured in fetching products"
        })
    }
})

app.post("/api/track", async (req, res) => {
    const product_id: number = req.body.product_id
    const option: string = req.body.option

    try {
        const { error: insertError } = await supabase.from("tracked").insert({
            product_id: product_id,
            option: option
        })

        if (insertError) throw insertError

        return res.status(201).json({
            message: "Product tracked successfully"
        })
    }
    catch (e) {
        console.error("Error tracking a product")
        if (e instanceof Error || e instanceof PostgrestError) {
            return res.status(500).json({ error: e.message })
        }
        return res.status(500).json({
            error: "Unknown Error Occured in tracking product"
        })
    }
})

app.get("/api/dashboard/export", async (_req, res) => {
    try {
        const { data: logs, error } = await supabase
            .from("scraped_data")
            .select(
                "product_id, option, name, price, stock, scraped_at, outcome"
            )
            .order("scraped_at", { ascending: true })

        if (error) throw error

        const headers = [
            "product_id",
            "option",
            "name",
            "price",
            "stock",
            "scraped_at",
            "outcome",
        ]

        const escapeCsv = (value: unknown) => {
            if (value === null || value === undefined) {
                return ""
            }

            const stringValue = String(value)

            if (
                stringValue.includes(",") ||
                stringValue.includes('"') ||
                stringValue.includes("\n")
            ) {
                return `"${stringValue.replaceAll('"', '""')}"`
            }

            return stringValue
        }

        const csv = [
            headers.join(","),
            ...(logs ?? []).map((log) =>
                headers
                    .map((header) =>
                        escapeCsv(
                            log[header as keyof typeof log]
                        )
                    )
                    .join(",")
            ),
        ].join("\n")

        res.setHeader("Content-Type", "text/csv")
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="scrape-logs.csv"'
        )

        return res.status(200).send(csv)
    } catch (e) {
        console.error("Error exporting scrape logs")

        return res.status(500).json({
            error:
                e instanceof Error
                    ? e.message
                    : "Unknown error occurred while exporting logs",
        })
    }
})

app.get("/api/dashboard", async (_req, res) => {
    try {
        const { data: tracked, error: trackedError } = await supabase
            .from("tracked")
            .select("product_id, option")

        if (trackedError) throw trackedError

        if (!tracked || tracked.length === 0) {
            return res.status(200).json([])
        }

        const results = []

        for (const item of tracked) {
            const response = await fetch(
                `${baseURL}/api/v2/items/${item.product_id}`
            )

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch product ${item.product_id}`
                )
            }

            const product = await response.json()

            results.push({
                id: product.id,
                name: product.name,
                brand: product.brand,
                category: product.category,
                option: item.option,
            })
        }

        return res.status(200).json(results)
    } catch (e) {
        console.error("Error fetching dashboard")

        return res.status(500).json({
            error:
                e instanceof Error
                    ? e.message
                    : "Unknown error occurred while fetching dashboard",
        })
    }
})

app.get("/api/dashboard/:productId", async (req, res) => {
    const productId = Number(req.params.productId)
    const option = String(req.query.option ?? "")

    if (!Number.isInteger(productId) || !option) {
        return res.status(400).json({
            error: "productId and option are required",
        })
    }

    try {
        const { data, error } = await supabase
            .from("scraped_data")
            .select("scraped_at, price, stock, outcome")
            .eq("product_id", productId)
            .eq("option", option)
            .order("scraped_at", { ascending: true })

        if (error) throw error

        return res.status(200).json(data ?? [])
    } catch (e) {
        console.error("Error fetching dashboard history")

        return res.status(500).json({
            error:
                e instanceof Error
                    ? e.message
                    : "Unknown error occurred while fetching history",
        })
    }
})

app.delete("/api/tracked", async (req, res) => {
    const { product_id, option } = req.body

    if (!product_id || !option) {
        return res.status(400).json({
            error: "product_id and option are required",
        })
    }

    try {
        const { error } = await supabase
            .from("tracked")
            .delete()
            .eq("product_id", product_id)
            .eq("option", option)

        if (error) throw error

        return res.status(204).send()
    } catch (e) {
        console.error("Error removing tracked product")

        return res.status(500).json({
            error:
                e instanceof Error
                    ? e.message
                    : "Unknown error occurred while removing tracked product",
        })
    }
})



app.get("/api/health", (req, res) => {
    return res.status(200).json({
        "health": "ok"
    })
})

app.listen(port, () => {
    console.log("Backend started...")
})