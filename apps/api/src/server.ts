import path from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"
import { serve } from "@hono/node-server"
import { app } from "./app"

const dir = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(dir, "../.env") })

const port = Number(process.env.PORT) || 8787

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.info(`@any-door/api listening on http://localhost:${info.port}`)
  },
)
