export interface ScrapeRequestProduct {
    id: number,
    option: string
}

export interface ScrapeResult {
    successful: boolean,
    price: number,
    stock: number,
    retries: number
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