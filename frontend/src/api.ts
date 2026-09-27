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

export async function getProducts(page: number, limit = 20, search = "") {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    })
    if (search.trim()) {
        params.set("search", search.trim())
    }
    const response = await fetch(
        `/api/products?${params}`
    )

    if (!response.ok) {
        throw new Error("Failed to fetch products")
    }

    return response.json() as Promise<ProductListResponse>
}

export async function getProduct(id: number) {
    const response = await fetch(`/api/product/${id}`)

    if (!response.ok) {
        throw new Error("Failed to fetch product")
    }

    return response.json() as Promise<ProductDetails>
}

export async function trackProduct(product_id: number, option: string) {
    const response = await fetch(`/api/track`, {
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