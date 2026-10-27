import {
  BarChart3, Boxes, ClipboardList, FileSearch, Home, LifeBuoy, MapPinned, Package, Phone, Route, Settings, ShoppingCart,
  Store, Tag, Truck, UserRound, Users, Wallet, Warehouse, Navigation, Building2,
} from "lucide-react";
import type { NavIcon } from "@/lib/nav";

export const NAV_ICONS: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
  home: Home, catalog: Package, cart: ShoppingCart, orders: ClipboardList, tickets: LifeBuoy, account: Wallet, store: Store,
  customers: Users, phone: Phone, prices: Tag, warehouse: Warehouse, planner: MapPinned, routes: Route,
  fleet: Truck, driver: Navigation, collections: Wallet, bi: BarChart3, supplier: Building2, users: UserRound,
  settings: Settings, audit: FileSearch,
};
export { Boxes };
