export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    try {
      // API-Gesundheitstest
      if (url.pathname === "/api/health" && request.method === "GET") {
        const result = await env.DB
          .prepare("SELECT 1 AS ok")
          .first();

        return json({
          ok: true,
          database: result?.ok === 1
        });
      }

      // Mitarbeiter
      if (url.pathname === "/api/employees" && request.method === "GET") {
        const result = await env.DB
          .prepare(`
            SELECT
              id,
              employee_no,
              name,
              shift_id,
              active
            FROM employees
            WHERE active = 1
            ORDER BY employee_no
          `)
          .all();

        return json({
          ok: true,
          employees: result.results || []
        });
      }

      // Offene Vertretungen
      if (
        url.pathname === "/api/covers/open" &&
        request.method === "GET"
      ) {
        const result = await env.DB
          .prepare(`
            SELECT
              cr.id,
              cr.date,
              cr.shift_id,
              cr.shift_type,
              cr.start_time,
              cr.end_time,
              cr.reason,
              cr.note,
              cr.status,
              cr.created_at
            FROM cover_requests cr
            WHERE cr.status = 'open'
            ORDER BY cr.date, cr.start_time, cr.id
          `)
          .all();

        return json({
          ok: true,
          covers: result.results || []
        });
      }

      // Einzelne Vertretung mit Positionen
      if (
        url.pathname.startsWith("/api/covers/") &&
        request.method === "GET"
      ) {
        const id = Number(url.pathname.split("/")[3]);

        if (!Number.isInteger(id)) {
          return json(
            {
              ok: false,
              error: "Ungültige Vertretungs-ID"
            },
            400
          );
        }

        const cover = await env.DB
          .prepare(`
            SELECT
              id,
              date,
              shift_id,
              shift_type,
              start_time,
              end_time,
              reason,
              note,
              status,
              created_at,
              updated_at
            FROM cover_requests
            WHERE id = ?
          `)
          .bind(id)
          .first();

        if (!cover) {
          return json(
            {
              ok: false,
              error: "Vertretung nicht gefunden"
            },
            404
          );
        }

        const positions = await env.DB
          .prepare(`
            SELECT
              id,
              activity,
              needed_count,
              created_at
            FROM cover_positions
            WHERE cover_id = ?
            ORDER BY id
          `)
          .bind(id)
          .all();

        return json({
          ok: true,
          cover,
          positions: positions.results || []
        });
      }

      // Technischer Test für Mitarbeiter 113
      if (
        url.pathname === "/api/test/employee/113" &&
        request.method === "GET"
      ) {
        const employee = await env.DB
          .prepare(`
            SELECT
              e.id,
              e.employee_no,
              e.name,
              e.shift_id,
              e.active
            FROM employees e
            WHERE e.employee_no = 113
          `)
          .first();

        return json({
          ok: true,
          employee: employee || null
        });
      }

      // Unbekannte Route
      return json(
        {
          ok: false,
          error: "Route nicht gefunden"
        },
        404
      );

    } catch (error) {
      console.error(error);

      return json(
        {
          ok: false,
          error: "Interner Serverfehler"
        },
        500
      );
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Content-Type":
      "application/json; charset=utf-8"
  };
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: corsHeaders()
    }
  );
}
