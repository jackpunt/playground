"""Module which simply denies access."""

import webapp2


class DenyHandler(webapp2.RequestHandler):
  """Handler which denies all requests."""
  pass


deny_app = webapp2.WSGIApplication([
    ('/.*', DenyHandler),
], debug=True)
