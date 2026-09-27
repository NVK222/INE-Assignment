import { API_URL, type DashboardProduct } from "../api.ts"

type Props = {
    products: DashboardProduct[]
    loading: boolean
    onSelect: (product: DashboardProduct) => void
    onRemove: (product: DashboardProduct) => void
}

export default function Dashboard({
    products,
    loading,
    onSelect,
    onRemove,
}: Props) {
    if (loading) {
        return <p>Loading tracked products...</p>
    }

    if (products.length === 0) {
        return <p>No products are currently being tracked.</p>
    }

    return (

        <div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                }}
            >
                <h1>Dashboard</h1>

                <button
                    onClick={() => {
                        window.location.href = `${API_URL}/api/dashboard/export`
                    }}
                >
                    Export CSV
                </button>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "16px",
                }}
            >
                {products.map((product) => (
                    <div
                        key={`${product.id}-${product.option}`}
                        style={{
                            position: "relative",
                            border: "1px solid #ddd",
                        }}
                    >
                        <button
                            onClick={() => onSelect(product)}
                            style={{
                                width: "100%",
                                padding: "16px",
                                textAlign: "left",
                                cursor: "pointer",
                            }}
                        >
                            <strong>{product.name}</strong>

                            <div>{product.brand}</div>

                            <div>{product.category}</div>

                            <div style={{ marginTop: "8px" }}>
                                {product.option}
                            </div>
                        </button>

                        <button
                            onClick={(event) => {
                                event.stopPropagation()
                                onRemove(product)
                            }}
                            aria-label={`Remove ${product.name} from tracking`}
                            style={{
                                position: "absolute",
                                top: "6px",
                                right: "6px",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: "20px",
                                lineHeight: 1,
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}