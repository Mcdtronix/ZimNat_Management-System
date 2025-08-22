from rest_framework import permissions


def _owner_user(obj):
    """Resolve the owning django.contrib.auth user for a domain object."""
    # Direct user field
    if hasattr(obj, 'user') and obj.user is not None:
        return obj.user
    # Objects with customer relation
    if hasattr(obj, 'customer') and getattr(obj, 'customer') is not None:
        return getattr(obj.customer, 'user', None)
    # Objects with policy relation (Claim, Payment, etc.)
    if hasattr(obj, 'policy') and getattr(obj, 'policy') is not None:
        customer = getattr(obj.policy, 'customer', None)
        return getattr(customer, 'user', None) if customer is not None else None
    # ContactInquiry: prefer explicit customer, otherwise none
    if obj.__class__.__name__ == 'ContactInquiry':
        customer = getattr(obj, 'customer', None)
        return getattr(customer, 'user', None) if customer is not None else None
    return None


def _is_staff_like(user):
    """Business-level staff definition aligned with models.User.user_type choices."""
    if not user or not user.is_authenticated:
        return False
    # Treat Django staff as staff, plus business roles
    return bool(user.is_staff or user.user_type in ['manager', 'underwriter'])


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow read to anyone; writes only to the owner (derived via model relations)."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = _owner_user(obj)
        return owner == request.user


class IsStaffOrReadOnly(permissions.BasePermission):
    """Allow reads to all; writes only for staff-like users (manager/underwriter or is_staff)."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return _is_staff_like(request.user)


class IsCustomerOrStaff(permissions.BasePermission):
    """Authenticated users only. Staff can access all; customers only their own objects."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Staff can access everything
        if _is_staff_like(request.user):
            return True
        # Otherwise restrict to ownership
        owner = _owner_user(obj)
        return owner == request.user


class CanProcessClaims(permissions.BasePermission):
    """Users who can process claims (manager or underwriter)."""

    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and user.user_type in ['manager', 'underwriter']


class CanApproveClaims(permissions.BasePermission):
    """Users who can approve claims (manager only)."""

    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and user.user_type == 'manager'


class IsManager(permissions.BasePermission):
    """Manager-only access."""

    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and user.user_type == 'manager'


class IsUnderwriter(permissions.BasePermission):
    """Underwriter-only access."""

    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and user.user_type == 'underwriter'


class IsCustomer(permissions.BasePermission):
    """Customer-only access."""

    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and user.user_type == 'customer'