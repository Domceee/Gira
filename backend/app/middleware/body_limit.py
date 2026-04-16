from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_body_size: int):
        super().__init__(app)
        self.max_body_size = max_body_size

    async def dispatch(self, request: Request, call_next):
        body = await request.body()

        if len(body) > self.max_body_size:
            return Response(
                content="Request body too large",
                status_code=413
            )

        # Recreate request with the consumed body
        async def receive():
            return {"type": "http.request", "body": body}

        request._receive = receive
        return await call_next(request)
