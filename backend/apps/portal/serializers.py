from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PatientProfile


class UserSerializer(serializers.ModelSerializer):
    partner = serializers.SerializerMethodField()

    def get_partner(self, obj):
        """Active partner clinic this user belongs to, if any — lets the SPA
        route partner users to their portal."""
        link = getattr(obj, "partner_link", None)
        if link is None or not link.partner.is_active:
            return None
        return {"id": link.partner.id, "name": link.partner.name}

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "is_staff", "partner"]
        read_only_fields = ["id"]


class PatientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = PatientProfile
        fields = ["user", "phone", "date_of_birth"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
