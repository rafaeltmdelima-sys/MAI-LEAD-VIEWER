import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.env ? import.meta.url : import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Middleware to allow iframe embedding
  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.removeHeader("X-Frame-Options");
    next();
  });

  // Proxy route for the webhook
  app.post("/api/proxy-webhook", async (req, res) => {
    const WEBHOOK_URL = 'https://vmi3144263.contaboserver.net/webhook/55d004de-ffe4-44ad-81bd-e41146d237e0';
    
    try {
      console.log('Proxying request to:', WEBHOOK_URL);
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ ok: false, message: 'Erro no servidor proxy ao enviar lead' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
