from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from decimal import Decimal

from .models import (
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
    Quotation,
)


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'user_type', 'phone_number', 'address', 'national_id',
            'date_created', 'is_active'
        ]
        read_only_fields = ['date_created']


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    address_no = serializers.CharField()
    street = serializers.CharField()
    town = serializers.CharField()
    phone_number = serializers.CharField(required=False, allow_blank=True)
    national_id = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.strip().lower()
        User = get_user_model()
        if User.objects.filter(email=value).exists() or User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_password(self, value):
        # Use Django password validators
        validate_password(value)
        return value

    def create(self, validated_data):
        User = get_user_model()
        email = validated_data['email']
        username = email  # use email as username

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            user_type='customer',
        )
        # optional fields
        phone = validated_data.get('phone_number')
        if phone:
            user.phone_number = phone
        nid = validated_data.get('national_id')
        if nid:
            user.national_id = nid
        user.save()

        # Create Customer profile
        Customer.objects.create(
            user=user,
            address_no=validated_data.get('address_no', '').strip(),
            street=validated_data.get('street', '').strip(),
            town=validated_data.get('town', '').strip(),
        )

        return user


class CustomerSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_id', 'user', 'address_no', 'street', 'town', 'date_registered'
        ]
        read_only_fields = ['customer_id', 'date_registered']


class VehicleCategorySerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='get_name_display', read_only=True)
    class Meta:
        model = VehicleCategory
        fields = ['id', 'name', 'display_name', 'description', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class VehicleSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(read_only=True)
    category = serializers.PrimaryKeyRelatedField(queryset=VehicleCategory.objects.all())

    class Meta:
        model = Vehicle
        fields = [
            'id', 'customer', 'vehicle_number', 'category', 'make', 'model', 'year',
            'engine_number', 'chassis_number', 'market_value', 'date_registered'
        ]
        read_only_fields = ['date_registered']


class InsuranceCoverageSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='get_name_display', read_only=True)

    class Meta:
        model = InsuranceCoverage
        fields = ['id', 'name', 'display_name', 'description', 'features', 'max_coverage_amount', 'is_active']


class InsurancePolicySerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(read_only=True)
    vehicle = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all())
    coverage = serializers.PrimaryKeyRelatedField(queryset=InsuranceCoverage.objects.all())
    premium_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    coverage_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = InsurancePolicy
        fields = [
            'id', 'policy_number', 'customer', 'vehicle', 'coverage',
            'premium_amount', 'coverage_amount', 'start_date', 'end_date',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['policy_number', 'created_at', 'updated_at']

    def validate(self, attrs):
        customer = attrs.get('customer') or getattr(self.instance, 'customer', None)
        vehicle = attrs.get('vehicle') or getattr(self.instance, 'vehicle', None)
        start_date = attrs.get('start_date') or getattr(self.instance, 'start_date', None)
        end_date = attrs.get('end_date') or getattr(self.instance, 'end_date', None)
        status = attrs.get('status') or getattr(self.instance, 'status', None)

        # Ensure start_date is not after end_date
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({'end_date': 'end_date must be on or after start_date.'})

        # Ensure policy customer matches vehicle owner
        if vehicle and customer and vehicle.customer_id != customer.id:
            raise serializers.ValidationError({'customer': 'Policy customer must match the vehicle owner (customer).'})

        # Overlapping policy check for active/pending
        if vehicle and start_date and end_date and status in ['active', 'pending']:
            qs = InsurancePolicy.objects.filter(
                vehicle=vehicle,
                status__in=['active', 'pending'],
                start_date__lte=end_date,
                end_date__gte=start_date,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError('Overlapping active/pending policy exists for this vehicle and date range.')

        return attrs

    def create(self, validated_data):
        # Default monetary fields on application if not provided
        if 'premium_amount' not in validated_data or validated_data.get('premium_amount') is None:
            validated_data['premium_amount'] = Decimal('0')
        if 'coverage_amount' not in validated_data or validated_data.get('coverage_amount') is None:
            validated_data['coverage_amount'] = Decimal('0')
        return super().create(validated_data)


class ClaimSerializer(serializers.ModelSerializer):
    policy = serializers.PrimaryKeyRelatedField(queryset=InsurancePolicy.objects.all())
    processed_by = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True, required=False)
    customer = serializers.SerializerMethodField(read_only=True)
    vehicle_number = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Claim
        fields = [
            'id', 'claim_id', 'policy', 'incident_date', 'claim_date', 'description',
            'estimated_amount', 'approved_amount', 'status', 'approval_status',
            'processed_by', 'created_at', 'updated_at',
            'customer', 'vehicle_number'
        ]
        read_only_fields = ['claim_id', 'claim_date', 'created_at', 'updated_at', 'customer', 'vehicle_number', 'processed_by']

    def get_customer(self, obj):
        return obj.policy.customer_id if obj.policy_id else None


class QuotationSerializer(serializers.ModelSerializer):
    policy = serializers.PrimaryKeyRelatedField(queryset=InsurancePolicy.objects.all())
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    decided_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Quotation
        fields = [
            'id', 'quote_id', 'policy', 'premium_amount', 'coverage_amount', 'currency',
            'status', 'terms', 'bank_details', 'payment_url',
            'created_by', 'created_at', 'updated_at', 'customer_decision_at', 'decided_by',
        ]
        read_only_fields = ['quote_id', 'created_by', 'created_at', 'updated_at', 'customer_decision_at', 'decided_by']

    def validate_premium_amount(self, value):
        if value is None or Decimal(str(value)) <= 0:
            raise serializers.ValidationError('premium_amount must be greater than 0.')
        return value

    def validate_coverage_amount(self, value):
        if value is None or Decimal(str(value)) <= 0:
            raise serializers.ValidationError('coverage_amount must be greater than 0.')
        return value


class ClaimDocumentSerializer(serializers.ModelSerializer):
    claim = serializers.PrimaryKeyRelatedField(queryset=Claim.objects.all())

    class Meta:
        model = ClaimDocument
        fields = ['id', 'claim', 'document_type', 'document', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def validate_document_type(self, value):
        allowed = {'police_report', 'id_document'}
        if value not in allowed:
            raise serializers.ValidationError(f"document_type must be one of {allowed}")
        return value


class ContactInquirySerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), allow_null=True, required=False)
    csr = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), allow_null=True, required=False)
    responded_by = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), allow_null=True, required=False)

    class Meta:
        model = ContactInquiry
        fields = [
            'id', 'inquiry_id', 'customer', 'csr', 'name', 'contact', 'email',
            'inquiry_text', 'inquiry_date', 'status', 'response', 'responded_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['inquiry_id', 'created_at', 'updated_at']


class DashboardStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardStats
        fields = ['id', 'year', 'claims_count', 'policies_count', 'revenue', 'customers_count', 'updated_at']
        read_only_fields = ['updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    policy = serializers.PrimaryKeyRelatedField(queryset=InsurancePolicy.objects.all())
    customer = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_id', 'policy', 'amount', 'payment_method', 'status',
            'transaction_reference', 'payment_date', 'due_date', 'customer'
        ]
        read_only_fields = ['payment_id', 'payment_date', 'customer']

    def get_customer(self, obj):
        return obj.policy.customer_id if obj.policy_id else None


class QuoteResponseSerializer(serializers.Serializer):
    premium_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    coverage_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.ChoiceField(choices=[('ZWL', 'ZWL'), ('USD', 'USD')])
    breakdown = serializers.ListField(child=serializers.DictField(), required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class NotificationSerializer(serializers.ModelSerializer):
    recipient = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'title', 'message', 'type', 'payload', 'is_read', 'created_at'
        ]
        read_only_fields = ['recipient', 'created_at']