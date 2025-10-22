# 🚀 Production Deployment Checklist

## ⚠️ **CRITICAL: DO NOT DEPLOY WITHOUT COMPLETING THIS CHECKLIST**

### **🔐 Security & Configuration**

#### **Environment Variables**
- [ ] **Backend**: Create `.env.production` with live values
- [ ] **Frontend**: Create `.env.production` with live values
- [ ] **Stripe Keys**: Replace ALL test keys with live keys
- [ ] **Secret Key**: Generate new Django SECRET_KEY (50+ characters)
- [ ] **Database**: Configure production database URL
- [ ] **Email**: Configure SMTP settings for notifications

#### **Stripe Configuration**
- [ ] **Switch to LIVE mode** in Stripe Dashboard
- [ ] **Get live API keys**: `pk_live_...` and `sk_live_...`
- [ ] **Configure webhook**: `https://yourdomain.com/api/stripe/webhook/`
- [ ] **Test webhook delivery** with live events
- [ ] **Set up monitoring** for failed payments

#### **Django Settings**
- [ ] **DEBUG = False** in production
- [ ] **ALLOWED_HOSTS** set to your domain only
- [ ] **Secure cookies** enabled (HTTPS only)
- [ ] **CORS origins** restricted to your domain
- [ ] **CSRF protection** properly configured
- [ ] **Use production settings file**

### **🗄️ Database & Migrations**

#### **Database Setup**
- [ ] **Create production database** (PostgreSQL recommended)
- [ ] **Run migrations**: `python manage.py migrate`
- [ ] **Create superuser**: `python manage.py createsuperuser`
- [ ] **Backup strategy** implemented
- [ ] **Database connection** tested

#### **File Storage**
- [ ] **Media files**: Configure for production (AWS S3 or local)
- [ ] **Static files**: Collected and served properly
- [ ] **Payment proof uploads**: Tested and working
- [ ] **File permissions** set correctly

### **🌐 Frontend Configuration**

#### **Build & Deploy**
- [ ] **Environment variables** set for production
- [ ] **Stripe publishable key** updated to live key
- [ ] **API base URL** points to production backend
- [ ] **Build process** completed without errors
- [ ] **Static assets** properly served

#### **Payment Integration**
- [ ] **Payment form** loads with live Stripe key
- [ ] **Card payments** tested with real cards (small amounts)
- [ ] **Bank transfer flow** tested end-to-end
- [ ] **Payment notifications** working
- [ ] **Error handling** tested

### **🔧 Backend Deployment**

#### **Server Configuration**
- [ ] **HTTPS certificate** installed and working
- [ ] **Web server** configured (Nginx/Apache)
- [ ] **WSGI server** running (Gunicorn/uWSGI)
- [ ] **Process management** set up (systemd/supervisor)
- [ ] **Logging** configured and working

#### **API Endpoints**
- [ ] **Payment endpoints** tested with live Stripe
- [ ] **Webhook endpoint** accessible and secure
- [ ] **File upload** working for payment proof
- [ ] **Authentication** working properly
- [ ] **CORS** configured correctly

### **📧 Email & Notifications**

#### **Email Configuration**
- [ ] **SMTP settings** configured
- [ ] **Email templates** working
- [ ] **Payment notifications** sent to customers
- [ ] **Underwriter notifications** sent
- [ ] **Error notifications** sent to admins

### **🧪 Testing**

#### **Payment Testing**
- [ ] **Test with real card** (small amount: $1-5)
- [ ] **Test bank transfer** verification flow
- [ ] **Test payment failure** scenarios
- [ ] **Test webhook delivery** and processing
- [ ] **Test email notifications**

#### **Security Testing**
- [ ] **HTTPS enforcement** working
- [ ] **CORS configuration** tested
- [ ] **Authentication** tested
- [ ] **File upload security** tested
- [ ] **SQL injection** protection verified

#### **Performance Testing**
- [ ] **Load testing** completed
- [ ] **Database performance** acceptable
- [ ] **File upload performance** tested
- [ ] **API response times** acceptable

### **📊 Monitoring & Logging**

#### **Monitoring Setup**
- [ ] **Error tracking** configured (Sentry)
- [ ] **Performance monitoring** set up
- [ ] **Payment monitoring** in Stripe dashboard
- [ ] **Server monitoring** configured
- [ ] **Database monitoring** set up

#### **Logging**
- [ ] **Application logs** configured
- [ ] **Error logs** being captured
- [ ] **Payment logs** being recorded
- [ ] **Log rotation** configured
- [ ] **Log monitoring** set up

### **🔄 Backup & Recovery**

#### **Backup Strategy**
- [ ] **Database backups** automated
- [ ] **File backups** configured
- [ ] **Backup testing** completed
- [ ] **Recovery procedures** documented
- [ ] **Disaster recovery** plan in place

### **📋 Final Verification**

#### **Pre-Launch Checklist**
- [ ] **All tests passing** in production environment
- [ ] **Payment flow** working end-to-end
- [ ] **Email notifications** working
- [ ] **File uploads** working
- [ ] **Admin panel** accessible
- [ ] **User registration** working
- [ ] **Policy creation** working
- [ ] **Claim submission** working

#### **Launch Day**
- [ ] **DNS configured** and propagated
- [ ] **SSL certificate** active
- [ ] **Monitoring alerts** set up
- [ ] **Support team** ready
- [ ] **Rollback plan** prepared
- [ ] **Launch announcement** ready

## 🚨 **CRITICAL WARNINGS**

1. **NEVER deploy with test Stripe keys**
2. **ALWAYS test with small amounts first**
3. **NEVER commit live keys to version control**
4. **ALWAYS use HTTPS in production**
5. **MONITOR everything closely after launch**

## 📞 **Emergency Contacts**

- **Stripe Support**: https://support.stripe.com
- **Hosting Provider**: [Your hosting support]
- **Domain Registrar**: [Your domain support]

## 🎯 **Success Criteria**

Deployment is successful when:
- ✅ All payment flows work with real money
- ✅ Email notifications are sent
- ✅ File uploads work properly
- ✅ No security vulnerabilities
- ✅ Performance is acceptable
- ✅ Monitoring is active

**Remember: Take your time and test thoroughly. Payment systems are critical!**
