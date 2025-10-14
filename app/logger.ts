const isNode =
    typeof process !== 'undefined' && process.versions != null && process.versions.node != null

interface LoggerInterface {
    info: (msg: any) => void
    warn: (msg: any) => void
    error: (msg: any) => void
    debug: (msg: any) => void
}

const browserLogger: LoggerInterface = {
    info: (msg) => console.info('[INFO]', msg),
    warn: (msg) => console.warn('[WARN]', msg),
    error: (msg) => console.error('[ERROR]', msg),
    debug: (msg) => console.debug('[DEBUG]', msg)
}

let nodeLogger: LoggerInterface | null = null

export async function loadLogger() {
    if (isNode) {
        if (nodeLogger) {
            return nodeLogger
        }

        const winston = await import('winston')
        const { sendErrorMail } = await import('./mailer.js')

        const winstonLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ level, message, timestamp }: any) => {
                    return `[${timestamp}] ${level.toUpperCase()}: ${message}`
                })
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/info.log', level: 'info' }),
                new winston.transports.File({ filename: 'logs/debug.log', level: 'debug' })
            ]
        })

        nodeLogger = {
            info: (msg: any) => winstonLogger.info(msg),
            warn: (msg: any) => winstonLogger.warn(msg),
            error: (msg: any) => {
                winstonLogger.error(msg)
                sendErrorMail?.('🚨 Elowen Error', msg).catch((e: any) => {
                    winstonLogger.error('Error mail could not be sent: ' + e.message)
                })
            },
            debug: (msg: any) => winstonLogger.debug(msg)
        }

        return nodeLogger
    }

    return browserLogger
}
