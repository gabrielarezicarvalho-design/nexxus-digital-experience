import { Download, FileDown } from "lucide-react";
import { APP_DOWNLOAD_URL } from "./WindowsAppCard";

export function ClaudeCodeInstaller() {
  return (
    <div className="cc-instalador">
      <div className="cc-instalador-txt">
        <p className="oc-eyebrow">Aplicativo para Windows</p>
        <h3>Nexa Claude para Windows</h3>
        <p>
          Baixe o aplicativo, salve no seu computador e execute com dois cliques. Depois é só colar
          sua chave NEXA e começar a usar.
        </p>
        <a className="cc-instalador-btn" href={APP_DOWNLOAD_URL} download>
          <Download size={17} /> Baixar Nexa Claude para Windows
        </a>
        <small>Windows 10 ou 11 · arquivo .exe</small>
      </div>
      <span className="cc-instalador-icone" aria-hidden="true">
        <FileDown size={26} />
      </span>
    </div>
  );
}
