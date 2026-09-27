export interface ScrapeRequestProduct {
    product_id: number,
    option: string
}

export interface ScrapeResult {
    outcome: string,
    price: number | null,
    stock: number | null,
    retries: number,
    name: string
    product_id: number
    option: string
    scraped_at: string
}

export interface ProductFullDetails {
    id: number,
    slug: string,
    name: string,
    brand: string,
    category: string,
    sku: string,
    description: string
}