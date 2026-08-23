from django.conf import settings
from django.http import HttpResponsePermanentRedirect


class CanonicalHostRedirectMiddleware:
    """301-redirects any request whose Host doesn't match CANONICAL_HOST
    (e.g. the raw herokuapp.com domain) to the branded domain. No-op when
    CANONICAL_HOST isn't set, so this is safe to leave in for every env.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        canonical_host = getattr(settings, "CANONICAL_HOST", "")
        if canonical_host and request.get_host() != canonical_host:
            url = f"https://{canonical_host}{request.get_full_path()}"
            return HttpResponsePermanentRedirect(url)
        return self.get_response(request)
