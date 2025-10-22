from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
import uuid
from decimal import Decimal

class User(AbstractUser):
    USER_TYPES = [
        ('customer', 'Customer'),
        ('manager', 'Manager'),
        ('underwriter', 'underwriter'),
    ]
    
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='customer')
    phone_regex = RegexValidator(regex=r'^\+?[1-9]\d{7,14}$', message="Phone number must be E.164 format like '+2637XXXXXXXX'. Up to 15 digits.")
    phone_number = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    address = models.TextField(blank=True)
    national_id = models.CharField(max_length=20, blank=True, unique=True, null=True)
    date_created = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"

class TwoFactorCode(models.Model):
    """One-time code for registration verification (2FA on first login).

    Codes are short-lived and single-use. We only require this during initial
    registration to activate the account.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="two_factor_codes")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    def __str__(self):
        return f"2FA for {self.user.username} (used={self.is_used})"

class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    customer_id = models.CharField(max_length=20, unique=True)
    address_no = models.CharField(max_length=10)
    street = models.CharField(max_length=200)
    town = models.CharField(max_length=100)
    date_registered = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.customer_id:
            self.customer_id = f"CUST{str(uuid.uuid4().hex[:8]).upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        full_name = self.user.get_full_name() or self.user.username
        return f"{full_name} ({self.customer_id})"

class VehicleCategory(models.Model):
    CATEGORY_CHOICES = [
        ('motorcycles', 'Motorcycles'),
        ('light_motor', 'Light Motor Vehicles'),
        ('minibuses', 'Minibuses'),
        ('buses', 'Buses'),
        ('heavy_vehicles', 'Heavy Vehicles'),
        ('haulage_trucks', 'Haulage Trucks'),
    ]
    
    name = models.CharField(max_length=50, choices=CATEGORY_CHOICES, unique=True)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.get_name_display()

class Vehicle(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='vehicles')
    vehicle_number = models.CharField(max_length=20, unique=True, db_index=True)
    category = models.ForeignKey(VehicleCategory, on_delete=models.CASCADE)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField()
    engine_number = models.CharField(max_length=50, unique=True)
    chassis_number = models.CharField(max_length=50, unique=True)
    market_value = models.DecimalField(max_digits=12, decimal_places=2)
    date_registered = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.make} {self.model} - {self.vehicle_number}"

class InsuranceCoverage(models.Model):
    COVERAGE_TYPES = [
        ('third_party', 'Third Party'),
        ('comprehensive', 'Comprehensive'),
    ]
    
    name = models.CharField(max_length=50, choices=COVERAGE_TYPES, unique=True)
    description = models.TextField()
    features = models.JSONField(default=list)  # Store coverage features as JSON
    max_coverage_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.get_name_display()

class InsurancePolicy(models.Model):
    POLICY_STATUS = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('pending', 'Pending'),
    ]
    
    policy_number = models.CharField(max_length=20, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='policies')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='policies')
    coverage = models.ForeignKey(InsuranceCoverage, on_delete=models.CASCADE)
    premium_amount = models.DecimalField(max_digits=10, decimal_places=2)
    coverage_amount = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=POLICY_STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        from django.core.exceptions import ValidationError
        # Ensure policy customer matches vehicle's customer
        if self.vehicle and self.customer and self.vehicle.customer_id != self.customer_id:
            raise ValidationError({
                'customer': 'Policy customer must match the vehicle owner (customer).'
            })
        # Prevent overlapping policies for the SAME coverage type on the SAME vehicle
        # Allow one Comprehensive and one Third Party concurrently, but not two of the same type
        if self.vehicle and self.coverage_id and self.start_date and self.end_date:
            overlapping_same_type = (
                InsurancePolicy.objects.filter(
                    vehicle=self.vehicle,
                    coverage=self.coverage,
                )
                .exclude(pk=self.pk)
                .filter(
                    status__in=['active', 'pending'],
                    start_date__lte=self.end_date,
                    end_date__gte=self.start_date,
                )
                .exists()
            )
            if overlapping_same_type:
                cov_display = self.coverage.get_name_display() if hasattr(self.coverage, 'get_name_display') else 'this coverage'
                raise ValidationError(f'An active/pending {cov_display} policy already exists for this vehicle in the selected period.')

    def save(self, *args, **kwargs):
        if not self.policy_number:
            self.policy_number = f"POL{str(uuid.uuid4().hex[:8]).upper()}"
        # Validate invariants before saving
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.policy_number} - {self.customer}"

class Claim(models.Model):
    CLAIM_STATUS = [
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('settled', 'Settled'),
    ]
    
    APPROVAL_STATUS = [
        ('pending', 'Pending'),
        ('approve', 'Approved'),
        ('reject', 'Rejected'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    claim_id = models.CharField(max_length=20, unique=True)
    policy = models.ForeignKey(InsurancePolicy, on_delete=models.CASCADE, related_name='claims')
    incident_date = models.DateField()
    claim_date = models.DateTimeField(auto_now_add=True)
    description = models.TextField()
    estimated_amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=CLAIM_STATUS, default='submitted')
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_claims')
    processed_at = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    requires_investigation = models.BooleanField(default=False)
    investigation_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.claim_id:
            self.claim_id = f"CLM{str(uuid.uuid4().hex[:6]).upper()}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Claim {self.claim_id} - {self.policy.policy_number}"

class ClaimApproval(models.Model):
    """Track claim approval history and decisions"""
    APPROVAL_ACTIONS = [
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('requires_investigation', 'Requires Investigation'),
        ('investigation_complete', 'Investigation Complete'),
        ('settled', 'Settled'),
    ]
    
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='approval_history')
    action = models.CharField(max_length=30, choices=APPROVAL_ACTIONS)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.claim.claim_id} - {self.action} by {self.performed_by}"

class ClaimDocument(models.Model):
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=100)
    document = models.FileField(upload_to='claim_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.document_type} - {self.claim.claim_id}"

class ContactInquiry(models.Model):
    INQUIRY_STATUS = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    inquiry_id = models.CharField(max_length=20, unique=True, blank=True)
    customer = models.ForeignKey('Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    csr = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_inquiries')
    name = models.CharField(max_length=200)
    contact = models.CharField(max_length=17, blank=True)
    email = models.EmailField(blank=True)
    inquiry_text = models.TextField()
    inquiry_date = models.DateField()
    status = models.CharField(max_length=20, choices=INQUIRY_STATUS, default='open')
    response = models.TextField(blank=True)
    responded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='responses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.inquiry_id:
            self.inquiry_id = f"INQ{str(uuid.uuid4().hex[:8]).upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Inquiry {self.inquiry_id} from {self.name}"

class DashboardStats(models.Model):
    year = models.IntegerField(unique=True)
    claims_count = models.IntegerField(default=0)
    policies_count = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    customers_count = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Stats for {self.year}"

class Payment(models.Model):
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash'),
        ('ecocash', 'EcoCash'),
        ('onemoney', 'OneMoney'),
    ]
    
    payment_id = models.CharField(max_length=20, unique=True)
    policy = models.ForeignKey(InsurancePolicy, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    transaction_reference = models.CharField(max_length=100, blank=True)
    payment_proof = models.FileField(upload_to='payment_proofs/', null=True, blank=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_payments')
    verified_at = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if not self.payment_id:
            self.payment_id = f"PAY{str(uuid.uuid4().hex[:8]).upper()}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Payment {self.payment_id} - {self.amount}"

class Notification(models.Model):
    NOTIF_TYPES = [
        ('quotation', 'Quotation'),
        ('status_update', 'Status Update'),
        ('message', 'Message'),
        ('payment_success', 'Payment Success'),
        ('payment_verification', 'Payment Verification'),
        ('policy_application', 'Policy Application'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=NOTIF_TYPES, default='message')
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification to {self.recipient.username}: {self.title}"

class Quotation(models.Model):
    STATUS_CHOICES = [
        ("sent", "Sent"),
        ("accepted", "Accepted"),
        ("declined", "Declined"),
    ]

    quote_id = models.CharField(max_length=20, unique=True, blank=True)
    policy = models.ForeignKey(InsurancePolicy, on_delete=models.CASCADE, related_name="quotations")
    premium_amount = models.DecimalField(max_digits=10, decimal_places=2)
    coverage_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="sent", db_index=True)
    terms = models.TextField(blank=True)
    bank_details = models.JSONField(default=dict, blank=True)
    payment_url = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_quotations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    customer_decision_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="decided_quotations")

    def save(self, *args, **kwargs):
        if not self.quote_id:
            self.quote_id = f"QTE{str(uuid.uuid4().hex[:8]).upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Quotation {self.quote_id} for {self.policy.policy_number} ({self.status})"