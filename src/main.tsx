import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { checkVersion } from "./lib/version";

// Check version and clear cache if needed
checkVersion();

createRoot(document.getElementById("root")!).render(<App />);
