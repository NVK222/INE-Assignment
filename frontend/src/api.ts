export const API_URL = import.meta.env.VITE_API_URL ?? "http//localhost:3000"

export type Product = {
    id: number
    slug: string
    name: string
    brand: string
    category: string
    sku: string
    description: string
}

export type ProductDetails = Product & {
    specs: Record<string, string | number>
    reviews: {
        id: string
        author: string
        rating: number
        title: string
        body: string
        date: string
        verifiedPurchase: boolean
        helpfulVotes: number
    }[]
    optionAxis: string
    options: {
        id: string
        label: string
    }[]
}

type ProductListResponse = {
    page: number
    perPage: number
    totalPages: number
    count: number
    results: Product[]
}

export type DashboardProduct = {
    id: number
    name: string
    brand: string
    category: string
    option: string
}

export type ScrapeAttempt = {
    scraped_at: string
    price: number | null
    stock: number | null
    outcome: string
}

export async function getProducts(page: number, limit = 20, search = "") {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    })
    if (search.trim()) {
        params.set("search", search.trim())
    }
    const response = await fetch(
        `${API_URL}/api/products?${params}`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch products")
    }

    return response.json() as Promise<ProductListResponse>
}

export async function getProduct(id: number) {
    const response = await fetch(`${API_URL}/api/product/${id}`)

    if (!response.ok) {
        throw new Error("Failed to fetch product")
    }

    return response.json() as Promise<ProductDetails>
}

export async function trackProduct(product_id: number, option: string) {
    const response = await fetch(`${API_URL}/api/track`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            product_id,
            option,
        }),
    })

    if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Failed to track product")
    }

    return response.json()
}

export async function getDashboardProducts() {
    const response = await fetch(`${API_URL}/api/dashboard`)

    if (!response.ok) {
        throw new Error("Failed to fetch dashboard products")
    }

    return response.json() as Promise<DashboardProduct[]>
}

export async function getProductHistory(
    productId: number,
    option: string
) {
    const params = new URLSearchParams({ option })

    const response = await fetch(
        `${API_URL}/api/dashboard/${productId}?${params}`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch product history")
    }

    return response.json() as Promise<ScrapeAttempt[]>
}

export async function removeTrackedProduct(
    productId: number,
    option: string
) {
    const response = await fetch(`${API_URL}/api/tracked`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            product_id: productId,
            option,
        }),
    })

    if (!response.ok) {
        const data = await response.json().catch(() => null)

        throw new Error(
            data?.error ?? "Failed to remove tracked product"
        )
    }
}