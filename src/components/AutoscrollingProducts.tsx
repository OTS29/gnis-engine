// 1. Define the Product type your component expects
interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  categoryTag?: string
}

interface AutoscrollingProductsProps {
  products: Product[] // Now TypeScript knows what Product is
}

export default function AutoscrollingProducts({ products }: AutoscrollingProductsProps) {
  if (!products || products.length === 0) return null

  return (
    <div className="w-full overflow-hidden bg-zinc-50 py-12 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-6">
        <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400">Trending Now</h3>
        <h2 className="text-2xl font-bold text-zinc-900 mt-1">Featured Essentials</h2>
      </div>

      <div className="relative w-full flex overflow-x-hidden group py-4">
        
        {/* TRACK 1 */}
        <div className="animate-marquee flex gap-6 whitespace-nowrap shrink-0 pr-6">
          {products.map((product) => (
            <div 
              key={`track1-${product.id}`} 
              className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  product.categoryTag || 'Grooming Essential'
                )}
              </div>
              <div>
                <h4 className="font-semibold text-zinc-800 text-sm truncate">{product.name}</h4>
                <p className="text-sm font-bold text-zinc-900 mt-1">${product.price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* TRACK 2 */}
        <div className="animate-marquee flex gap-6 whitespace-nowrap shrink-0 pr-6" aria-hidden="true">
          {products.map((product) => (
            <div 
              key={`track2-${product.id}`} 
              className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300"
            >
              <div className="w-full h-44 bg-zinc-100 rounded-xl mb-4 flex items-center justify-center text-zinc-400 font-medium text-xs tracking-wider uppercase">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  product.categoryTag || 'Grooming Essential'
                )}
              </div>
              <div>
                <h4 className="font-semibold text-zinc-800 text-sm truncate">{product.name}</h4>
                <p className="text-sm font-bold text-zinc-900 mt-1">${product.price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .group:hover .animate-marquee {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
