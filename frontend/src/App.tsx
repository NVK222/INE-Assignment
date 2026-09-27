import { useEffect, useState } from "react"
import {
  getProduct,
  getProducts,
  trackProduct,
  type Product,
  type ProductDetails,
} from "./api.ts"
import ProductList from "./components/ProductList.tsx"
import ProductDetailsView from "./components/ProductDetails.tsx"

export default function App() {
  const [page, setPage] = useState(1)

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  const [products, setProducts] = useState<Product[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productDetails, setProductDetails] =
    useState<ProductDetails | null>(null)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)

    getProducts(page, 20, search)
      .then((data) => {
        setProducts(data.results)
        setTotalPages(data.totalPages)
      })
      .catch((error) => {
        console.error("Failed to fetch products:", error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [page, search])

  function handleSearch() {
    setPage(1)
    setSearch(searchInput.trim())
  }

  async function selectProduct(product: Product) {
    setSelectedProduct(product)
    setProductDetails(null)
    setLoading(true)

    try {
      const details = await getProduct(product.id)
      setProductDetails(details)
    } catch (error) {
      console.error("Failed to fetch product:", error)
    } finally {
      setLoading(false)
    }
  }

  function goBack() {
    setSelectedProduct(null)
    setProductDetails(null)
  }

  async function trackSelectedProduct(option: string) {
    if (!selectedProduct) return

    await trackProduct(selectedProduct.id, option)
  }

  if (selectedProduct) {
    return (
      <ProductDetailsView
        product={selectedProduct}
        details={productDetails}
        loading={loading}
        onBack={goBack}
        onTrack={trackSelectedProduct}
      />
    )
  }

  return (
    <main style={{ maxWidth: "800px", margin: "40px auto" }}>
      <h1>Products</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="search"
          placeholder="Search products..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch()
            }
          }}
          style={{
            flex: 1,
            padding: "10px",
          }}
        />

        <button onClick={handleSearch}>
          Search
        </button>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <ProductList
          products={products}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onSelect={selectProduct}
        />
      )}
    </main>
  )
}