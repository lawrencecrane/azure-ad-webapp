import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Option } from 'prelude-ts'
import { ConfidentialClientApplication } from '@azure/msal-node'

export const UNAUTHENTICATED = 'UNAUTHENTICATED'

const JWT_COOKIE_NAME = 'webapp_jwt'

export interface AuthData {
    name: string
    username: string
}

const safeJwtVerify = (
    token: string,
    secret: jwt.Secret,
    options?: jwt.VerifyOptions
): Option<string | object> => {
    try {
        return Option.of(jwt.verify(token, secret, options))
    } catch {
        return Option.none()
    }
}

const getAuthDataFromJwt = (req: Request, secret: string): Option<AuthData> =>
    safeJwtVerify(
        req.cookies ? req.cookies[JWT_COOKIE_NAME] : null,
        secret
    ) as any

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

const setJwtToken = (
    res: Response,
    authenticator: ConfidentialClientApplication,
    code: string,
    redirectUri: string,
    jwtTokenSecret: string
): Promise<AuthData> =>
    authenticator
        .acquireTokenByCode({
            code,
            scopes: ['user.read'],
            redirectUri,
        })
        .then((response) => {
            const data: AuthData = {
                name: response.account.name,
                username: response.account.username,
            }

            res.cookie(JWT_COOKIE_NAME, jwt.sign(data, jwtTokenSecret), {
                httpOnly: true,
                secure: true,
            })

            return data
        })

export const authenticate = (
    req: Request,
    res: Response,
    authenticator: ConfidentialClientApplication,
    redirectUri: string,
    jwtTokenSecret: string
): Promise<AuthData> => {
    const authData = getAuthDataFromJwt(req, jwtTokenSecret)

    if (authData.isSome()) {
        return Promise.resolve(authData.getOrThrow())
    }

    const code = getAuthCode(req)

    if (code.isNone()) {
        return Promise.reject(UNAUTHENTICATED)
    }

    return setJwtToken(
        res,
        authenticator,
        code.getOrThrow(),
        redirectUri,
        jwtTokenSecret
    )
}
