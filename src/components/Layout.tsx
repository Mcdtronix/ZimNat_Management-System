import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Facebook, Twitter, Instagram, Linkedin, Youtube, Menu } from "lucide-react";
import { getAuthToken, clearAuthTokens } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

interface LayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

const Layout = ({ children, hideSidebar = false }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(!!getAuthToken());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const onStorage = () => setIsAuthed(!!getAuthToken());
    window.addEventListener("storage", onStorage);
    // global logout handler (e.g., refresh failure)
    const onAuthLogout = () => {
      setIsAuthed(false);
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:logout", onAuthLogout as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:logout", onAuthLogout as EventListener);
    };
  }, []);

  const handleLogout = () => {
    clearAuthTokens();
    setIsAuthed(false);
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="w-full pr-0 pl-4 md:pl-5">
          <div className="flex items-center justify-between h-16">
            {/* Left: Sidebar toggle + Logo */}
            <div className="flex items-center gap-2">
              {isAuthed && (
                <button
                  aria-label="Toggle sidebar"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-primary/80"
                  onClick={() => setSidebarOpen((v) => !v)}
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <Link to="/" className="flex items-center space-x-2 h-10">
                <div className="bg-white text-primary px-3 rounded font-bold text-lg h-10 flex items-center">
                  PEAK
                </div>
              </Link>
            </div>

            {/* Navigation (trimmed per request) */}
            <nav className="hidden md:flex items-center space-x-8">
              {!isAuthed && (
                <>
                  <Link 
                    to="/login" 
                    className={`hover:text-primary-light transition-colors ${isActive('/login') ? 'text-primary-light' : ''}`}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className={`hover:text-primary-light transition-colors ${isActive('/register') ? 'text-primary-light' : ''}`}
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>

            {/* Search (authenticated users only) + Profile dropdown */}
            <div className="flex items-center gap-3">
              {isAuthed && (
                <>
                  <div className="relative hidden lg:block">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search..." 
                      className="pl-10 w-64 bg-white text-foreground"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none">
                      <div className={`inline-flex items-center gap-2 rounded-full p-1 bg-white text-primary hover:bg-white/90 transition-colors ${isActive('/profile') ? 'ring-2 ring-offset-2 ring-white/50' : ''}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" alt="User" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">ME</AvatarFallback>
                        </Avatar>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="w-full">My Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="w-full">Settings</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {isAuthed && !hideSidebar && <Sidebar open={sidebarOpen} />}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Hotline */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Hotline</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>+94 77 185 4709</p>
                <p>+94 77 185 4709</p>
                <p>+94 77 185 4709</p>
                <p>info@drivepeak.lk</p>
              </div>
            </div>

            {/* Head Office */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Head Office</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>Rakshana Mandiraya</p>
                <p>No.21,</p>
                <p>Vauxhall Street,</p>
                <p>Colombo 02,</p>
                <p>Sri Lanka</p>
              </div>
            </div>

            {/* Footer Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2 text-sm">
                <Link to="/" className="block text-gray-300 hover:text-white transition-colors">Home</Link>
                <Link to="/about" className="block text-gray-300 hover:text-white transition-colors">About Us</Link>
                <Link to="/contact" className="block text-gray-300 hover:text-white transition-colors">Contact Us</Link>
                <Link to="/motor-insurance" className="block text-gray-300 hover:text-white transition-colors">Motor Insurance</Link>
              </div>
            </div>

            {/* Social Media */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Get social with us</h3>
              <div className="flex space-x-4">
                <Facebook className="h-6 w-6 text-gray-300 hover:text-white cursor-pointer transition-colors" />
                <Twitter className="h-6 w-6 text-gray-300 hover:text-white cursor-pointer transition-colors" />
                <Instagram className="h-6 w-6 text-gray-300 hover:text-white cursor-pointer transition-colors" />
                <Linkedin className="h-6 w-6 text-gray-300 hover:text-white cursor-pointer transition-colors" />
                <Youtube className="h-6 w-6 text-gray-300 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800">
          <div className="container mx-auto px-4 py-4">
            <p className="text-center text-sm text-gray-400">
              Copyright © 2024 Drive Peak. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;