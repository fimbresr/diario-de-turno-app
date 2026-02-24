import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JSON_LIMIT = process.env.JSON_LIMIT || '25mb';

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const defaultUsers = [
  { id: 'sanchez_hector', name: 'HECTOR RAUL SANCHEZ BUELNA', role: 'tech', password: 'HS38123' },
  { id: 'encinas_luis', name: 'LUIS CARLOS ENCINAS CORDOVA', role: 'tech', password: 'LE52124' },
  { id: 'fimbres_rene', name: 'RENE FIMBRES VASQUEZ', role: 'admin', password: 'RF15621' },
  { id: 'mendoza_rogelio', name: 'ROGELIO MENDOZA GUEVARA', role: 'tech', password: 'RM55624' },
  { id: 'barba_jesus', name: 'JESUS MIGUEL BARBA ALCANTAR', role: 'tech', password: 'JB57025' },
  { id: 'quijada_rogelio', name: 'ROGELIO ALBERTO QUIJADA GARCIA', role: 'tech', password: 'RQ44523' },
  { id: 'lopez_carlos', name: 'CARLOS LOPEZ RENTERIA', role: 'tech', password: 'CL65326' },
];

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((value) => value.trim()) }));
app.use(express.json({ limit: JSON_LIMIT }));

function sendError(res, status, code, message, details = undefined) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function normalizeDate(value, fallback = new Date()) {
  if (typeof value !== 'string') return fallback.toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback.toISOString();
  return date.toISOString();
}

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapTask(row) {
  return {
    id: row.id,
    area: row.area,
    workType: row.work_type,
    description: row.description,
    additionalComments: row.additional_comments,
    technicianName: row.technician_name,
    shift: row.shift,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    signature: row.signature,
    beforePhoto: row.before_photo,
    afterPhoto: row.after_photo,
    deleted: row.deleted,
  };
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Token no enviado.');
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch {
    return sendError(res, 401, 'UNAUTHORIZED', 'Token inválido o expirado.');
  }
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') {
    return sendError(res, 403, 'FORBIDDEN', 'Solo el administrador puede realizar esta acción.');
  }
  return next();
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'tech')),
      password_hash TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      area TEXT NOT NULL,
      work_type TEXT NOT NULL,
      description TEXT NOT NULL,
      additional_comments TEXT NOT NULL DEFAULT '',
      technician_id TEXT NOT NULL REFERENCES users(id),
      technician_name TEXT NOT NULL,
      shift TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      finished_at TIMESTAMPTZ NOT NULL,
      signature TEXT NOT NULL,
      before_photo TEXT,
      after_photo TEXT,
      deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks (deleted, finished_at DESC);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks (updated_at DESC);');

  if (process.env.SEED_DEFAULT_USERS === 'false') {
    return;
  }

  for (const user of defaultUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `
      INSERT INTO users (id, name, role, password_hash, active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        active = TRUE,
        updated_at = NOW();
      `,
      [user.id, user.name, user.role, passwordHash],
    );
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    return res.json({ data: { status: 'ok', now: result.rows[0]?.now } });
  } catch {
    return sendError(res, 500, 'DB_UNAVAILABLE', 'No se pudo conectar a la base de datos.');
  }
});

app.get('/api/public/technicians', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, role
       FROM users
       WHERE active = TRUE
       ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, name ASC`,
    );

    return res.json({
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
      })),
    });
  } catch {
    return sendError(res, 500, 'TECHNICIANS_FETCH_FAILED', 'No se pudieron obtener los técnicos.');
  }
});

app.post('/api/auth/login', async (req, res) => {
  const technicianId = normalizeText(req.body?.technicianId);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const shiftInput = normalizeText(req.body?.shift, 'Matutino');
  const shift = shiftInput.length > 0 ? shiftInput : 'Matutino';

  if (!technicianId || !password) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Técnico y contraseña son obligatorios.');
  }

  try {
    const userResult = await pool.query(
      `SELECT id, name, role, password_hash
       FROM users
       WHERE id = $1 AND active = TRUE
       LIMIT 1`,
      [technicianId],
    );

    if (userResult.rowCount === 0) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Credenciales inválidas.');
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Credenciales inválidas.');
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        name: user.name,
        shift,
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' },
    );

    return res.json({
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          shift,
        },
      },
    });
  } catch {
    return sendError(res, 500, 'LOGIN_FAILED', 'No se pudo iniciar sesión en este momento.');
  }
});

app.get('/api/tasks', auth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM tasks
       WHERE deleted = FALSE
       ORDER BY finished_at DESC, created_at DESC`,
    );

    return res.json({ data: result.rows.map(mapTask) });
  } catch {
    return sendError(res, 500, 'TASKS_FETCH_FAILED', 'No se pudieron descargar las tareas en la nube.');
  }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  const taskId = normalizeText(req.params.id);

  if (!taskId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'ID de tarea inválido.');
  }

  const payload = req.body || {};
  const area = normalizeText(payload.area);
  const workType = normalizeText(payload.workType);
  const description = normalizeText(payload.description);
  const additionalComments = normalizeText(payload.additionalComments);
  const signature = normalizeText(payload.signature);
  const beforePhoto = normalizeOptionalText(payload.beforePhoto);
  const afterPhoto = normalizeOptionalText(payload.afterPhoto);
  const finishedAt = normalizeDate(payload.finishedAt, new Date());
  const createdAt = normalizeDate(payload.createdAt, new Date());
  const requestedDelete = Boolean(payload.deleted);

  if (!area || !workType || !description || !signature) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Faltan campos obligatorios para guardar la tarea.');
  }

  if (requestedDelete && req.auth.role !== 'admin') {
    return sendError(res, 403, 'FORBIDDEN', 'Solo el administrador puede borrar tareas.');
  }

  try {
    const existingResult = await pool.query('SELECT * FROM tasks WHERE id = $1 LIMIT 1', [taskId]);

    if (existingResult.rowCount === 0) {
      if (requestedDelete) {
        return sendError(res, 404, 'NOT_FOUND', 'No se encontró la tarea a borrar.');
      }

      const insertResult = await pool.query(
        `
        INSERT INTO tasks (
          id,
          area,
          work_type,
          description,
          additional_comments,
          technician_id,
          technician_name,
          shift,
          created_at,
          finished_at,
          signature,
          before_photo,
          after_photo,
          deleted,
          deleted_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, FALSE, NULL, NOW()
        )
        RETURNING *;
        `,
        [
          taskId,
          area,
          workType,
          description,
          additionalComments,
          req.auth.sub,
          req.auth.name,
          req.auth.shift || 'Matutino',
          createdAt,
          finishedAt,
          signature,
          beforePhoto,
          afterPhoto,
        ],
      );

      return res.json({ data: mapTask(insertResult.rows[0]) });
    }

    const existing = existingResult.rows[0];
    const deleted = requestedDelete && req.auth.role === 'admin';

    const updateResult = await pool.query(
      `
      UPDATE tasks
      SET
        area = $2,
        work_type = $3,
        description = $4,
        additional_comments = $5,
        finished_at = $6,
        signature = $7,
        before_photo = $8,
        after_photo = $9,
        deleted = $10,
        deleted_at = CASE WHEN $10 = TRUE THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
      `,
      [
        taskId,
        area,
        workType,
        description,
        additionalComments,
        finishedAt,
        signature,
        beforePhoto,
        afterPhoto,
        deleted,
      ],
    );

    const updatedTask = updateResult.rows[0] || existing;
    return res.json({ data: mapTask(updatedTask) });
  } catch {
    return sendError(res, 500, 'TASK_UPSERT_FAILED', 'No se pudo guardar la tarea en la nube.');
  }
});

app.delete('/api/tasks/:id', auth, requireAdmin, async (req, res) => {
  const taskId = normalizeText(req.params.id);

  if (!taskId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'ID de tarea inválido.');
  }

  try {
    const result = await pool.query(
      `
      UPDATE tasks
      SET deleted = TRUE, deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING id;
      `,
      [taskId],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, 'NOT_FOUND', 'No se encontró la tarea.');
    }

    return res.json({ data: { id: taskId, deleted: true } });
  } catch {
    return sendError(res, 500, 'TASK_DELETE_FAILED', 'No se pudo borrar la tarea en la nube.');
  }
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
});

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

void start();
