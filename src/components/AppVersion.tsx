/** Versión de la app, como texto pequeño al pie (panel de la cuenta, Mi perfil y login). */
export default function AppVersion() {
  return <p className="app-version">v{__APP_VERSION__}</p>;
}
