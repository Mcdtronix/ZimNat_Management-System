# 🚀 Production Deployment Guide - Payment Integration

## ⚠️ **CRITICAL: DO NOT DEPLOY WITH CURRENT CONFIGURATION**

The current setup uses **TEST KEYS** and is **NOT SECURE** for production.

## 🔧 **Required Changes Before Deployment**

### **1. Environment Variables Setup**

Create these files for production:

**Backend (.env.production):**
```bash
# Django Settings
DEBUG=False
SECRET_KEY=your-super-secure-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database (if using external DB)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Stripe LIVE Keys (NOT TEST KEYS!)
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here

# Email Settings (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

**Frontend (.env.production):**
```bash
# Stripe LIVE Keys (NOT TEST KEYS!)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
VITE_BACKEND_URL=https://yourdomain.com
```

### **2. Update Django Settings for Production**

**backend/Core/settings.py** - Add production settings:

```python
import os
from decouple import config

# Production settings
DEBUG = config('DEBUG', default=False, cast=bool)
SECRET_KEY = config('SECRET_KEY')

# Security settings for production
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')
CORS_ALLOWED_ORIGINS = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
]

# Secure cookie settings
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# Stripe Configuration - MUST USE LIVE KEYS
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY')
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET')

# Database configuration
if config('DATABASE_URL', default=None):
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(config('DATABASE_URL'))
    }

# Static files for production
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'

# Logging for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}
```

### **3. Database Migration**

Run these commands before deployment:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput
```

### **4. Stripe Dashboard Configuration**

**CRITICAL: Switch to LIVE mode in Stripe Dashboard**

1. **Go to Stripe Dashboard** → Switch to "Live" mode
2. **Get Live API Keys:**
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`
3. **Configure Webhook:**
   - URL: `https://yourdomain.com/api/stripe/webhook/`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Get webhook secret: `whsec_...`

### **5. Update Frontend Configuration**

**src/lib/stripe.ts:**
```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Use environment variable for production
const stripePromise: Promise<Stripe | null> = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

export default stripePromise;

export const STRIPE_CONFIG = {
  currency: 'usd', // or 'zwl' for Zimbabwe
  paymentMethods: ['card'],
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  },
};
```

### **6. Update Vercel Configuration**

**vercel.json:**
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://yourdomain.com/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://yourdomain.com"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ],
  "env": {
    "VITE_STRIPE_PUBLISHABLE_KEY": "@stripe-publishable-key",
    "VITE_BACKEND_URL": "@backend-url"
  }
}
```

## 🧪 **Testing Before Production**

### **1. Test with Live Keys (Small Amounts)**
- Use real cards with small amounts ($1-5)
- Test all payment flows
- Verify webhook delivery
- Check email notifications

### **2. Security Testing**
- Test CORS configuration
- Verify HTTPS enforcement
- Check cookie security
- Test authentication flows

### **3. Performance Testing**
- Load test payment endpoints
- Test file upload for payment proof
- Verify database performance

## 🚀 **Deployment Checklist**

### **Backend Deployment:**
- [ ] Set DEBUG=False
- [ ] Use live Stripe keys
- [ ] Configure secure cookies
- [ ] Set proper ALLOWED_HOSTS
- [ ] Run database migrations
- [ ] Configure webhook endpoint
- [ ] Set up SSL certificate
- [ ] Configure email settings

### **Frontend Deployment:**
- [ ] Use live Stripe publishable key
- [ ] Update API base URL
- [ ] Test payment flow
- [ ] Verify CORS settings
- [ ] Test file uploads

### **Stripe Configuration:**
- [ ] Switch to live mode
- [ ] Configure webhook endpoint
- [ ] Test webhook delivery
- [ ] Set up monitoring
- [ ] Configure email notifications

## ⚠️ **CRITICAL WARNINGS**

1. **NEVER use test keys in production**
2. **ALWAYS use HTTPS in production**
3. **NEVER commit live keys to version control**
4. **ALWAYS test with small amounts first**
5. **MONITOR webhook delivery in Stripe dashboard**

## 🎯 **Current Status: NOT READY**

**DO NOT DEPLOY** until all the above changes are made. The current configuration will:
- ❌ Process payments in test mode (no real money)
- ❌ Expose sensitive test keys
- ❌ Have security vulnerabilities
- ❌ Not work with real customers

## 📞 **Next Steps**

1. **Get live Stripe keys** from Stripe dashboard
2. **Update all configuration files** as shown above
3. **Test thoroughly** with small amounts
4. **Deploy to staging** first
5. **Monitor everything** closely after production deployment

**Remember: Payment integration is critical - take your time to get it right!**




