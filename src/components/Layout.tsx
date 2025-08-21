import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-white text-primary px-3 py-1 rounded font-bold text-lg">
                PEAK
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                to="/" 
                className={`hover:text-primary-light transition-colors ${isActive('/') ? 'text-primary-light' : ''}`}
              >
                Home
              </Link>
              <Link 
                to="/about" 
                className={`hover:text-primary-light transition-colors ${isActive('/about') ? 'text-primary-light' : ''}`}
              >
                About Us
              </Link>
              <Link 
                to="/contact" 
                className={`hover:text-primary-light transition-colors ${isActive('/contact') ? 'text-primary-light' : ''}`}
              >
                Contact Us
              </Link>
              <Link 
                to="/motor-insurance" 
                className={`hover:text-primary-light transition-colors ${isActive('/motor-insurance') ? 'text-primary-light' : ''}`}
              >
                Motor Insurance
              </Link>
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
            </nav>

            {/* Search */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-10 w-64 bg-white text-foreground"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

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

            {/* Login Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Login</h3>
              <div className="space-y-2 text-sm">
                <Link to="/login" className="block text-gray-300 hover:text-white transition-colors">Login</Link>
                <Link to="/register" className="block text-gray-300 hover:text-white transition-colors">Register</Link>
                <Link to="/dashboard" className="block text-gray-300 hover:text-white transition-colors">Agent Login</Link>
                <Link to="/dashboard" className="block text-gray-300 hover:text-white transition-colors">CSR Login</Link>
                <Link to="/dashboard" className="block text-gray-300 hover:text-white transition-colors">Engineer Login</Link>
                <Link to="/dashboard" className="block text-gray-300 hover:text-white transition-colors">Manager Login</Link>
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