# Backend Stripe Integration Setup

## 1. Install Stripe Python SDK

```bash
pip install stripe
```

## 2. Add Stripe Configuration to settings.py

```python
# settings.py
import stripe

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', 'pk_test_your_key_here')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', 'sk_test_your_key_here')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', 'whsec_your_webhook_secret_here')

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY
```

## 3. Create Payment Intent View

```python
# api/views.py
import stripe
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permission_classes import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    try:
        amount = request.data.get('amount')  # Amount in cents
        policy_id = request.data.get('policy_id')
        currency = request.data.get('currency', 'usd')
        
        # Get the policy
        try:
            policy = InsurancePolicy.objects.get(id=policy_id)
        except InsurancePolicy.DoesNotExist:
            return Response({'error': 'Policy not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create payment intent with Stripe
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata={
                'policy_id': policy_id,
                'user_id': request.user.id,
                'policy_number': policy.policy_number,
            },
            automatic_payment_methods={
                'enabled': True,
            },
        )
        
        return Response({
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id,
        })
        
    except stripe.error.StripeError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'An unexpected error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

## 4. Create Payment Confirmation View

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request):
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        policy_id = request.data.get('policy_id')
        
        # Retrieve payment intent from Stripe
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != 'succeeded':
            return Response({'error': 'Payment not completed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the policy
        try:
            policy = InsurancePolicy.objects.get(id=policy_id)
        except InsurancePolicy.DoesNotExist:
            return Response({'error': 'Policy not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create payment record
        payment = Payment.objects.create(
            policy=policy,
            amount=Decimal(intent.amount) / 100,  # Convert from cents
            payment_method='credit_card',
            status='completed',
            transaction_reference=intent.id,
        )
        
        # Update policy status
        policy.status = 'active'
        policy.save()
        
        # Send notification
        Notification.objects.create(
            recipient=policy.customer.user,
            title='Payment Successful',
            message=f'Your payment for policy {policy.policy_number} has been processed successfully.',
            type='payment_success',
            payload={'payment_id': payment.payment_id, 'policy_id': policy.id}
        )
        
        return Response({
            'message': 'Payment confirmed successfully',
            'payment_id': payment.payment_id,
        })
        
    except stripe.error.StripeError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'An unexpected error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

## 5. Create Stripe Webhook Handler

```python
import json
import stripe
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse(status=400)
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_payment_succeeded(payment_intent)
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_payment_failed(payment_intent)
    
    return HttpResponse(status=200)

def handle_payment_succeeded(payment_intent):
    """Handle successful payment"""
    policy_id = payment_intent['metadata'].get('policy_id')
    if policy_id:
        try:
            policy = InsurancePolicy.objects.get(id=policy_id)
            policy.status = 'active'
            policy.save()
            
            # Create payment record if not exists
            Payment.objects.get_or_create(
                transaction_reference=payment_intent['id'],
                defaults={
                    'policy': policy,
                    'amount': Decimal(payment_intent['amount']) / 100,
                    'payment_method': 'credit_card',
                    'status': 'completed',
                }
            )
        except InsurancePolicy.DoesNotExist:
            pass

def handle_payment_failed(payment_intent):
    """Handle failed payment"""
    policy_id = payment_intent['metadata'].get('policy_id')
    if policy_id:
        try:
            policy = InsurancePolicy.objects.get(id=policy_id)
            # Create failed payment record
            Payment.objects.get_or_create(
                transaction_reference=payment_intent['id'],
                defaults={
                    'policy': policy,
                    'amount': Decimal(payment_intent['amount']) / 100,
                    'payment_method': 'credit_card',
                    'status': 'failed',
                }
            )
        except InsurancePolicy.DoesNotExist:
            pass
```

## 6. Update URLs

```python
# api/urls.py
from .views import create_payment_intent, confirm_payment, stripe_webhook

urlpatterns = [
    # ... existing patterns ...
    path('payments/create-payment-intent/', create_payment_intent, name='create_payment_intent'),
    path('payments/confirm/', confirm_payment, name='confirm_payment'),
    path('stripe/webhook/', stripe_webhook, name='stripe_webhook'),
]
```

## 7. Environment Variables

Add to your environment:

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 8. Stripe Dashboard Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the dashboard
3. Set up webhook endpoints:
   - URL: `https://yourdomain.com/api/stripe/webhook/`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Test with Stripe's test cards:
   - Success: `4242424242424242`
   - Decline: `4000000000000002`


