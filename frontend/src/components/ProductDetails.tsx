import { useState } from "react"
import type { Product, ProductDetails as ProductDetailsType } from "../api.ts"

type Props = {
    product: Product
    details: ProductDetailsType | null
    loading: boolean
    onBack: () => void
    onTrack: (option: string) => Promise<void>
}

export default function ProductDetails({
    product,
    details,
    loading,
    onBack,
    onTrack,
}: Props) {
    const [selectedOption, setSelectedOption] = useState("")
    const [tracking, setTracking] = useState(false)
    const [message, setMessage] = useState("")

    if (loading || !details) {
        return (
            <div>
                <button onClick={onBack}>← Back</button>
                <p>Loading...</p>
            </div>
        )
    }

    async function handleTrack() {
        if (!selectedOption) return

        setTracking(true)
        setMessage("")

        try {
            await onTrack(selectedOption)
            setMessage("Product tracked.")
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to track product"
            )
        } finally {
            setTracking(false)
        }
    }

    return (
        <div>
            <button onClick={onBack}>← Back</button>

            <h1>{details.name}</h1>

            <p>{details.description}</p>

            <p>
                <strong>Brand:</strong> {details.brand}
            </p>

            <p>
                <strong>Category:</strong> {details.category}
            </p>

            <p>
                <strong>SKU:</strong> {details.sku}
            </p>

            <h2>{details.optionAxis}</h2>

            <div>
                {details.options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => setSelectedOption(option.label)}
                        aria-pressed={selectedOption === option.label}
                        style={{
                            marginRight: "8px",
                            padding: "8px 12px",
                        }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div style={{ marginTop: "16px" }}>
                <button
                    disabled={!selectedOption || tracking}
                    onClick={handleTrack}
                >
                    {tracking ? "Tracking..." : "Scrape this option"}
                </button>
            </div>

            {message && <p>{message}</p>}
        </div>
    )
}