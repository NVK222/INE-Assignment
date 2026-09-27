import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"

import type {
    DashboardProduct,
    ScrapeAttempt,
} from "../api.ts"

type Props = {
    product: DashboardProduct
    history: ScrapeAttempt[]
    loading: boolean
    onBack: () => void
}

export default function DashboardDetails({
    product,
    history,
    loading,
    onBack,
}: Props) {
    if (loading) {
        return (
            <div>
                <button onClick={onBack}>← Back</button>
                <p>Loading history...</p>
            </div>
        )
    }

    const priceHistory = history.filter(
        (item) => item.price !== null
    )

    const stockHistory = history.filter(
        (item) => item.stock !== null
    )

    return (
        <div>
            <button onClick={onBack}>← Back</button>

            <h1>{product.name}</h1>

            <p>
                {product.brand} · {product.category}
            </p>

            <p>
                <strong>Option:</strong> {product.option}
            </p>

            <h2>Price History</h2>

            {priceHistory.length === 0 ? (
                <p>No price history available.</p>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="scraped_at"
                            tickFormatter={(value) =>
                                new Date(value).toLocaleDateString()
                            }
                        />

                        <YAxis />

                        <Tooltip
                            labelFormatter={(value) =>
                                new Date(
                                    value as string
                                ).toLocaleString()
                            }
                            formatter={(value) => [
                                `₹${Number(value).toLocaleString()}`,
                                "Price",
                            ]}
                        />

                        <Line
                            type="monotone"
                            dataKey="price"
                            strokeWidth={2}
                            dot
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}

            <h2>Stock History</h2>

            {stockHistory.length === 0 ? (
                <p>No stock history available.</p>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stockHistory}>
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="scraped_at"
                            tickFormatter={(value) =>
                                new Date(value).toLocaleDateString()
                            }
                        />

                        <YAxis />

                        <Tooltip
                            labelFormatter={(value) =>
                                new Date(
                                    value as string
                                ).toLocaleString()
                            }
                            formatter={(value) => [
                                value,
                                "Stock",
                            ]}
                        />

                        <Line
                            type="monotone"
                            dataKey="stock"
                            strokeWidth={2}
                            dot
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}

            <h2>Scrape Attempts</h2>

            {history.length === 0 ? (
                <p>No scrape attempts yet.</p>
            ) : (
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                    }}
                >
                    <thead>
                        <tr>
                            <th align="left">Time</th>
                            <th align="left">Outcome</th>
                            <th align="left">Price</th>
                            <th align="left">Stock</th>
                        </tr>
                    </thead>

                    <tbody>
                        {[...history]
                            .reverse()
                            .map((attempt, index) => (
                                <tr key={index}>
                                    <td>
                                        {new Date(
                                            attempt.scraped_at
                                        ).toLocaleString()}
                                    </td>

                                    <td>{attempt.outcome}</td>

                                    <td>
                                        {attempt.price !== null
                                            ? `₹${attempt.price.toLocaleString()}`
                                            : "—"}
                                    </td>

                                    <td>
                                        {attempt.stock !== null
                                            ? attempt.stock
                                            : "—"}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}