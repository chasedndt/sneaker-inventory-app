from functools import wraps
from flask import request, jsonify, current_app as app
from firebase_admin import auth

def require_auth(fn):
    """Attach decoded Firebase user to request.user or return 401. Inject user_id into route arguments."""
    @wraps(fn)
    def _wrap(*args, **kwargs):
        hdr = request.headers.get("Authorization", "")
        if not hdr.startswith("Bearer "):
            return jsonify(error="missing-token"), 401
        try:
            token = hdr.split()[1]
            decoded = auth.verify_id_token(token, check_revoked=True)
            kwargs["user_id"] = decoded["uid"]
            request.user = decoded
        except Exception as e:
            app.logger.exception("token-verify failed – %s", e)
            return jsonify(error="invalid-token"), 401
        return fn(*args, **kwargs)
    return _wrap
