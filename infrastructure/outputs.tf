output "resource_group_name" {
  value = azurerm_resource_group.default.name
}

output "webapp_name" {
  value = azurerm_app_service.default.name
}