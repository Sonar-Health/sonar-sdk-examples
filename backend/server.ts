import { networkInterfaces } from "node:os";

/**
 * The backend a Sonar customer runs beside their app, at demo size. It keeps the API key, mints
 * SDK client tokens and reads health data for the signed-in user. The app never sees the key.
 */
const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required, see .env.example`);
  return value;
};

const sonar = {
  url: "https://atlas.sonarhealth.co",
  apiKey: required("SONAR_API_KEY"),
  appId: required("SONAR_APP_ID"),
};
const port = Number(process.env.PORT ?? 8199);

// Your own user system goes here. The demo has one user, signed in with an access code, and that
// user maps to one Sonar user. Yours maps each of your users to the Sonar user you created for them.
const demoUser = {
  accessCode: process.env.DEMO_ACCESS_CODE?.trim() || crypto.randomUUID().slice(0, 8),
  sonarUserId: required("SONAR_USER_ID"),
};

const signedInSonarUser = (request: Request) =>
  request.headers.get("authorization") === `Bearer ${demoUser.accessCode}`
    ? demoUser.sonarUserId
    : null;

const sonarApi = (path: string, init: RequestInit = {}) =>
  fetch(new URL(path, sonar.url), {
    ...init,
    headers: {
      authorization: `Bearer ${sonar.apiKey}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });

const passThrough = async (response: Response) =>
  new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json" },
  });

const signedIn =
  (handle: (sonarUserId: string, request: Bun.BunRequest) => Promise<Response> | Response) =>
  (request: Bun.BunRequest) => {
    const sonarUserId = signedInSonarUser(request);
    if (!sonarUserId) return Response.json({ error: "unauthorized" }, { status: 401 });
    return handle(sonarUserId, request);
  };

const healthReads = new Set(["daily", "scores", "sleep", "timeseries", "workouts"]);

Bun.serve({
  port,
  hostname: "0.0.0.0",
  routes: {
    "/config": {
      // The demo's user system has no IDs of its own, so its one user is known by its Sonar ID.
      GET: signedIn((sonarUserId) => Response.json({ app_id: sonar.appId, user_id: sonarUserId })),
    },

    // The SDK calls the app's token provider, the app calls this, and the client token goes back.
    "/sdk-token": {
      POST: signedIn(async (sonarUserId, request) => {
        const { installation_id } = (await request.json()) as { installation_id?: string };
        return passThrough(
          await sonarApi(`/v1/users/${sonarUserId}/sdk-sessions`, {
            method: "POST",
            headers: { "idempotency-key": crypto.randomUUID() },
            body: JSON.stringify({ app_id: sonar.appId, installation_id }),
          }),
        );
      }),
    },

    "/health/:read": {
      GET: signedIn(async (sonarUserId, request) => {
        const read = (request.params as { read: string }).read;
        if (!healthReads.has(read)) return Response.json({ error: "not_found" }, { status: 404 });
        const query = new URL(request.url).search;
        return passThrough(await sonarApi(`/v1/users/${sonarUserId}/${read}${query}`));
      }),
    },
  },
  fetch: () => Response.json({ error: "not_found" }, { status: 404 }),
});

const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((address) => address?.family === "IPv4" && !address.internal)
  .map((address) => `http://${address!.address}:${port}`);

console.log("Sonar demo backend");
console.log(`  backend URL   ${lanAddresses.join("  ") || `http://localhost:${port}`}`);
console.log(`  access code   ${demoUser.accessCode}`);
