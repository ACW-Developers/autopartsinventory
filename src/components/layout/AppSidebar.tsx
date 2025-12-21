import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Package, Truck, ShoppingCart, BarChart3, Users, User, LogOut,
  Menu, X, Wrench, Tag, Ticket, Settings, ClipboardList, UserCheck
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Inventory', url: '/inventory', icon: Package },
  { title: 'Categories', url: '/categories', icon: Tag },
  { title: 'Suppliers', url: '/suppliers', icon: Truck },
  { title: 'Purchases', url: '/purchases', icon: ClipboardList },
  { title: 'Customers', url: '/customers', icon: UserCheck },
  { title: 'Point of Sale', url: '/pos', icon: ShoppingCart },
  { title: 'Discounts', url: '/discounts', icon: Ticket },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
];

const adminNavItems = [
  { title: 'Users', url: '/users', icon: Users },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const userNavItems = [
  { title: 'Profile', url: '/profile', icon: User },
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export function AppSidebar({ mobileOpen = false, setMobileOpen }: AppSidebarProps) {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [businessName, setBusinessName] = useState('AutoParts AZ');

  useEffect(() => {
    fetchBusinessName();
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchBusinessName();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen?.(false);
  }, [location.pathname, setMobileOpen]);

  const fetchBusinessName = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'business_name').single();
    if (data?.value) setBusinessName(data.value);
  };

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  const NavItem = ({ item }: { item: typeof mainNavItems[0] }) => {
    const isActive = location.pathname === item.url;
    return (
      <NavLink to={item.url}>
        <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
          className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            isActive ? "bg-primary/10 text-primary border border-primary/20 glow" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
          <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-sm font-medium whitespace-nowrap overflow-hidden">
                {item.title}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </NavLink>
    );
  };

  const SidebarContent = () => (
    <>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Main Menu</p>
          <div className="space-y-1">{mainNavItems.map((item) => (<NavItem key={item.url} item={item} />))}</div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Administration</p>
          <div className="space-y-1">{adminNavItems.map((item) => (<NavItem key={item.url} item={item} />))}</div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Account</p>
          <div className="space-y-1">{userNavItems.map((item) => (<NavItem key={item.url} item={item} />))}</div>
        </div>
      </nav>

      <div className="mt-auto p-3 border-t border-border/50">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="ml-3 whitespace-nowrap">Sign Out</span>
        </Button>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {businessName}</p>
        <p className="text-xs text-muted-foreground/60">All rights reserved</p>
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen?.(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-64 glass-dark flex flex-col z-50 lg:hidden"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center glow">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <h1 className="font-display text-lg font-bold gradient-text whitespace-nowrap">{businessName}</h1>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen?.(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 240 }}
        className="hidden lg:flex h-screen glass-dark flex-col border-r border-border/50 shrink-0"
      >
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center glow">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.h1 initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="font-display text-lg font-bold gradient-text whitespace-nowrap overflow-hidden">
                  {businessName}
                </motion.h1>
              )}
            </AnimatePresence>
            <Button variant="ghost" size="icon" className="ml-auto shrink-0" onClick={() => setCollapsed(!collapsed)}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="mb-4">
            <AnimatePresence>{!collapsed && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Main Menu</motion.p>)}</AnimatePresence>
            <div className="space-y-1">{mainNavItems.map((item) => (<NavItem key={item.url} item={item} />))}</div>
          </div>

          <div className="mb-4">
            <AnimatePresence>{!collapsed && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Administration</motion.p>)}</AnimatePresence>
            <div className="space-y-1">{adminNavItems.map((item) => (<NavItem key={item.url} item={item} />))}</div>
          </div>

          <div>
            <AnimatePresence>{!collapsed && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Account</motion.p>)}</AnimatePresence>
            <div className="space-y-1">{userNavItems.map((item) => (<NavItem key={item.url} item={item} />))}</div>
          </div>
        </nav>

        <div className="mt-auto p-3 border-t border-border/50">
          <Button variant="ghost" className={cn("w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10", collapsed ? "justify-center" : "justify-start")} onClick={handleSignOut}>
            <LogOut className="h-5 w-5 shrink-0" />
            <AnimatePresence>{!collapsed && (<motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="ml-3 whitespace-nowrap overflow-hidden">Sign Out</motion.span>)}</AnimatePresence>
          </Button>
        </div>

        {/* Footer */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {businessName}</p>
              <p className="text-xs text-muted-foreground/60">All rights reserved</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

    </>
  );
}
