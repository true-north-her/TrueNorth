"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAudience = resolveAudience;
exports.createIdentityToken = createIdentityToken;
exports.resolveIdentityToken = resolveIdentityToken;
exports.resolveBaseUrl = resolveBaseUrl;
exports.buildHeaders = buildHeaders;
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:timers/promises");
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const DEFAULT_CONNECTORS_HOST = 'connectors.replit.com';
const DEPLOYMENT_IDENTITY_ENDPOINT = 'http://127.0.0.1:1105/getIdentityToken';
const IDENTITY_MINT_TIMEOUT_MS = 5000;
const IDENTITY_MINT_RETRY_DELAY_MS = 250;
class TransientLocalIdentityError extends Error {
}
function isDeploymentEnvironment() {
    // Conrun exposes the same deployment markers, but is being retired and is
    // deliberately outside this migration. Preserve its existing Repl identity
    // path until the remaining callers move to replvisor.
    if (process.env['REPLIT_CONRUN'])
        return false;
    return [
        'REPLIT_DEPLOYMENT_ID',
        'REPLIT_DEPLOYMENT_ENVIRONMENT',
        'WEB_REPL_RENEWAL',
    ].some((name) => Boolean(process.env[name]));
}
function resolveAudience() {
    const audience = process.env['REPLIT_CONNECTORS_AUDIENCE'];
    if (audience) {
        if (audience.startsWith('http://') || audience.startsWith('https://')) {
            return audience;
        }
        return `https://${audience}`;
    }
    return `https://${DEFAULT_CONNECTORS_HOST}`;
}
async function createIdentityToken() {
    const replitBinary = process.env['REPLIT_CLI'] || 'replit';
    const audience = resolveAudience();
    const { stdout } = await execFileAsync(replitBinary, ['identity', 'create', '--audience', audience], {
        encoding: 'utf8',
        timeout: IDENTITY_MINT_TIMEOUT_MS,
        windowsHide: true,
    });
    const token = stdout.trim();
    if (!token) {
        throw new Error(`replit identity create returned an empty token (audience: ${audience})`);
    }
    return token;
}
async function createIdentityTokenFromLocalEndpoint(timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        let response;
        try {
            response = await fetch(DEPLOYMENT_IDENTITY_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audience: resolveAudience() }),
                signal: controller.signal,
            });
        }
        catch (cause) {
            if (cause instanceof TypeError) {
                throw new TransientLocalIdentityError('local identity endpoint is not accepting connections');
            }
            throw cause;
        }
        if (!response.ok) {
            const message = `local identity endpoint returned HTTP ${response.status}`;
            if (response.status >= 500) {
                throw new TransientLocalIdentityError(message);
            }
            throw new Error(message);
        }
        const payload = (await response.json());
        if (typeof payload.identityToken !== 'string') {
            throw new Error('local identity endpoint returned an invalid response');
        }
        const token = payload.identityToken.trim();
        if (!token) {
            throw new Error('local identity endpoint returned an empty token');
        }
        return token;
    }
    finally {
        clearTimeout(timeout);
    }
}
async function createDeploymentIdentityToken() {
    const deadline = Date.now() + IDENTITY_MINT_TIMEOUT_MS;
    try {
        return await createIdentityToken();
    }
    catch {
        // hostingpid1 also exposes the same audience-scoped mint over loopback.
    }
    // hostingpid1 starts the application and identity renewal concurrently. Its
    // loopback endpoint can therefore be listening briefly before the first
    // signing key is installed. Retry only that local startup seam, under the
    // same bounded mint deadline, and continue to fail closed.
    do {
        const remainingMs = Math.max(1, deadline - Date.now());
        try {
            return await createIdentityTokenFromLocalEndpoint(remainingMs);
        }
        catch (cause) {
            if (!(cause instanceof TransientLocalIdentityError))
                break;
        }
        const retryBudgetMs = deadline - Date.now();
        if (retryBudgetMs <= 0)
            break;
        await (0, promises_1.setTimeout)(Math.min(IDENTITY_MINT_RETRY_DELAY_MS, retryBudgetMs));
    } while (Date.now() < deadline);
    throw new Error('Could not mint an audience-scoped deployment identity. ' +
        'Neither `replit identity create` nor the local hostingpid1 identity ' +
        'endpoint is available. Raw WEB_REPL_RENEWAL credentials are not accepted.');
}
async function resolveIdentityToken() {
    if (isDeploymentEnvironment()) {
        return `depl ${await createDeploymentIdentityToken()}`;
    }
    try {
        const token = await createIdentityToken();
        return token;
    }
    catch {
        // CLI not available — fall through to env var strategies
    }
    const replIdentity = process.env['REPL_IDENTITY'];
    if (replIdentity) {
        return `repl ${replIdentity}`;
    }
    throw new Error('Replit identity token not found. ' +
        'Could not run `replit identity create` and ' +
        'REPL_IDENTITY is not set in the environment. ' +
        'Are you running this inside a Repl?');
}
function resolveBaseUrl() {
    const hostname = process.env['REPLIT_CONNECTORS_HOSTNAME'];
    if (hostname) {
        if (hostname.startsWith('http://') || hostname.startsWith('https://')) {
            return hostname;
        }
        return `https://${hostname}`;
    }
    return `https://${DEFAULT_CONNECTORS_HOST}`;
}
async function buildHeaders() {
    const token = await resolveIdentityToken();
    const headers = {
        Accept: 'application/json',
    };
    if (token.startsWith('repl ') || token.startsWith('depl ')) {
        headers['X-Replit-Token'] = token;
    }
    else {
        headers['Replit-Authentication'] = `Bearer ${token}`;
    }
    return headers;
}
//# sourceMappingURL=identity.js.map