import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Package } from 'lucide-react';

export const PricingTable = () => {
  const { items, subtotal, tax, totalPrice } = useWorkspaceStore();

  const groupedItems = Object.values(items.reduce((acc, item) => {
    if (!acc[item.name]) acc[item.name] = { ...item, qty: 1 };
    else acc[item.name].qty++;
    return acc;
  }, {} as Record<string, any>));

  return (
    <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="flex items-center space-x-3 mb-4 border-b border-white/10 pb-4">
        <div className="p-2 bg-emerald-500/20 rounded-lg">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
        </div>
        <h3 className="font-semibold text-white">Live Quotation</h3>
      </div>

      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
        <AnimatePresence>
          {items.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-sm text-zinc-500 text-center py-6 flex flex-col items-center space-y-2"
            >
              <Package className="w-6 h-6 opacity-30 mb-1" />
              <span>Your workspace is empty.</span>
              <span className="text-xs">Ask the AI to add items.</span>
            </motion.div>
          )}
          {groupedItems.map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex justify-between items-start text-sm group"
            >
              <div className="flex items-start space-x-2 pt-1 flex-1 min-w-0 pr-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                <span className="text-zinc-300 leading-snug break-words">
                  {item.name} {item.qty > 1 && <span className="text-indigo-400 font-medium ml-1">x{item.qty}</span>}
                </span>
              </div>
              <span className="text-zinc-100 font-medium shrink-0 pt-1">${(Number.isNaN(Number(item.price)) ? 0 : Number(item.price) * item.qty).toLocaleString()}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="pt-4 border-t border-white/10 space-y-2">
        <div className="flex justify-between items-center text-sm text-zinc-400">
          <span>Subtotal</span>
          <span>${(Number.isNaN(Number(subtotal)) ? 0 : Number(subtotal)).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-zinc-400">
          <span>Tax (10%)</span>
          <span>${(Number.isNaN(Number(tax)) ? 0 : Number(tax)).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-end pt-2 mt-2 border-t border-white/5">
          <span className="text-sm text-zinc-300">Total Build</span>
          <motion.span 
            key={totalPrice}
            initial={{ scale: 1.1, color: '#10b981' }}
            animate={{ scale: 1, color: '#ffffff' }}
            className="text-xl sm:text-2xl font-bold tracking-tight text-white shrink-0"
          >
            ${(Number.isNaN(Number(totalPrice)) ? 0 : Number(totalPrice)).toLocaleString()}
          </motion.span>
        </div>
      </div>
      
      <button 
        disabled={items.length === 0}
        className="w-full mt-5 py-2.5 bg-white text-black font-semibold rounded-xl text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Checkout Setup
      </button>
    </div>
  );
};
