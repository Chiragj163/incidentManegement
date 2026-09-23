import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.on("error", (error: Error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
});

export const query = (text: string, params?: unknown[]) => {
    return pool.query(text, params);
};

export const testDatabaseConnection = async (): Promise<void> => {
    const result = await pool.query(
        "SELECT NOW() AS current_time"
    );

    console.log(
        "PostgreSQL connected:",
        result.rows[0].current_time
    );
};

export default pool;