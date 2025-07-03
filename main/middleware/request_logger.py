import logging
from datetime import datetime
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("access_logger")

class AccessLogMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        ip = self.get_client_ip(request)
        user = getattr(request, 'user', None)
        user_str = user.username if user and user.is_authenticated else "Anonymous"
        method = request.method
        url = request.build_absolute_uri()
        # ua = request.META.get("HTTP_USER_AGENT", "Unknown")
        # ref = request.META.get("HTTP_REFERER", "Direct")
        date_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        if all(s not in url for s in ['?', '/media/', 'pAskServer']):
          logger.info(
            f"[{date_str}] IP: {ip} | User: {user_str} | URL: {url}"
            #f"| Method: {method}  | User-Agent: {ua} | Referrer: {ref}"
          )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
