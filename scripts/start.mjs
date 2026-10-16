// Local preview uses loopback; deployment can select its listen address explicitly.
process.env.HOSTNAME = process.env.POFIS_HOSTNAME || "127.0.0.1";
await import("../.next/standalone/server.js");
