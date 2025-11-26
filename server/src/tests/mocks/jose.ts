// Minimal Jest stub for the `jose` library used in subscription.service.ts
// We don't exercise real JWT verification in unit tests; we only need the
// interfaces to exist so Jest can load the module without parsing ESM.

export async function importJWK(_jwk: any, _alg?: string): Promise<any> {
  return {} as any;
}

export async function jwtVerify(
  _token: string,
  _key: any,
  _options?: any
): Promise<{ payload: any }> {
  return { payload: {} };
}

