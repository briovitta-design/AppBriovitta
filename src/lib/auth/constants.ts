// Arquivo separado de propósito: middleware.ts roda no Edge Runtime, que
// não suporta o SDK do firebase-admin (usa APIs Node puras). Se o
// middleware importasse isso de session.ts, o bundler tentaria empacotar
// o firebase-admin inteiro no Edge e quebraria (erro "node:process" /
// UnhandledSchemeError). Por isso essa constante mora sozinha aqui.

export const SESSION_COOKIE_NAME = "briovitta_session";
