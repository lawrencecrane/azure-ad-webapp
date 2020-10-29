import express, { Express, NextFunction, Request, Response } from 'express'
import { Option } from 'prelude-ts'
import { ConfidentialClientApplication, Configuration } from '@azure/msal-node'

interface AppState {
    redirectURI: string
    authenticator: ConfidentialClientApplication
}

const getAppState = (req: Request): AppState => ({
    redirectURI: req.app.get('redirectURI'),
    authenticator: req.app.get('authenticator'),
})

const setAppState = (app: Express, state: AppState): Express => {
    app.set('redirectURI', state.redirectURI)
    app.set('authenticator', state.authenticator)

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

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // TODO: Check if user has already authenticated...

    const code = getAuthCode(req)

    if (code.isNone()) {
        return res.redirect('/login')
    }

    const { authenticator, redirectURI } = getAppState(req)

    return authenticator
        .acquireTokenByCode({
            code: code.getOrThrow(),
            scopes: ['user.read'],
            redirectUri: redirectURI,
        })
        .then((response) => {
            // TODO: Store jwt / token / some identifier from response to cookie
            // so that we can use that to identify on next request
            res.locals.username = response.account.name

            next()
        })
        .catch((error) => {
            console.log(error)
            res.sendStatus(403)
        })
}

function login(req: Request, res: Response) {
    const { authenticator, redirectURI } = getAppState(req)

    authenticator
        .getAuthCodeUrl({
            scopes: ['user.read'],
            redirectUri: redirectURI,
        })
        .then((response) => res.redirect(response))
        .catch((error) => console.log(JSON.stringify(error)))
}

function home(_: Request, res: Response) {
    res.json({ whoami: res.locals.username })
}

export const createApp = (authConfig: Configuration, uri: string): Express => {
    const app = setAppState(express(), {
        redirectURI: uri,
        authenticator: new ConfidentialClientApplication(authConfig),
    })

    app.get('/login', login)

    app.use(authMiddleware)

    app.get('/', home)

    return app
}
