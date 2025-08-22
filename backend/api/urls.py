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
    DashboardStatsViewSet,
    # API views only (no HTML templates)
    search_customers,
    search_vehicles,
    analytics_overview,
    generate_quote,
    generate_report,
    health_check,
    user_permissions,
    update_claim_status,
    dashboard_data,
    claims_data,
    register_api,
    EmailTokenObtainPairView,
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
router.register(r'dashboard-stats', DashboardStatsViewSet, basename='dashboard-stats')

urlpatterns = [
    # Auth (JWT)
    path('api/auth/jwt/token/', EmailTokenObtainPairView.as_view(), name='jwt_token_obtain_pair'),
    path('api/auth/jwt/refresh/', TokenRefreshView.as_view(), name='jwt_token_refresh'),
    path('api/auth/jwt/verify/', TokenVerifyView.as_view(), name='jwt_token_verify'),
    path('api/auth/register/', register_api, name='auth_register'),

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

    # AJAX/management APIs
    path('api/claims/<int:claim_id>/status/', update_claim_status, name='update_claim_status'),
    path('api/dashboard/data/', dashboard_data, name='dashboard_data'),
    path('api/claims/data/', claims_data, name='claims_data'),

    # DRF router
    path('api/', include(router.urls))
]