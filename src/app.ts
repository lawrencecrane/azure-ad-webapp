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
    app.get('/signin', (req, res) => {
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

const addAuthMiddleware: routeAdder = (app) => {
    app.use(function (req, res, next) {
        if (getAuthCode(req).isSome()) {
            return next()
        }

        res.redirect(`/signin`)
    })

    return app
}

const addHome: routeAdder = (app, cca, uri) => {
    app.get('/', (req, res) => {
        const tokenRequest: AuthorizationCodeRequest = {
            code: getAuthCode(req).getOrThrow(),
            scopes: ['user.read'],
            redirectUri: uri,
        }

        cca.acquireTokenByCode(tokenRequest)
            .then((response) => {
                res.json({ name: 'hello from the otherside' })
            })
            .catch((error) => {
                console.log(error)
                res.status(500).send(error)
            })
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
