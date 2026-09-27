import type { Product } from "../api.ts"

type Props = {
    products: Product[]
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    onSelect: (product: Product) => void
}

export default function ProductList({
    products,
    page,
    totalPages,
    onPageChange,
    onSelect,
}: Props) {
    return (
        <div>
            <h1>Products</h1>

            <div>
                {products.map((product) => (
                    <button
                        key={product.id}
                        onClick={() => onSelect(product)}
                        style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            marginBottom: "8px",
                            padding: "12px",
                            cursor: "pointer",
                        }}
                    >
                        <strong>{product.name}</strong>
                        <div>{product.brand} · {product.category}</div>
                        <small>{product.sku}</small>
                    </button>
                ))}
            </div>

            <div style={{ marginTop: "16px" }}>
                <button
                    disabled={page === 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Previous
                </button>

                <span style={{ margin: "0 12px" }}>
                    Page {page} of {totalPages}
                </span>

                <button
                    disabled={page === totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    )
}