import express, { Express, Request } from 'express'
import { Option } from 'prelude-ts'
import {
    ConfidentialClientApplication,
    AuthorizationCodeRequest,
    Configuration,
} from '@azure/msal-node'

type routeAdder = (
    app: Express,
    cca: ConfidentialClientApplication,
    uri: string
) => Express

const composeRoutes = (
    app: Express,
    cca: ConfidentialClientApplication,
    uri: string,
    ...routes: routeAdder[]
): Express => routes.reduce((app, route) => route(app, cca, uri), app)

const addSignIn: routeAdder = (app, cca, uri) => {
    app.get('/signin', (_, res) => {
        const authCodeUrlParameters = {
            scopes: ['user.read'],
            redirectUri: uri,
        }

        cca.getAuthCodeUrl(authCodeUrlParameters)
            .then((response) => {
                res.redirect(response)
            })
            .catch((error) => console.log(JSON.stringify(error)))
    })

    return app
}

const getAuthCode = (req: Request): Option<string> => {
    if (!req.query.code) {
        return Option.none()
    }

    return Option.of(
        Array.isArray(req.query.code)
            ? req.query.code.join('')
            : req.query.code.toString()
    )
}

const addAuthMiddleware: routeAdder = (app, cca, uri) => {
    app.use(async function (req, res, next) {
        const code = getAuthCode(req)

        if (code.isNone()) {
            return res.redirect('/signin')
        }

        const tokenRequest: AuthorizationCodeRequest = {
            code: code.getOrThrow(),
            scopes: ['user.read'],
            redirectUri: uri,
        }

        return cca
            .acquireTokenByCode(tokenRequest)
            .then((response) => {
                // TODO: Use token to get user information
                next()
            })
            .catch((error) => {
                console.log(error)
                res.status(500).send(error)
            })
    })

    return app
}

const addHome: routeAdder = (app) => {
    app.get('/', (req, res) => {
        res.json({ name: 'hello from the otherside' })
    })

    return app
}

export const createApp = (authConfig: Configuration, uri: string): Express => {
    return composeRoutes(
        express(),
        new ConfidentialClientApplication(authConfig),
        uri,
        addSignIn,
        addAuthMiddleware,
        addHome
    )
}
