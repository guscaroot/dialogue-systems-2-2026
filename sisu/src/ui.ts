import { setupButton } from "./isu";
import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>

    <div class="bird-card">
      <h2 id="bird-commonName"></h2>
      <img id="bird-image" alt="" style="display: none;" />
    </div>
  </div>
`;
setupButton(document.querySelector<HTMLButtonElement>("#counter")!);

