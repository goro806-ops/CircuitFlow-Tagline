'use strict';

function redactSecrets(value) {
  let text = String(value ?? '');
  for (const key of [
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY', 'GROQ_API_KEY',
    'XAI_API_KEY', 'GROK_API_KEY', 'GOOGLE_CLIENT_SECRET', 'DIGIKEY_CLIENT_SECRET',
    'MOUSER_API_KEY', 'NEXAR_TOKEN', 'OCTOPART_API_KEY', 'DATABASE_URL'
  ]) {
    const secret = process.env[key];
    if (secret && secret.length >= 8) text = text.split(secret).join(`[redacted:${key}]`);
  }
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|client_secret|password)=([^\s&]+)/gi, '$1=[redacted]')
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, '[redacted-database-url]')
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, '[redacted-private-key]');
}

module.exports = { redactSecrets };
