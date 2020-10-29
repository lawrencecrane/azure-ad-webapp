import express, { Express, NextFunction, Request, Response } from 'express'
import { ConfidentialClientApplication, Configuration } from '@azure/msal-node'
import { UNAUTHENTICATED, authenticate, AuthData } from './auth'
import cookieParser from 'cookie-parser'

interface AppState {
    redirectURI: string
    authenticator: ConfidentialClientApplication
    jwtTokenSecret: string
}

const getAppState = (req: Request): AppState => ({
    redirectURI: req.app.get('redirectURI'),
    authenticator: req.app.get('authenticator'),
    jwtTokenSecret: req.app.get('jwtTokenSecret'),
})

const setAppState = (app: Express, state: AppState): Express => {
    app.set('redirectURI', state.redirectURI)
    app.set('authenticator', state.authenticator)
    app.set('jwtTokenSecret', state.jwtTokenSecret)

    return app
}

interface ResponseState extends AuthData {}

const getResponseState = (res: Response): ResponseState => ({
    name: res.locals.name,
    username: res.locals.username,
})

const setResponseState = (res: Response, state: ResponseState) => {
    res.locals.name = state.name
    res.locals.username = state.username
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const { authenticator, redirectURI, jwtTokenSecret } = getAppState(req)

    return authenticate(req, res, authenticator, redirectURI, jwtTokenSecret)
        .then((state) => {
            setResponseState(res, state)
            next()
        })
        .catch((err) =>
            err === UNAUTHENTICATED
                ? res.redirect('/login')
                : res.sendStatus(403)
        )
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
    const { name } = getResponseState(res)

    res.json({ whoami: name })
}

export const createApp = (
    authConfig: Configuration,
    jwtTokenSecret: string,
    uri: string
): Express => {
    const app = setAppState(express(), {
        redirectURI: uri,
        authenticator: new ConfidentialClientApplication(authConfig),
        jwtTokenSecret,
    })

    app.use(cookieParser())

    app.get('/login', login)

    app.use(authMiddleware)

    app.get('/', home)

    return app
}
