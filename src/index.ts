import msal from '@azure/msal-node'
import { createApp } from './app'

const ENV = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    tenantId: process.env.TENANT_ID,
    hostname: process.env.WEBSITE_HOSTNAME || 'localhost:3000',
    scheme: process.env.SCHEME || 'http://',
    port: 3000,
}

if (!Object.keys(ENV).every((k) => (ENV as any)[k])) {
    console.error('Missing ENV variables')
    process.exit(1)
}

const app = createApp(
    {
        auth: {
            clientId: ENV.clientId,
            authority: `https://login.microsoftonline.com/${ENV.tenantId}`,
            clientSecret: ENV.clientSecret,
        },
    },
    `${ENV.scheme}${ENV.hostname}`
)

app.listen(ENV.port, () => console.log(`Listening on port ${ENV.port}`))
