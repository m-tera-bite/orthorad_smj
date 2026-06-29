from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import PatientProfile
from .serializers import PatientProfileSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = PatientProfile.objects.get_or_create(user=request.user)
        serializer = PatientProfileSerializer(profile)
        return Response(serializer.data)
