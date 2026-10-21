// Prints the development-only browser command, never reads credentials.
console.log(`Set developmentTools.cameraCapture: true in src/projects/template.ts.
Start npm run dev, frame the final view, then run this in the browser console:
window.dispatchEvent(new Event("cardeal:capture-camera"))
Copy the JSON printed into initialCamera in src/projects/template.ts.
All angles are degrees; height is meters above the ellipsoid.
The capture listener is disabled in production builds.`);
