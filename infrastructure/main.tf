resource "random_pet" "resource_identifier" {}

provider "azurerm" {
  version = "~> 2.0"
  features {}
}

resource "random_password" "azuread_secret" {
  length           = 32
  special          = true
  override_special = "_%@"
}

data "azurerm_client_config" "default" {
}

resource "azuread_application" "default" {
  name = "app-registration-webapp-${random_pet.resource_identifier.id}"
}

resource "azuread_application_password" "default" {
  application_object_id = azuread_application.default.id
  description           = "WebApp"
  value                 = random_password.azuread_secret.result
  end_date              = "2099-01-01T01:02:03Z"
}

resource "azurerm_resource_group" "default" {
  name     = "rg-${random_pet.resource_identifier.id}"
  location = "North Europe"

  tags = {
    Owner = "Lauri Kurki"
  }
}

resource "azurerm_app_service_plan" "default" {
  name                = "appserviceplan-${random_pet.resource_identifier.id}"
  location            = azurerm_resource_group.default.location
  resource_group_name = azurerm_resource_group.default.name
  kind                = "Linux"
  reserved            = true

  sku {
    tier = "Standard"
    size = "S1"
  }
}

resource "azurerm_app_service" "default" {
  name                = "appservice-${random_pet.resource_identifier.id}"
  location            = azurerm_resource_group.default.location
  resource_group_name = azurerm_resource_group.default.name
  app_service_plan_id = azurerm_app_service_plan.default.id

  site_config {
    always_on = true
  }

  app_settings = {
    "CLIENT_ID"  = azuread_application.default.id
    "CLIENT_KEY" = azuread_application_password.default.value
    "TENANT_ID"  = data.azurerm_client_config.default.tenant_id
    "SCHEME" = "https://"
  }
}