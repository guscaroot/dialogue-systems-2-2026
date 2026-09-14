// a function that returns a promise
const setTimer = (t) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve("It's about time!"), t)
    })
}

// invoking the function
// message is anythinbg we get from "resolve"
setTimer(5000).then((message) => console.log("message:", message))

// define function that will return fetch promise
const fetchModels = () => 
    fetch("http://localhost:11434/api/tags").then((response) => response.json());

// to wait before the promise is fulfilled use keyword await
await fetchModels()
// -> Object []

// This was a default usage of fetch(), but it can also take various parameters,
// i.e. it can use a POST request method and contain a payload.
// That’s how we can generate chat completions from ollama. 
const fetchCompletions = () => {
  const body = {
    model: "llama3.1",
    stream: false,
    messages: [
      {
        role: "user",
        content: "why is the sky blue?",
      },
    ],
  };
  return fetch("http://localhost:11434/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  }).then((response) => response.json());
};

// After you run this function the first, it might take a few minutes to fullfill,
// because ollama will need to load the model. Subsequent calls will be much faster.
// In response, you should get an object which contains a message field, which would be an actual response of the LLM.

// -> Object { model: "llama3.1", created_at: "2026-09-14T09:41:20.113580994Z", message: {…}, done: true, done_reason: "stop", total_duration: 65754090053, load_duration: 8876411410, prompt_eval_count: 16, prompt_eval_duration: 448581000, eval_count: 459, … }
// created_at: "2026-09-14T09:41:20.113580994Z"
// done: true
// done_reason: "stop"
// eval_count: 459
// eval_duration: 56425777000
// load_duration: 8876411410
// message: Object { role: "assistant", content: "The sky appears blue to us during the daytime because of a phenomenon called Rayleigh scattering, named after the British physicist Lord Rayleigh, who first described it in the late 19th century.\n\nHere's a simplified explanation:\n\n1. **Sunlight and Atmosphere**: Sunlight, or solar radiation, contains all the colors of the visible spectrum, including red, orange, yellow, green, blue, indigo, and violet. When sunlight enters Earth's atmosphere, it encounters tiny molecules of gases such as nitrogen (N2) and oxygen (O2).\n\n2. **Scattering**: These molecules are much smaller than the wavelength of visible light. According to Rayleigh's law, when light with a shorter wavelength (like blue and violet) encounters these small molecules, it is scattered in all directions. This scattering effect is much more pronounced for shorter wavelengths.\n\n3. **Blue Light Scattered More**: Specifically, the blue light, having the shortest wavelength among the visible spectrum (approximately 450 nanometers), is scattered the most. This means that when sunlight enters the Earth's atmosphere, the blue light is dispersed in all directions, reaching our eyes from all parts of the sky.\n\n4. **Why the Sky Isn’t Violet**: Despite violet light also being scattered, the sky doesn’t appear violet because our eyes are more sensitive to blue light than to violet light. This sensitivity bias makes the blue light stand out more.\n\n5. **During Sunrise and Sunset**: The sky appears different during sunrise and sunset because the path of sunlight through the atmosphere changes. The light has to travel through more of the Earth's atmosphere to reach us, which scatters the shorter wavelengths (like blue and violet) even more. The scattered blue light is then dispersed in all directions, but since we see the sunlight from a wider angle, the scattered light is dispersed across a larger area of the sky. This is why the sky often appears more red or orange during these times, as the longer wavelengths (like red and orange) have less scattering and thus reach our eyes more directly.\n\nThe blue color of the sky is a result of the way sunlight interacts with the tiny molecules of the Earth's atmosphere. This is a fundamental principle of physics that explains many of the colors we see in our daily environment." }
// model: "llama3.1"
// prompt_eval_count: 16
// prompt_eval_duration: 448581000
// total_duration: 65754090053
// <prototype>: Object { … }