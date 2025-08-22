# views.py - Updated with proper template integration
from rest_framework import generics, status, viewsets, filters, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import login, authenticate, logout
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import json
from django.contrib import messages
from django.conf import settings
from django.utils.http import url_has_allowed_host_and_scheme
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction
from drf_spectacular.utils import extend_schema, inline_serializer, extend_schema_view
from rest_framework import serializers as rf_serializers

from .models import (
    User, Customer, Vehicle, VehicleCategory, InsuranceCoverage,
    InsurancePolicy, Claim, ClaimDocument, ContactInquiry,
    DashboardStats, Payment, Notification, Quotation
)
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    CustomerSerializer, VehicleSerializer, VehicleCategorySerializer,
    InsuranceCoverageSerializer, InsurancePolicySerializer, ClaimSerializer,
    ContactInquirySerializer, DashboardStatsSerializer, PaymentSerializer,
    QuoteResponseSerializer,
    NotificationSerializer,
    QuotationSerializer,
    ClaimDocumentSerializer,
)
from .permissions import IsOwnerOrReadOnly, IsStaffOrReadOnly

# Authentication Views (basic login/logout helpers using session or token can be added later if needed)

# Dashboard Views
class DashboardOverviewView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        if user.user_type == 'customer':
            return self.get_customer_dashboard()
        elif user.user_type in ['manager', 'underwriter']:
            return self.get_staff_dashboard()
        else:
            return self.get_general_dashboard()
    
    def get_customer_dashboard(self):
        try:
            customer = self.request.user.customer_profile
            policies = InsurancePolicy.objects.filter(customer=customer)
            claims = Claim.objects.filter(policy__customer=customer)
            
            data = {
                'active_policies': policies.filter(status='active').count(),
                'total_claims': claims.count(),
                'pending_claims': claims.filter(status__in=['submitted', 'under_review']).count(),
                'vehicles': customer.vehicles.count(),
                'recent_claims': ClaimSerializer(
                    claims.order_by('-created_at')[:5], many=True
                ).data
            }
            return Response(data)
        except:
            return Response({
                'active_policies': 0,
                'total_claims': 0,
                'pending_claims': 0,
                'vehicles': 0,
                'recent_claims': []
            })
    
    def get_staff_dashboard(self):
        # Chart data for the dashboard
        current_year = timezone.now().year
        chart_data = []
        
        for year in range(current_year - 4, current_year + 1):
            year_data = DashboardStats.objects.filter(year=year).first()
            if year_data:
                chart_data.append({
                    'year': year,
                    'value': year_data.claims_count,
                    'label': str(year)
                })
            else:
                chart_data.append({
                    'year': year,
                    'value': 0,
                    'label': str(year)
                })
        
        # Recent claims for approval
        recent_claims = Claim.objects.filter(
            approval_status='pending'
        ).select_related('policy__customer', 'policy__vehicle').order_by('-created_at')[:10]
        
        data = {
            'chart_data': chart_data,
            'recent_claims': ClaimSerializer(recent_claims, many=True).data,
            'total_customers': Customer.objects.count(),
            'active_policies': InsurancePolicy.objects.filter(status='active').count(),
            'pending_claims': Claim.objects.filter(approval_status='pending').count(),
        }
        return Response(data)
    
    def get_general_dashboard(self):
        data = {
            'total_customers': Customer.objects.count(),
            'active_policies': InsurancePolicy.objects.filter(status='active').count(),
            'total_claims': Claim.objects.count(),
            'pending_claims': Claim.objects.filter(status='pending').count(),
        }
        return Response(data)

# Customer Views
@extend_schema_view(list=extend_schema(tags=['customers']), retrieve=extend_schema(tags=['customers']), create=extend_schema(tags=['customers']), update=extend_schema(tags=['customers']), partial_update=extend_schema(tags=['customers']), destroy=extend_schema(tags=['customers']))
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['user__first_name', 'user__last_name', 'customer_id', 'user__email']
    filterset_fields = ['town', 'date_registered']

class CustomerListView(generics.ListAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['user__first_name', 'user__last_name', 'customer_id']

# Vehicle Views
@extend_schema_view(list=extend_schema(tags=['vehicle-categories']), retrieve=extend_schema(tags=['vehicle-categories']))
class VehicleCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VehicleCategory.objects.filter(is_active=True)
    serializer_class = VehicleCategorySerializer
    permission_classes = [AllowAny]

@extend_schema_view(list=extend_schema(tags=['vehicles']), retrieve=extend_schema(tags=['vehicles']), create=extend_schema(tags=['vehicles']), update=extend_schema(tags=['vehicles']), partial_update=extend_schema(tags=['vehicles']), destroy=extend_schema(tags=['vehicles']))
class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'customer']

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            try:
                return Vehicle.objects.filter(customer=user.customer_profile)
            except Exception:
                return Vehicle.objects.none()
        return super().get_queryset()

    def perform_create(self, serializer):
        user = self.request.user
        if user.user_type != 'customer':
            return serializer.save()
        try:
            customer = user.customer_profile
        except Exception:
            raise rf_serializers.ValidationError({'customer': 'Customer profile not found.'})
        serializer.save(customer=customer)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if user.user_type == 'customer':
            try:
                customer = user.customer_profile
            except Exception:
                raise rf_serializers.ValidationError({'customer': 'Customer profile not found.'})
            if instance.customer_id != customer.id:
                raise permissions.PermissionDenied('You can only modify your own vehicles.')
            serializer.save(customer=customer)
        else:
            serializer.save()

# Insurance Views
@extend_schema_view(list=extend_schema(tags=['insurance-coverages']), retrieve=extend_schema(tags=['insurance-coverages']))
class InsuranceCoverageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InsuranceCoverage.objects.filter(is_active=True)
    serializer_class = InsuranceCoverageSerializer
    permission_classes = [AllowAny]

@extend_schema_view(list=extend_schema(tags=['policies']), retrieve=extend_schema(tags=['policies']), create=extend_schema(tags=['policies']), update=extend_schema(tags=['policies']), partial_update=extend_schema(tags=['policies']), destroy=extend_schema(tags=['policies']))
class InsurancePolicyViewSet(viewsets.ModelViewSet):
    queryset = InsurancePolicy.objects.all()
    serializer_class = InsurancePolicySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'customer', 'coverage']

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            try:
                return InsurancePolicy.objects.filter(customer=user.customer_profile)
            except:
                return InsurancePolicy.objects.none()
        return super().get_queryset()

    def perform_create(self, serializer):
        user = self.request.user
        if user.user_type == 'customer':
            try:
                customer = user.customer_profile
            except Exception:
                raise rf_serializers.ValidationError({'customer': 'Customer profile not found.'})
            vehicle = serializer.validated_data.get('vehicle')
            if not vehicle or vehicle.customer_id != customer.id:
                raise permissions.PermissionDenied('You can only apply a policy for your own vehicle.')
            # Force pending on application and attach customer
            policy = serializer.save(customer=customer, status='pending')
        else:
            policy = serializer.save()

        # Notify all underwriters of new application
        underwriters = User.objects.filter(user_type='underwriter')
        notifs = [
            Notification(
                recipient=u,
                title='New policy application',
                message=f'Policy application {policy.policy_number} pending review.',
                type='status_update',
                payload={'policy_id': policy.id, 'policy_number': policy.policy_number, 'status': policy.status}
            ) for u in underwriters
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)

    def perform_update(self, serializer):
        user = self.request.user
        if user.user_type == 'customer':
            raise permissions.PermissionDenied('Customers cannot modify policies after application.')
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def quote(self, request, pk=None):
        policy = self.get_object()
        if request.user.user_type != 'underwriter':
            raise permissions.PermissionDenied('Only underwriters can quote policies.')
        if policy.status not in ['pending']:
            return Response({'error': 'Only pending policies can be quoted.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            premium = Decimal(str(request.data.get('premium_amount')))
            coverage_amt = Decimal(str(request.data.get('coverage_amount')))
        except Exception:
            return Response({'error': 'premium_amount and coverage_amount must be decimals'}, status=status.HTTP_400_BAD_REQUEST)
        if premium <= 0 or coverage_amt <= 0:
            return Response({'error': 'premium_amount and coverage_amount must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
        # Update monetary figures on policy for visibility
        policy.premium_amount = premium
        policy.coverage_amount = coverage_amt
        policy.save(update_fields=['premium_amount', 'coverage_amount'])

        # Defaults and payload
        default_terms = request.data.get('terms') or (
            'By accepting this quotation, you agree to the policy terms and conditions. '
            'Cover is activated upon receipt and confirmation of payment. '
            'Premiums are payable within 7 days of quotation unless otherwise agreed.'
        )
        bank_details = {
            'bank': 'CBZ',
            'account_number': '020224850175100',
            'branch': 'Chivhu',
        }
        payment_url = request.data.get('payment_url') or f"/payments/checkout?policy={policy.id}"

        # Create a Quotation record
        quote = Quotation.objects.create(
            policy=policy,
            premium_amount=premium,
            coverage_amount=coverage_amt,
            currency=request.data.get('currency', 'USD'),
            status='sent',
            terms=default_terms,
            bank_details=bank_details,
            payment_url=payment_url,
            created_by=request.user,
        )

        # Notify customer with quotation
        Notification.objects.create(
            recipient=policy.customer.user,
            title='Policy quotation available',
            message=f'Quotation for {policy.policy_number}',
            type='quotation',
            payload={
                'policy_id': policy.id,
                'policy_number': policy.policy_number,
                'premium_amount': str(premium),
                'coverage_amount': str(coverage_amt),
                'currency': quote.currency,
                'quote_id': quote.quote_id,
                'quotation_id': quote.id,
                'payment_url': payment_url,
                'bank_details': bank_details,
                'terms': default_terms,
            }
        )

        return Response({'message': 'Quotation created and customer notified.', 'quote_id': quote.quote_id})


@extend_schema_view(list=extend_schema(tags=['quotations']), retrieve=extend_schema(tags=['quotations']), create=extend_schema(tags=['quotations']))
class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.all()
    serializer_class = QuotationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'policy', 'policy__customer']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            try:
                return Quotation.objects.filter(policy__customer=user.customer_profile)
            except Exception:
                return Quotation.objects.none()
        return super().get_queryset()

    def perform_create(self, serializer):
        user = self.request.user
        if user.user_type not in ['underwriter', 'manager']:
            raise permissions.PermissionDenied('Only underwriters or managers can create quotations.')
        policy = serializer.validated_data.get('policy')
        if policy.status != 'pending':
            raise rf_serializers.ValidationError({'policy': 'Only pending policies can be quoted.'})
        quote = serializer.save(created_by=user, status='sent')
        # Notify customer
        Notification.objects.create(
            recipient=policy.customer.user,
            title='Policy quotation available',
            message=f'Quotation for {policy.policy_number}',
            type='quotation',
            payload={
                'policy_id': policy.id,
                'policy_number': policy.policy_number,
                'premium_amount': str(quote.premium_amount),
                'coverage_amount': str(quote.coverage_amount),
                'currency': quote.currency,
                'quote_id': quote.quote_id,
                'quotation_id': quote.id,
                'payment_url': quote.payment_url,
                'bank_details': quote.bank_details,
                'terms': quote.terms,
            }
        )

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        quote = self.get_object()
        user = request.user
        # Only the owning customer can accept/decline
        if not quote.policy or quote.policy.customer.user_id != user.id:
            raise permissions.PermissionDenied('Only the policy owner can accept this quotation.')
        if quote.status != 'sent':
            return Response({'error': f'Only sent quotations can be accepted. Current status: {quote.status}'}, status=status.HTTP_400_BAD_REQUEST)
        quote.status = 'accepted'
        quote.customer_decision_at = timezone.now()
        quote.decided_by = user
        quote.save(update_fields=['status', 'customer_decision_at', 'decided_by'])
        # Notify underwriters
        for uw in User.objects.filter(user_type='underwriter'):
            Notification.objects.create(
                recipient=uw,
                title='Quotation accepted',
                message=f'{user.get_full_name() or user.username} accepted quote {quote.quote_id} for {quote.policy.policy_number}',
                type='status_update',
                payload={'quote_id': quote.quote_id, 'policy_id': quote.policy_id, 'status': 'accepted'}
            )
        return Response({'message': 'Quotation accepted. Proceed to payment.', 'payment_url': quote.payment_url})

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        quote = self.get_object()
        user = request.user
        if not quote.policy or quote.policy.customer.user_id != user.id:
            raise permissions.PermissionDenied('Only the policy owner can decline this quotation.')
        if quote.status != 'sent':
            return Response({'error': f'Only sent quotations can be declined. Current status: {quote.status}'}, status=status.HTTP_400_BAD_REQUEST)
        quote.status = 'declined'
        quote.customer_decision_at = timezone.now()
        quote.decided_by = user
        quote.save(update_fields=['status', 'customer_decision_at', 'decided_by'])
        # Notify underwriters
        for uw in User.objects.filter(user_type='underwriter'):
            Notification.objects.create(
                recipient=uw,
                title='Quotation declined',
                message=f'{user.get_full_name() or user.username} declined quote {quote.quote_id} for {quote.policy.policy_number}',
                type='status_update',
                payload={'quote_id': quote.quote_id, 'policy_id': quote.policy_id, 'status': 'declined'}
            )
        return Response({'message': 'Quotation declined.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        policy = self.get_object()
        if request.user.user_type != 'underwriter':
            raise permissions.PermissionDenied('Only underwriters can approve policies.')
        if policy.status != 'pending':
            return Response({'error': f'Only pending policies can be approved. Current status: {policy.status}'}, status=status.HTTP_400_BAD_REQUEST)
        if not policy.premium_amount or not policy.coverage_amount or policy.premium_amount <= 0 or policy.coverage_amount <= 0:
            return Response({'error': 'Policy must have a positive quoted premium and coverage before approval.'}, status=status.HTTP_400_BAD_REQUEST)
        policy.status = 'active'
        policy.save()
        Notification.objects.create(
            recipient=policy.customer.user,
            title='Policy approved',
            message=f'Your policy {policy.policy_number} has been approved and activated.',
            type='status_update',
            payload={'policy_id': policy.id, 'status': policy.status}
        )
        return Response({'message': 'Policy approved and customer notified.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        policy = self.get_object()
        if request.user.user_type != 'underwriter':
            raise permissions.PermissionDenied('Only underwriters can reject policies.')
        if policy.status != 'pending':
            return Response({'error': f'Only pending policies can be rejected. Current status: {policy.status}'}, status=status.HTTP_400_BAD_REQUEST)
        policy.status = 'cancelled'
        policy.save()
        Notification.objects.create(
            recipient=policy.customer.user,
            title='Policy rejected',
            message=f'Your policy {policy.policy_number} has been rejected.',
            type='status_update',
            payload={'policy_id': policy.id, 'status': policy.status}
        )
        return Response({'message': 'Policy rejected and customer notified.'})

# Payment Views
@extend_schema_view(list=extend_schema(tags=['payments']), retrieve=extend_schema(tags=['payments']), create=extend_schema(tags=['payments']), update=extend_schema(tags=['payments']), partial_update=extend_schema(tags=['payments']), destroy=extend_schema(tags=['payments']))
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'payment_method', 'policy__customer']

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            try:
                return Payment.objects.filter(policy__customer=user.customer_profile)
            except:
                return Payment.objects.none()
        return super().get_queryset()

# Contact/Inquiry Views
@extend_schema_view(list=extend_schema(tags=['contact-inquiries']), retrieve=extend_schema(tags=['contact-inquiries']), create=extend_schema(tags=['contact-inquiries']), update=extend_schema(tags=['contact-inquiries']), partial_update=extend_schema(tags=['contact-inquiries']), destroy=extend_schema(tags=['contact-inquiries']))
class ContactInquiryViewSet(viewsets.ModelViewSet):
    queryset = ContactInquiry.objects.all()
    serializer_class = ContactInquirySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering = ['-created_at']

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def respond(self, request, pk=None):
        inquiry = self.get_object()
        response_text = request.data.get('response', '')
        
        if not response_text:
            return Response(
                {'error': 'Response text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        inquiry.response = response_text
        inquiry.responded_by = request.user
        inquiry.status = 'resolved'
        inquiry.save()
        
        return Response({
            'message': 'Response sent successfully',
            'inquiry_id': inquiry.id
        })

# Claims Views
@extend_schema_view(list=extend_schema(tags=['claims']), retrieve=extend_schema(tags=['claims']), create=extend_schema(tags=['claims']), update=extend_schema(tags=['claims']), partial_update=extend_schema(tags=['claims']), destroy=extend_schema(tags=['claims']))
class ClaimViewSet(viewsets.ModelViewSet):
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'approval_status', 'policy__customer']
    ordering_fields = ['created_at', 'estimated_amount']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            try:
                return Claim.objects.filter(policy__customer=user.customer_profile).select_related('policy__vehicle', 'policy__customer')
            except:
                return Claim.objects.none()
        return super().get_queryset().select_related('policy__vehicle', 'policy__customer')

    def perform_create(self, serializer):
        user = self.request.user
        try:
            customer = user.customer_profile
        except Exception:
            raise rf_serializers.ValidationError({'policy': 'Customer profile not found.'})
        policy = serializer.validated_data.get('policy')
        if not policy or policy.customer_id != customer.id:
            raise permissions.PermissionDenied('You can only claim on your own policy.')
        # Ensure comprehensive only
        if policy.coverage.name != 'comprehensive':
            raise rf_serializers.ValidationError({'policy': 'Only comprehensive policies are eligible for claims.'})
        claim = serializer.save(status='submitted', approval_status='pending')

        # Notify all underwriters of new claim submission
        underwriters = User.objects.filter(user_type='underwriter')
        notifs = [
            Notification(
                recipient=u,
                title='New claim submitted',
                message=f'Claim {claim.claim_id} requires review.',
                type='status_update',
                payload={'claim_id': claim.id, 'claim_ref': claim.claim_id, 'policy_number': claim.policy.policy_number}
            ) for u in underwriters
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)

    @action(detail=True, methods=['post'])
    def process_claim(self, request, pk=None):
        claim = self.get_object()
        action = request.data.get('action')
        approved_amount = request.data.get('approved_amount')
        # Only underwriters/managers can process
        if request.user.user_type not in ['underwriter', 'manager']:
            raise permissions.PermissionDenied('Only underwriters or managers can process claims.')
        # Only pending approvals can be processed
        if claim.approval_status != 'pending':
            return Response({'success': False, 'error': 'Only pending claims can be processed.'}, status=status.HTTP_400_BAD_REQUEST)

        if action not in ['approve', 'reject']:
            return Response({'success': False, 'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'approve':
            claim.approval_status = 'approve'
            claim.status = 'approved'
            if approved_amount is not None:
                try:
                    claim.approved_amount = Decimal(str(approved_amount))
                except Exception:
                    return Response({'success': False, 'error': 'approved_amount must be a decimal'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            claim.approval_status = 'reject'
            claim.status = 'rejected'

        claim.processed_by = request.user
        claim.save()

        # Notify customer on status change
        Notification.objects.create(
            recipient=claim.policy.customer.user,
            title='Claim status updated',
            message=f'Your claim {claim.claim_id} is now {claim.status}.',
            type='status_update',
            payload={'claim_id': claim.id, 'claim_ref': claim.claim_id, 'status': claim.status}
        )

        return Response({
            'success': True,
            'message': f'Claim {action}d successfully',
            'claim_id': claim.claim_id,
            'status': claim.approval_status
        })

@extend_schema_view(list=extend_schema(tags=['claim-documents']), retrieve=extend_schema(tags=['claim-documents']), create=extend_schema(tags=['claim-documents']), destroy=extend_schema(tags=['claim-documents']))
class ClaimDocumentViewSet(viewsets.ModelViewSet):
    queryset = ClaimDocument.objects.all()
    serializer_class = ClaimDocumentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            try:
                customer = user.customer_profile
            except Exception:
                return ClaimDocument.objects.none()
            return ClaimDocument.objects.filter(claim__policy__customer=customer)
        return super().get_queryset()

    def perform_create(self, serializer):
        claim = serializer.validated_data.get('claim')
        user = self.request.user
        if user.user_type == 'customer':
            try:
                customer = user.customer_profile
            except Exception:
                raise rf_serializers.ValidationError({'claim': 'Customer profile not found.'})
            if not claim or claim.policy.customer_id != customer.id:
                raise permissions.PermissionDenied('You can only upload documents for your own claims.')
        serializer.save()

# Notifications
@extend_schema_view(list=extend_schema(tags=['notifications']), retrieve=extend_schema(tags=['notifications']), partial_update=extend_schema(tags=['notifications']))
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notif = self.get_object()
        if notif.recipient_id != request.user.id:
            raise permissions.PermissionDenied('Not your notification.')
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'message': 'Notification marked as read.'})

# Simple claims list for dashboards using the main serializer
class ClaimListView(generics.ListAPIView):
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['approval_status', 'status', 'policy__customer']

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'customer':
            try:
                return Claim.objects.filter(policy__customer=user.customer_profile)
            except:
                return Claim.objects.none()
        return Claim.objects.all()

# Dashboard Stats Management
@extend_schema_view(list=extend_schema(tags=['dashboard-stats']), retrieve=extend_schema(tags=['dashboard-stats']), create=extend_schema(tags=['dashboard-stats']), update=extend_schema(tags=['dashboard-stats']), partial_update=extend_schema(tags=['dashboard-stats']), destroy=extend_schema(tags=['dashboard-stats']))
class DashboardStatsViewSet(viewsets.ModelViewSet):
    queryset = DashboardStats.objects.all()
    serializer_class = DashboardStatsSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def update_stats(self, request):
        """Update dashboard statistics for all years"""
        current_year = timezone.now().year
        
        for year in range(current_year - 4, current_year + 1):
            year_start = datetime(year, 1, 1)
            year_end = datetime(year, 12, 31, 23, 59, 59)
            
            # Calculate statistics for the year
            claims_count = Claim.objects.filter(
                created_at__range=[year_start, year_end]
            ).count()
            
            policies_count = InsurancePolicy.objects.filter(
                created_at__range=[year_start, year_end]
            ).count()
            
            customers_count = Customer.objects.filter(
                date_registered__range=[year_start, year_end]
            ).count()
            
            revenue = InsurancePolicy.objects.filter(
                created_at__range=[year_start, year_end]
            ).aggregate(Sum('premium_amount'))['premium_amount__sum'] or 0
            
            # Update or create stats
            stats, created = DashboardStats.objects.update_or_create(
                year=year,
                defaults={
                    'claims_count': claims_count,
                    'policies_count': policies_count,
                    'customers_count': customers_count,
                    'revenue': revenue,
                }
            )
        
        return Response({'message': 'Dashboard statistics updated successfully'})

# User Profile Views
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class CustomerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        try:
            return self.request.user.customer_profile
        except:
            return None

# Search Views
@extend_schema(tags=['search'], summary='Search customers')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_customers(request):
    query = request.GET.get('q', '')
    if len(query) < 2:
        return Response({'results': []})
    
    customers = Customer.objects.filter(
        Q(user__first_name__icontains=query) |
        Q(user__last_name__icontains=query) |
        Q(customer_id__icontains=query) |
        Q(user__email__icontains=query)
    )[:10]
    
    serializer = CustomerSerializer(customers, many=True)
    return Response({'results': serializer.data})

@extend_schema(tags=['search'], summary='Search vehicles')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_vehicles(request):
    query = request.GET.get('q', '')
    if len(query) < 2:
        return Response({'results': []})
    
    vehicles = Vehicle.objects.filter(
        Q(vehicle_number__icontains=query) |
        Q(make__icontains=query) |
        Q(model__icontains=query)
    )[:10]
    
    serializer = VehicleSerializer(vehicles, many=True)
    return Response({'results': serializer.data})

# Statistics and Analytics Views
@extend_schema(tags=['analytics'], summary='Analytics overview for charts and reports')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_overview(request):
    """Provide analytics data for charts and reports"""
    
    # Monthly data for current year
    current_year = timezone.now().year
    monthly_data = []
    
    for month in range(1, 13):
        month_start = datetime(current_year, month, 1)
        if month == 12:
            month_end = datetime(current_year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = datetime(current_year, month + 1, 1) - timedelta(days=1)
        
        claims = Claim.objects.filter(
            created_at__range=[month_start, month_end]
        ).count()
        
        policies = InsurancePolicy.objects.filter(
            created_at__range=[month_start, month_end]
        ).count()
        
        monthly_data.append({
            'month': month,
            'month_name': month_start.strftime('%B'),
            'claims': claims,
            'policies': policies
        })
    
    # Category distribution
    category_data = []
    categories = VehicleCategory.objects.all()
    for category in categories:
        count = Vehicle.objects.filter(category=category).count()
        category_data.append({
            'category': category.get_name_display(),
            'count': count
        })
    
    return Response({
        'monthly_data': monthly_data,
        'category_distribution': category_data,
        'year': current_year
    })

# Quote Generation Views
@extend_schema(tags=['quotes'], summary='Generate a quick insurance quote')
@api_view(['POST'])
@permission_classes([AllowAny])
def generate_quote(request):
    try:
        market_value = Decimal(str(request.data.get('market_value')))
        coverage_type = request.data.get('coverage_type')
        vehicle_category = request.data.get('vehicle_category')
    except Exception:
        return Response({'error': 'Invalid input'}, status=status.HTTP_400_BAD_REQUEST)

    if coverage_type not in ['third_party', 'comprehensive']:
        return Response({'error': 'coverage_type must be third_party or comprehensive'}, status=status.HTTP_400_BAD_REQUEST)

    base_rate = Decimal('0.05') if coverage_type == 'third_party' else Decimal('0.08')
    category_multipliers = {
        'motorcycles': Decimal('1.2'),
        'light_motor': Decimal('1.0'),
        'minibuses': Decimal('1.3'),
        'buses': Decimal('1.4'),
        'heavy_vehicles': Decimal('1.6'),
        'haulage_trucks': Decimal('1.8'),
    }
    multiplier = category_multipliers.get(vehicle_category, Decimal('1.0'))
    estimated_premium = market_value * base_rate * multiplier

    if coverage_type == 'third_party':
        coverage_amount = min(market_value, Decimal('1000000'))
        coverage_details = [
            'Third party injury coverage',
            'Third party property damage up to limit',
            'Does not cover your vehicle',
        ]
    else:
        coverage_amount = market_value
        coverage_details = [
            'Comprehensive vehicle coverage',
            'Third party coverage',
            'Own damage coverage',
            'Theft and fire protection',
            'Natural disaster coverage',
        ]

    data = {
        'estimated_premium': estimated_premium,
        'coverage_amount': coverage_amount,
        'coverage_details': coverage_details,
        'validity_period': 30,
    }
    return Response(data)

# Report Generation Views
@extend_schema(tags=['reports'], summary='Generate summary reports')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_report(request):
    report_type = request.data.get('report_type', 'claims')
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')

    queryset = Claim.objects.all()
    if start_date:
        queryset = queryset.filter(created_at__date__gte=start_date)
    if end_date:
        queryset = queryset.filter(created_at__date__lte=end_date)

    data = {
        'total_claims': queryset.count(),
        'approved_claims': queryset.filter(approval_status='approve').count(),
        'rejected_claims': queryset.filter(approval_status='reject').count(),
        'pending_claims': queryset.filter(approval_status='pending').count(),
        'total_amount': queryset.aggregate(Sum('estimated_amount'))['estimated_amount__sum'] or 0,
        'approved_amount': queryset.filter(approval_status='approve').aggregate(
            Sum('approved_amount'))['approved_amount__sum'] or 0,
    }

    return Response({
        'report_type': report_type,
        'period': {
            'start_date': start_date,
            'end_date': end_date,
        },
        'data': data,
        'generated_at': timezone.now(),
    })

# Utility Views
@extend_schema(tags=['utility'], summary='Health check')
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'timestamp': timezone.now(),
        'version': '1.0.0'
    })

@extend_schema(tags=['auth'], summary='Get current user permissions')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_permissions(request):
    user = request.user
    
    permissions = {
        'can_view_dashboard': True,
        'can_manage_claims': user.user_type in ['manager', 'underwriter'],
        'can_approve_claims': user.user_type in ['manager'],
        'can_manage_customers': user.user_type in ['manager'],
        'can_generate_reports': user.user_type in ['manager', 'underwriter'],
        'can_manage_policies': user.user_type in ['manager', 'underwriter'],
        'user_type': user.user_type,
        'is_customer': user.user_type == 'customer',
        'is_staff': user.is_staff or user.user_type in ['manager', 'underwriter'],
    }
    
    return Response(permissions)

# Template Views
class HomeTemplateView(TemplateView):
    template_name = 'home.html'

def home_view(request):
    return render(request, 'home.html')

def logout_view(request):
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('home')

def login_page_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    next_url = request.GET.get('next') or request.POST.get('next')
    
    if request.method == 'POST':
        username_or_email = request.POST.get('username') or ''
        password = request.POST.get('password') or ''
        
        user = authenticate(request, username=username_or_email, password=password)
        if not user:
            try:
                user_obj = User.objects.get(email=username_or_email)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
        
        if user and user.is_active:
            login(request, user)
            messages.success(request, 'Welcome back!')
            if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
                return redirect(next_url)
            return redirect('dashboard')
        
        messages.error(request, 'Invalid credentials or inactive account.')
    
    return render(request, 'login.html', {'next': next_url})

@login_required
def dashboard_view(request):
    user = request.user
    context = {
        'user': user,
        'user_type': user.user_type,
    }
    return render(request, 'dashboard.html', context)

@login_required
def claims_management_view(request):
    if request.user.user_type not in ['manager', 'underwriter']:
        messages.error(request, 'Access denied.')
        return redirect('dashboard')
    
    if request.method == 'POST' and 'generate_report' in request.POST:
        messages.success(request, 'Report generation started. You will be notified when ready.')
    
    # Get claims for display
    claims = Claim.objects.select_related('policy__customer', 'policy__vehicle').order_by('-created_at')
    
    # Apply filters
    claim_id = request.GET.get('claim_id')
    vehicle_no = request.GET.get('vehicle_no')
    status_filter = request.GET.get('status')
    amount_range = request.GET.get('amount_range')
    
    if claim_id:
        claims = claims.filter(claim_id__icontains=claim_id)
    if vehicle_no:
        claims = claims.filter(policy__vehicle__vehicle_number__icontains=vehicle_no)
    if status_filter:
        claims = claims.filter(approval_status=status_filter)
    if amount_range:
        if amount_range == '0-25000':
            claims = claims.filter(estimated_amount__lte=25000)
        elif amount_range == '25001-50000':
            claims = claims.filter(estimated_amount__gte=25001, estimated_amount__lte=50000)
        elif amount_range == '50001-100000':
            claims = claims.filter(estimated_amount__gt=50000)
    
    context = {
        'user': request.user,
        'user_type': request.user.user_type,
        'claims': claims,
    }
    return render(request, 'claims_management.html', context)

@login_required
def chief_engineer_dashboard_view(request):
    if request.user.user_type not in ['chief_engineer', 'manager']:
        messages.error(request, 'Access denied.')
        return redirect('dashboard')
    
    if request.method == 'POST':
        messages.success(request, 'Report generated successfully!')
    
    context = {
        'user': request.user,
        'user_type': request.user.user_type,
    }
    return render(request, 'chief_engineer_dashboard.html', context)

def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    next_url = request.GET.get('next') or request.POST.get('next')
    
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        nic = request.POST.get('nic')
        address_no = request.POST.get('address_no')
        street = request.POST.get('street')
        town = request.POST.get('town')
        contact_no = request.POST.get('contact_no')
        email = request.POST.get('username_email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        
        if not all([first_name, last_name, nic, address_no, street, town, contact_no, email, password, confirm_password]):
            messages.error(request, 'Please fill in all required fields.')
            return render(request, 'register.html', {'next': next_url})
        
        if password != confirm_password:
            messages.error(request, "Passwords don't match.")
            return render(request, 'register.html', {'next': next_url})
        
        try:
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                messages.error(request, 'A user with this email already exists.')
                return render(request, 'register.html', {'next': next_url})
            
            # Generate unique username
            username = email
            if User.objects.filter(username=username).exists():
                base = email.split('@')[0]
                suffix = 1
                while User.objects.filter(username=f"{base}{suffix}").exists():
                    suffix += 1
                username = f"{base}{suffix}"
            
            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                user_type='customer',
                first_name=first_name,
                last_name=last_name,
            )
            
            # Create customer profile (align with model fields)
            Customer.objects.create(
                user=user,
                address_no=address_no,
                street=street,
                town=town,
            )
            
            login(request, user)
            messages.success(request, 'Registration successful! Welcome to Drive Peak Insurance.')
            
            if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
                return redirect(next_url)
            return redirect('dashboard')
            
        except Exception as exc:
            messages.error(request, f'Registration failed: {exc}')
            return render(request, 'register.html', {'next': next_url})
    
    context = {'next': next_url}
    return render(request, 'register.html', context)

# Additional API endpoints for AJAX calls
@extend_schema(tags=['claims'], summary='Update claim status')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_claim_status(request, claim_id):
    """Update claim status via AJAX"""
    try:
        claim = Claim.objects.get(id=claim_id)
        action = request.data.get('action')
        
        if action == 'approve':
            claim.approval_status = 'approve'
            claim.status = 'approved'
        elif action == 'reject':
            claim.approval_status = 'reject'
            claim.status = 'rejected'
        else:
            return JsonResponse({'success': False, 'error': 'Invalid action'})
        
        claim.processed_by = request.user
        claim.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Claim {action}d successfully',
            'status': claim.approval_status
        })
        
    except Claim.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Claim not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@extend_schema(tags=['dashboard'], summary='Get dashboard summary data')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """Get dashboard data for AJAX calls"""
    user = request.user
    
    if user.user_type == 'customer':
        try:
            customer = user.customer_profile
            data = {
                'active_policies': InsurancePolicy.objects.filter(customer=customer, status='active').count(),
                'total_claims': Claim.objects.filter(policy__customer=customer).count(),
                'pending_claims': Claim.objects.filter(policy__customer=customer, approval_status='pending').count(),
                'vehicles': Vehicle.objects.filter(customer=customer).count(),
            }
        except:
            data = {'active_policies': 0, 'total_claims': 0, 'pending_claims': 0, 'vehicles': 0}
    else:
        data = {
            'total_customers': Customer.objects.count(),
            'active_policies': InsurancePolicy.objects.filter(status='active').count(),
            'pending_claims': Claim.objects.filter(approval_status='pending').count(),
            'total_claims': Claim.objects.count(),
        }
    
    return JsonResponse(data)

@extend_schema(tags=['claims'], summary='Get claims data list')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def claims_data(request):
    """Get claims data for management interface"""
    claims = Claim.objects.all().order_by('-created_at')
    
    # Apply filters
    claim_id = request.GET.get('claim_id')
    vehicle_no = request.GET.get('vehicle_no')
    status_filter = request.GET.get('status')
    
    if claim_id:
        claims = claims.filter(claim_id__icontains=claim_id)
    if vehicle_no:
        claims = claims.filter(policy__vehicle__vehicle_number__icontains=vehicle_no)
    if status_filter:
        claims = claims.filter(approval_status=status_filter)
    
    claims_data = []
    for claim in claims:
        customer = getattr(claim.policy, 'customer', None)
        vehicle = getattr(claim.policy, 'vehicle', None)
        customer_name = customer.user.get_full_name() if customer else 'N/A'
        claims_data.append({
            'id': claim.id,
            'claim_id': claim.claim_id,
            'vehicle_number': getattr(vehicle, 'vehicle_number', 'N/A'),
            'estimated_amount': str(claim.estimated_amount),
            'approval_status': claim.approval_status,
            'status': claim.status,
            'customer_name': customer_name or 'N/A',
            'created_at': claim.created_at.strftime('%Y-%m-%d %H:%M'),
        })
    
    return JsonResponse({'claims': claims_data})

# Template context processor function (add to settings.py)
def user_context(request):
    """Add user context to all templates"""
    context = {}
    if request.user.is_authenticated:
        context['user'] = request.user
        context['user_type'] = request.user.user_type
        context['is_customer'] = request.user.user_type == 'customer'
        context['is_staff'] = request.user.is_staff or request.user.user_type in ['manager', 'underwriter']
        
        # Add customer profile if exists
        if request.user.user_type == 'customer':
            try:
                context['customer_profile'] = request.user.customer_profile
            except:
                context['customer_profile'] = None
    
    return context

# Auth API - Register
@extend_schema(
    request=RegisterSerializer,
    responses={
        201: inline_serializer(
            name='RegisterResponse',
            fields={
                'user': UserSerializer(),
                'access': rf_serializers.CharField(),
                'refresh': rf_serializers.CharField(),
            }
        ),
        400: inline_serializer(name='RegisterError', fields={'error': rf_serializers.CharField()}),
    },
    summary='Register a new customer and receive JWT tokens',
    tags=['auth']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def register_api(request):
    """Register a new customer user and return JWT tokens."""
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_201_CREATED)
    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

# --- JWT obtain via email + password ---
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import AllowAny


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = TokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        email = data.get("email")
        username = data.get("username")
        if not username and email:
            try:
                user = User.objects.get(email=email)
                data["username"] = user.username
            except User.DoesNotExist:
                # fall back to email (will fail auth if not a username)
                data["username"] = email
        # Remove extra field 'email' to avoid serializer 400 on unknown field
        if "email" in data:
            data.pop("email")
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)