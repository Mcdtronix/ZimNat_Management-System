from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)
from rest_framework.routers import DefaultRouter

from .views import (
    # ViewSets
    CustomerViewSet,
    VehicleCategoryViewSet,
    VehicleViewSet,
    InsuranceCoverageViewSet,
    InsurancePolicyViewSet,
    PaymentViewSet,
    ContactInquiryViewSet,
    ClaimViewSet,
    ClaimDocumentViewSet,
    DashboardStatsViewSet,
    NotificationViewSet,
    QuotationViewSet,
    # Profile views
    UserProfileView,
    CustomerProfileView,
    # API views only (no HTML templates)
    search_customers,
    search_vehicles,
    analytics_overview,
    generate_quote,
    generate_report,
    export_policies_excel,
    export_payments_excel,
    export_quotations_excel,
    export_claims_excel,
    export_vehicles_excel,
    export_dashboard_report_excel,
    health_check,
    user_permissions,
    update_claim_status,
    dashboard_data,
    claims_data,
    register_api,
    verify_registration_otp,
    resend_registration_otp,
    EmailTokenObtainPairView,
    password_reset_request,
    password_reset_confirm,
    create_payment_intent,
    confirm_payment,
    stripe_webhook,
    get_payments,
    verify_payment,
    reject_payment,
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'vehicle-categories', VehicleCategoryViewSet, basename='vehicle-category')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'insurance-coverages', InsuranceCoverageViewSet, basename='insurance-coverage')
router.register(r'policies', InsurancePolicyViewSet, basename='policy')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'contact-inquiries', ContactInquiryViewSet, basename='contact-inquiry')
router.register(r'claims', ClaimViewSet, basename='claim')
router.register(r'claim-documents', ClaimDocumentViewSet, basename='claim-document')
router.register(r'dashboard-stats', DashboardStatsViewSet, basename='dashboard-stats')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'quotations', QuotationViewSet, basename='quotation')

urlpatterns = [
    # Auth (JWT)
    path('api/auth/jwt/token/', EmailTokenObtainPairView.as_view(), name='jwt_token_obtain_pair'),
    path('api/auth/jwt/refresh/', TokenRefreshView.as_view(), name='jwt_token_refresh'),
    path('api/auth/jwt/verify/', TokenVerifyView.as_view(), name='jwt_token_verify'),
    path('api/auth/register/', register_api, name='auth_register'),
    path('api/auth/verify-otp/', verify_registration_otp, name='auth_verify_otp'),
    path('api/auth/resend-otp/', resend_registration_otp, name='auth_resend_otp'),
    path('api/auth/password-reset/', password_reset_request, name='auth_password_reset'),
    path('api/auth/password-reset-confirm/', password_reset_confirm, name='auth_password_reset_confirm'),

    # Utility
    path('api/health/', health_check, name='health_check'),
    path('api/user-permissions/', user_permissions, name='user_permissions'),

    # Search
    path('api/search/customers/', search_customers, name='search_customers'),
    path('api/search/vehicles/', search_vehicles, name='search_vehicles'),

    # Analytics and reports
    path('api/analytics/overview/', analytics_overview, name='analytics_overview'),
    path('api/generate-quote/', generate_quote, name='generate_quote'),
    path('api/generate-report/', generate_report, name='generate_report'),
    
    # Excel Export endpoints
    path('api/export/policies/', export_policies_excel, name='export_policies_excel'),
    path('api/export/payments/', export_payments_excel, name='export_payments_excel'),
    path('api/export/quotations/', export_quotations_excel, name='export_quotations_excel'),
    path('api/export/claims/', export_claims_excel, name='export_claims_excel'),
    path('api/export/vehicles/', export_vehicles_excel, name='export_vehicles_excel'),
    path('api/export/dashboard/', export_dashboard_report_excel, name='export_dashboard_report_excel'),

    # Profile
    path('api/profile/user/', UserProfileView.as_view(), name='user_profile'),
    path('api/profile/customer/', CustomerProfileView.as_view(), name='customer_profile'),

    # AJAX/management APIs
    path('api/claims/<int:claim_id>/status/', update_claim_status, name='update_claim_status'),
    path('api/dashboard/data/', dashboard_data, name='dashboard_data'),
    path('api/claims/data/', claims_data, name='claims_data'),

    # Stripe Payment endpoints
    path('api/payments/create-payment-intent/', create_payment_intent, name='create_payment_intent'),
    path('api/payments/confirm/', confirm_payment, name='confirm_payment'),
    path('api/stripe/webhook/', stripe_webhook, name='stripe_webhook'),
    
    # Payment management endpoints
    path('api/payments/', get_payments, name='get_payments'),
    path('api/payments/<str:payment_id>/verify/', verify_payment, name='verify_payment'),
    path('api/payments/<str:payment_id>/reject/', reject_payment, name='reject_payment'),

    # DRF router
    path('api/', include(router.urls))
]