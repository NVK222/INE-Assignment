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
  const [products, setProducts] = useState<Product[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productDetails, setProductDetails] =
    useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)

    getProducts(page)
      .then((data) => {
        setProducts(data.results)
        setTotalPages(data.totalPages)
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [page])

  async function selectProduct(product: Product) {
    setSelectedProduct(product)
    setProductDetails(null)
    setLoading(true)

    try {
      const details = await getProduct(product.id)
      setProductDetails(details)
    } catch (error) {
      console.error(error)
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