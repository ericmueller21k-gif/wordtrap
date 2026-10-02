import { render } from "preact";
import { App } from "./App.tsx";
import { setUpInstall } from "./install.ts";
import "./styles.css";

setUpInstall();
render(<App />, document.getElementById("app")!);
