const required = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env variable: ${name}`);
    return value;
};

export const configuration = () => ({
    port: parseInt(process.env.PORT ?? '8080', 10),
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim()),
    db: {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        name: process.env.DB_NAME ?? 'aj_ecomm',
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
    },
    jwt: {
        secret: required('JWT_SECRET'),
        expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    },
    admin: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    },
});

export type AppConfig = ReturnType<typeof configuration>;
