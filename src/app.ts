import express, { Express, Request } from 'express'
import msal from '@azure/msal-node'

type routeAdder = (
    app: Express,
    cca: msal.ConfidentialClientApplication,
    uri: string
) => Express

const composeRoutes = (
    app: Express,
    cca: msal.ConfidentialClientApplication,
    uri: string,
    ...routes: routeAdder[]
): Express => routes.reduce((app, route) => route(app, cca, uri), app)

const addSignIn: routeAdder = (app, cca, uri) => {
    app.get('/signin', (req, res) => {
        const authCodeUrlParameters = {
            scopes: ['user.read'],
            redirectUri: `${uri}`,
        }

        cca.getAuthCodeUrl(authCodeUrlParameters)
            .then((response) => {
                res.redirect(response)
            })
            .catch((error) => console.log(JSON.stringify(error)))
    })

    return app
}

const getAuthCode = (req: Request): string =>
    Array.isArray(req.query.code)
        ? req.query.code.join('')
        : req.query.code.toString()

const addAuthMiddleware: routeAdder = (app) => {
    app.use(function (req, res, next) {
        if (getAuthCode(req)) {
            return next()
        }

        res.redirect(`/signin`)
    })

    return app
}

const addHome: routeAdder = (app, cca, uri) => {
    app.get('/', (req, res) => {
        const tokenRequest: msal.AuthorizationCodeRequest = {
            code: getAuthCode(req),
            scopes: ['user.read'],
            redirectUri: `${uri}`,
        }

        cca.acquireTokenByCode(tokenRequest)
            .then((response) => {
                console.log('\nResponse: \n:', response)
                res.sendStatus(200)
            })
            .catch((error) => {
                console.log(error)
                res.status(500).send(error)
            })
    })

    return app
}

export const createApp = (
    authConfig: msal.Configuration,
    uri: string
): Express => {
    return composeRoutes(
        express(),
        new msal.ConfidentialClientApplication(authConfig),
        uri,
        addSignIn,
        addAuthMiddleware,
        addHome
    )
}
