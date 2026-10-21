output "endpoint_url" {
  description = "Base URL of the deployed tool."
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "registration_url" {
  description = "Paste into the platform's dynamic registration form (in Moodle: Site administration > Plugins > Manage tools > Tool URL)."
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/lti/register"
}
