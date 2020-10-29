## Deploy Infrastructure

Run in [infrastructure](./infrastucture):

```bash
az login

terraform init
terraform plan
terraform apply
```

## Deploy Web App

In root of this repository, run:

```bash
npm install
npm run build

zip -r build.zip dist node_modules package.json

# Copy resource_group_name and webapp_name from Terraform outputs and run:
az webapp deployment source config-zip --resource-group <resource_group_name> --name <webapp_name> --src build.zip
```
