import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cartStore";
import { Separator } from "@/components/ui/separator";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, getSubtotal, getTotalItems } = useCartStore();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="font-heading text-lg">Shopping Bag ({getTotalItems()})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <p className="text-muted-foreground font-body">Your bag is empty</p>
            <Button asChild onClick={onClose}>
              <Link to="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-24 object-cover rounded"
                    width={80}
                    height={96}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-body line-clamp-1">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      {item.colorName} · {item.size}
                    </p>
                    <p className="text-sm font-semibold mt-1 font-body">₹{item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm w-4 text-center font-body">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} aria-label="Remove item">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">₹{getSubtotal().toLocaleString()}</span>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild onClick={onClose}>
                  <Link to="/cart">View Cart</Link>
                </Button>
                <Button asChild onClick={onClose}>
                  <Link to="/checkout">Checkout</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
