from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PatientProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
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
