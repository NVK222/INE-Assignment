import { useEffect, useState } from "react"
import {
  getDashboardProducts,
  getProductHistory,
  removeTrackedProduct,
  getProduct,
  getProducts,
  trackProduct,
  type Product,
  type ProductDetails,
  type DashboardProduct,
  type ScrapeAttempt
} from "./api.ts"
import ProductList from "./components/ProductList.tsx"
import ProductDetailsView from "./components/ProductDetails.tsx"
import Dashboard from "./components/Dashboard.tsx"
import DashboardDetails from "./components/DashboardDetails.tsx"

export default function App() {
  const [page, setPage] = useState(1)

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  const [products, setProducts] = useState<Product[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)

  const [loading, setLoading] = useState(false)

  const [dashboardProducts, setDashboardProducts] = useState<DashboardProduct[]>([])

  const [dashboardProduct, setDashboardProduct] = useState<DashboardProduct | null>(null)
  const [dashboardHistory, setDashboardHistory] = useState<ScrapeAttempt[]>([])
  const isDashboard = window.location.pathname === "/dashboard"

  useEffect(() => {
    if (!localStorage.getItem("backend-notice-shown")) {
      alert(
        "The server may take a few seconds to start when opening the site for the first time."
      )
      localStorage.setItem("backend-notice-shown", "true")
    }
  }, [])
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

  async function openDashboardProduct(product: DashboardProduct) {
    setDashboardProduct(product)
    setDashboardHistory([])
    setLoading(true)

    try {
      const history = await getProductHistory(
        product.id,
        product.option
      )

      setDashboardHistory(history)
    } catch (error) {
      console.error(
        "Failed to fetch dashboard history:",
        error
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isDashboard) return

    setLoading(true)

    getDashboardProducts()
      .then(setDashboardProducts)
      .catch((error) => {
        console.error(
          "Failed to fetch dashboard products:",
          error
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isDashboard])

  async function removeDashboardProduct(
    product: DashboardProduct
  ) {
    try {
      await removeTrackedProduct(product.id, product.option)

      setDashboardProducts((current) =>
        current.filter(
          (item) =>
            item.id !== product.id ||
            item.option !== product.option
        )
      )
    } catch (error) {
      console.error(
        "Failed to remove tracked product:",
        error
      )
    }
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

  if (isDashboard) {
    return (
      <main style={{ maxWidth: "1000px", margin: "40px auto" }}>
        <button onClick={() => {
          window.location.href = "/"
        }}>
          Products
        </button>

        {!dashboardProduct ? (
          <Dashboard
            products={dashboardProducts}
            loading={loading}
            onSelect={openDashboardProduct}
            onRemove={removeDashboardProduct}
          />
        ) : (
          <DashboardDetails
            product={dashboardProduct}
            history={dashboardHistory}
            loading={loading}
            onBack={() => {
              setDashboardProduct(null)
              setDashboardHistory([])
            }}
          />
        )}
      </main>
    )
  }

  return (

    <main style={{ maxWidth: "800px", margin: "40px auto" }}>
      <button
        onClick={() => {
          window.location.href = "/dashboard"
        }}
      >
        Dashboard
      </button>
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