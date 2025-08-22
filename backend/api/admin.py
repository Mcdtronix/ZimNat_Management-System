from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User,
    Customer,
    VehicleCategory,
    Vehicle,
    InsuranceCoverage,
    InsurancePolicy,
    Claim,
    ClaimDocument,
    ContactInquiry,
    DashboardStats,
    Payment,
    Notification,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "user_type", "is_staff", "is_active")
    list_filter = ("user_type", "is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "first_name", "last_name", "phone_number", "national_id")
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "email", "phone_number", "address", "national_id", "user_type")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "password1", "password2", "user_type", "is_staff", "is_active"),
            },
        ),
    )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("customer_id", "user", "address_no", "street", "town", "date_registered")
    search_fields = ("customer_id", "user__username", "user__first_name", "user__last_name", "town")
    list_filter = ("town", "date_registered")


@admin.register(VehicleCategory)
class VehicleCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("vehicle_number", "customer", "category", "make", "model", "year", "date_registered")
    list_filter = ("category", "year")
    search_fields = ("vehicle_number", "engine_number", "chassis_number", "make", "model", "customer__user__username")


@admin.register(InsuranceCoverage)
class InsuranceCoverageAdmin(admin.ModelAdmin):
    list_display = ("name", "max_coverage_amount", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(InsurancePolicy)
class InsurancePolicyAdmin(admin.ModelAdmin):
    list_display = (
        "policy_number",
        "customer",
        "vehicle",
        "coverage",
        "premium_amount",
        "coverage_amount",
        "start_date",
        "end_date",
        "status",
    )
    list_filter = ("status", "coverage", "start_date", "end_date")
    search_fields = ("policy_number", "customer__user__username", "vehicle__vehicle_number")


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ("claim_id", "policy", "incident_date", "status", "approval_status", "processed_by", "created_at")
    list_filter = ("status", "approval_status", "incident_date", "created_at")
    search_fields = ("claim_id", "policy__policy_number", "processed_by__username")


@admin.register(ClaimDocument)
class ClaimDocumentAdmin(admin.ModelAdmin):
    list_display = ("claim", "document_type", "document", "uploaded_at")
    search_fields = ("claim__claim_id", "document_type")
    list_filter = ("document_type", "uploaded_at")


@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ("inquiry_id", "name", "customer", "csr", "status", "inquiry_date", "updated_at")
    list_filter = ("status", "inquiry_date", "updated_at")
    search_fields = ("inquiry_id", "name", "email", "customer__user__username", "csr__username")


@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    list_display = ("year", "claims_count", "policies_count", "revenue", "customers_count", "updated_at")
    search_fields = ("year",)
    list_filter = ("year",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("payment_id", "policy", "amount", "payment_method", "status", "payment_date")
    list_filter = ("payment_method", "status", "payment_date")
    search_fields = ("payment_id", "policy__policy_number", "transaction_reference")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "type", "is_read", "created_at")
    list_filter = ("type", "is_read", "created_at")
    search_fields = ("title", "message", "recipient__username", "recipient__email")
